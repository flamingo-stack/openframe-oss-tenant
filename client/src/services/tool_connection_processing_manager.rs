use anyhow::{Context, Result};
use tracing::{info, error};
use tokio::process::Command;
use tokio::time::{sleep, timeout};
use std::time::Duration;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::installed_tool::InstalledTool;
use crate::models::ToolConnection;
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_command_params_resolver::ToolCommandParamsResolver;
use crate::services::tool_connection_message_publisher::ToolConnectionMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::tool_connection_service::ToolConnectionService;

const RETRY_DELAY_SECONDS: u64 = 15;

// TODO: refactor class
#[derive(Clone)]
pub struct ToolConnectionProcessingManager {
    installed_tools_service: InstalledToolsService,
    params_processor: ToolCommandParamsResolver,
    tool_connection_publisher: ToolConnectionMessagePublisher,
    config_service: AgentConfigurationService,
    tool_connection_service: ToolConnectionService,
    running_tools: Arc<RwLock<HashSet<String>>>,
}

impl ToolConnectionProcessingManager {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        params_processor: ToolCommandParamsResolver,
        tool_connection_publisher: ToolConnectionMessagePublisher,
        config_service: AgentConfigurationService,
        tool_connection_service: ToolConnectionService,
    ) -> Self {
        Self {
            installed_tools_service,
            params_processor,
            tool_connection_publisher,
            config_service,
            tool_connection_service,
            running_tools: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub async fn run(&self) -> Result<()> {
        info!("Starting tool connection processing manager");

        let tools = self
            .installed_tools_service
            .get_all()
            .await
            .context("Failed to retrieve installed tools list")?;

        if tools.is_empty() {
            info!("No installed tools found – nothing to process for connection");
            return Ok(());
        }

        for tool in tools {
            if self.tool_connection_service.exists_by_tool_agent_id(&tool.tool_agent_id).await? {
                info!(
                "Tool connection for tool {} already exists - skipping",
                tool.tool_id
            );
                return Ok(());
            }

            if self.try_mark_running(&tool.tool_id).await {
                info!("Processing tool connection for {}", tool.tool_id);
                self.process_tool(tool).await?;
            } else {
                info!("Connection processing for tool {} is already running - skipping", tool.tool_id);
            }
        }

        Ok(())
    }

    pub async fn run_new_tool(&self, installed_tool: InstalledTool) -> Result<()> {
        if self.tool_connection_service.exists_by_tool_agent_id(&installed_tool.tool_agent_id).await? {
            info!(
                "Tool connection for tool {} already exists - skipping",
                installed_tool.tool_id
            );
            return Ok(());
        }

        if !self.try_mark_running(&installed_tool.tool_id).await {
            info!(
                "Connection processing for tool {} is already running - skipping",
                installed_tool.tool_id
            );
            return Ok(());
        }

        info!(
            "Processing tool connection for newly installed tool {}",
            installed_tool.tool_id
        );
        self.process_tool(installed_tool).await
    }

    async fn try_mark_running(&self, tool_id: &str) -> bool {
        let mut set = self.running_tools.write().await;
        if set.contains(tool_id) {
            false
        } else {
            set.insert(tool_id.to_string());
            true
        }
    }

    async fn process_tool(&self, tool: InstalledTool) -> Result<()> {
        let params_processor = self.params_processor.clone();
        let config_service = self.config_service.clone();
        let tool_connection_publisher = self.tool_connection_publisher.clone();
        let tool_connection_service = self.tool_connection_service.clone();

        tokio::spawn(async move {
            loop {
                // Resolve placeholders for tool_agent_id_command_args (gets agent_tool_id from command output)
                let processed_args = match params_processor.process(
                    &tool.tool_agent_id,
                    tool.tool_agent_id_command_args.clone(),
                ) {
                    Ok(args) => args,
                    Err(e) => {
                        error!(
                            "Failed to resolve tool {} agent_tool_id_command args: {:#}",
                            tool.tool_id,
                            e
                        );
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                info!(
                    "Run tool {} agentId command (to get agent_tool_id) with args: {:?}",
                    tool.tool_id,
                    processed_args
                );

                // Build executable path directly using directory manager
                let command_path = params_processor
                    .directory_manager
                    .app_support_dir()
                    .join(&tool.tool_agent_id)
                    .join("agent")
                    .to_string_lossy()
                    .to_string();

                info!("Running...");
                // Execute command with a 2-second timeout and capture output
                let command_future = Command::new(&command_path).args(&processed_args).output();
                let output = match timeout(Duration::from_secs(15), command_future).await {
                    // Command finished within timeout
                    Ok(Ok(out)) => {
                        info!("Command completed successfully: {}", String::from_utf8_lossy(&out.stdout));
                        out
                    }
                    // Command returned an error before timeout
                    Ok(Err(e)) => {
                        error!("Failed to execute agentId command: {:#} – retrying", e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                    // Timeout expired
                    Err(_) => {
                        error!("agentId command timed out after 2 seconds – retrying");
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                info!("Checking success");

                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    info!(tool_id = %tool.tool_id, result = %stdout, "agentId command completed successfully");

                    // Parse agent_tool_id from command output
                    if !stdout.is_empty() {
                        // TODO: add mechanism to verify that it's correct agent id
                        let agent_tool_id = stdout; // Use the command output as agent_tool_id
                        
                        match config_service.get_machine_id().await {
                            Ok(machine_id) => {
                                if let Err(e) = tool_connection_publisher
                                    .publish(machine_id, agent_tool_id.clone(), tool.tool_type.clone())
                                    .await
                                {
                                    error!(tool_id = %tool.tool_id, error = %e, "Failed to publish tool connection message");
                                    // Retry publishing on next cycle
                                    sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                                    continue;
                                }

                                if let Err(e) = tool_connection_service.save(ToolConnection {
                                    tool_agent_id: tool.tool_agent_id.clone(),
                                    agent_tool_id: agent_tool_id.clone(),
                                    published: true,
                                }).await {
                                    error!(tool_id = %tool.tool_id, error = %e, "Failed to save tool connection record");
                                    sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                                    continue;
                                }

                                info!(tool_id = %tool.tool_id, agent_tool_id = %agent_tool_id, "Tool connection message published successfully and saved");
                                // Stop processing after successful publish
                                sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                                break;
                            }
                            Err(e) => {
                                error!("Failed to get machine_id: {:#}", e);
                                sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                                continue;
                            }
                        }
                    } else {
                        info!(
                            tool_id = %tool.tool_id,
                            "agentId command returned empty output - retrying in {} seconds",
                            RETRY_DELAY_SECONDS
                        );
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    error!(
                        tool_id = %tool.tool_id,
                        exit_status = %output.status,
                        "agentId command failed - stdout: {} stderr: {}. Retrying in {} seconds",
                        stdout,
                        stderr,
                        RETRY_DELAY_SECONDS
                    );
                    sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                    continue;
                }
            }
        });

        Ok(())
    }
}


