use anyhow::{Context, Result};
use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;
use tokio::process::Command;
use tokio::sync::RwLock;
use tokio::time::{sleep, timeout};
use tracing::{error, info, warn};

use crate::models::installed_tool::InstalledTool;
use crate::models::ToolConnection;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_command_params_resolver::ToolCommandParamsResolver;
use crate::services::tool_connection_message_publisher::ToolConnectionMessagePublisher;
use crate::services::tool_connection_service::ToolConnectionService;
use crate::services::tool_run_manager::ToolRunManager;

const RETRY_DELAY_SECONDS: u64 = 15;
/// Consecutive agentId-resolution failures tolerated at the normal cadence before the tool
/// connection is treated as degraded and the retry loop backs off (e.g. a hung `-nodeid-base64`).
const AGENT_ID_MAX_FAST_RETRIES: u32 = 5;
/// Back-off delay between agentId attempts once resolution is degraded, so a persistently
/// unhealthy agent can't spin a tight 15s loop forever while staying invisible.
const AGENT_ID_DEGRADED_BACKOFF_SECONDS: u64 = 300;

// TODO: refactor class
#[derive(Clone)]
pub struct ToolConnectionProcessingManager {
    installed_tools_service: InstalledToolsService,
    params_processor: ToolCommandParamsResolver,
    tool_connection_publisher: ToolConnectionMessagePublisher,
    config_service: AgentConfigurationService,
    tool_connection_service: ToolConnectionService,
    tool_run_manager: ToolRunManager,
    running_tools: Arc<RwLock<HashSet<String>>>,
}

impl ToolConnectionProcessingManager {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        params_processor: ToolCommandParamsResolver,
        tool_connection_publisher: ToolConnectionMessagePublisher,
        config_service: AgentConfigurationService,
        tool_connection_service: ToolConnectionService,
        tool_run_manager: ToolRunManager,
    ) -> Self {
        Self {
            installed_tools_service,
            params_processor,
            tool_connection_publisher,
            config_service,
            tool_connection_service,
            tool_run_manager,
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
            if self
                .tool_connection_service
                .exists_by_tool_agent_id(&tool.tool_agent_id)
                .await?
            {
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
                info!(
                    "Connection processing for tool {} is already running - skipping",
                    tool.tool_id
                );
            }
        }

        Ok(())
    }

    pub async fn run_new_tool(&self, installed_tool: InstalledTool) -> Result<()> {
        if self
            .tool_connection_service
            .exists_by_tool_agent_id(&installed_tool.tool_agent_id)
            .await?
        {
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

    pub async fn clear_running_tool(&self, tool_id: &str) {
        let mut set = self.running_tools.write().await;
        set.remove(tool_id);
    }

    async fn process_tool(&self, tool: InstalledTool) -> Result<()> {
        let params_processor = self.params_processor.clone();
        let config_service = self.config_service.clone();
        let tool_connection_publisher = self.tool_connection_publisher.clone();
        let tool_connection_service = self.tool_connection_service.clone();
        let tool_run_manager = self.tool_run_manager.clone();

        tokio::spawn(async move {
            // Counts consecutive agentId-resolution failures so a hung agent backs off
            // (and is reported as degraded) instead of spinning a tight retry loop forever.
            let mut agent_id_failures: u32 = 0;
            loop {
                while tool_run_manager.is_updating(&tool.tool_agent_id).await {
                    info!(tool_id = %tool.tool_id, "Tool is being updated, deferring node-id resolution...");
                    sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                }

                // If tool_agent_id_command_args is empty, use empty string as agent_tool_id
                let agent_tool_id = if tool.tool_agent_id_command_args.is_empty() {
                    info!(
                        tool_id = %tool.tool_id,
                        "No agentId command configured - using empty agent_tool_id"
                    );
                    String::new()
                } else {
                    // Resolve placeholders for tool_agent_id_command_args (gets agent_tool_id from command output)
                    let processed_args = match params_processor
                        .process(&tool.tool_agent_id, tool.tool_agent_id_command_args.clone())
                    {
                        Ok(args) => args,
                        Err(e) => {
                            error!(
                                "Failed to resolve tool {} agent_tool_id_command args: {:#}",
                                tool.tool_id, e
                            );
                            backoff_agent_id_failure(&tool.tool_id, &mut agent_id_failures).await;
                            continue;
                        }
                    };

                    info!(
                        "Run tool {} agentId command (to get agent_tool_id) with args: {:?}",
                        tool.tool_id, processed_args
                    );

                    let command_path = params_processor
                        .directory_manager
                        .get_tool_executable_path(
                            &tool.tool_agent_id,
                            tool.installation.executable_path(),
                        )
                        .to_string_lossy()
                        .to_string();

                    if !std::path::Path::new(&command_path).exists() {
                        warn!("Executable not found at: {}", command_path);
                    }
                    // Execute command with a 15-second timeout and capture output
                    let command_future = Command::new(&command_path).args(&processed_args).output();
                    let output = match timeout(Duration::from_secs(15), command_future).await {
                        // Command finished within timeout
                        Ok(Ok(out)) => {
                            info!(
                                "Command completed successfully: {}",
                                String::from_utf8_lossy(&out.stdout)
                            );
                            out
                        }
                        // Command returned an error before timeout
                        Ok(Err(e)) => {
                            error!("Failed to execute agentId command: {:#} – retrying", e);
                            backoff_agent_id_failure(&tool.tool_id, &mut agent_id_failures).await;
                            continue;
                        }
                        // Timeout expired
                        Err(_) => {
                            error!("agentId command timed out after 15 seconds – retrying");
                            backoff_agent_id_failure(&tool.tool_id, &mut agent_id_failures).await;
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
                            agent_id_failures = 0;
                            stdout // Use the command output as agent_tool_id
                        } else {
                            info!(
                                tool_id = %tool.tool_id,
                                "agentId command returned empty output - retrying"
                            );
                            backoff_agent_id_failure(&tool.tool_id, &mut agent_id_failures).await;
                            continue;
                        }
                    } else {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        error!(
                            tool_id = %tool.tool_id,
                            exit_status = %output.status,
                            "agentId command failed - stdout: {} stderr: {}. Retrying",
                            stdout,
                            stderr
                        );
                        backoff_agent_id_failure(&tool.tool_id, &mut agent_id_failures).await;
                        continue;
                    }
                };

                // Publish tool connection message
                match config_service.get_machine_id() {
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

                        if let Err(e) = tool_connection_service
                            .save(ToolConnection {
                                tool_agent_id: tool.tool_agent_id.clone(),
                                agent_tool_id: agent_tool_id.clone(),
                                published: true,
                            })
                            .await
                        {
                            error!(tool_id = %tool.tool_id, error = %e, "Failed to save tool connection record");
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                            continue;
                        }

                        info!(tool_id = %tool.tool_id, agent_tool_id = %agent_tool_id, "Tool connection message published successfully and saved");
                        // Stop processing after successful publish
                        break;
                    }
                    Err(e) => {
                        error!("Failed to get machine_id: {:#}", e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                }
            }
        });

        Ok(())
    }
}

/// Sleep between agentId-resolution attempts, escalating to a longer back-off once failures
/// are sustained. A persistently failing `-nodeid-base64` (hung agent / missing node identity)
/// would otherwise spin a tight 15s loop indefinitely and stay invisible; after
/// `AGENT_ID_MAX_FAST_RETRIES` it logs a one-time degraded error and slows to
/// `AGENT_ID_DEGRADED_BACKOFF_SECONDS`, while still retrying so it self-recovers if the agent
/// becomes healthy (e.g. after a server-side reinstall).
async fn backoff_agent_id_failure(tool_id: &str, failures: &mut u32) {
    *failures += 1;
    if *failures == AGENT_ID_MAX_FAST_RETRIES + 1 {
        error!(
            tool_id = %tool_id,
            consecutive_failures = *failures,
            "agentId resolution is failing repeatedly — tool connection is DEGRADED (agent likely \
             unhealthy: hung -nodeid-base64 or missing node identity). Backing off to {}s; will keep \
             retrying. A server-side reinstall may be required to recover.",
            AGENT_ID_DEGRADED_BACKOFF_SECONDS
        );
    }
    let delay = if *failures > AGENT_ID_MAX_FAST_RETRIES {
        AGENT_ID_DEGRADED_BACKOFF_SECONDS
    } else {
        RETRY_DELAY_SECONDS
    };
    sleep(Duration::from_secs(delay)).await;
}
