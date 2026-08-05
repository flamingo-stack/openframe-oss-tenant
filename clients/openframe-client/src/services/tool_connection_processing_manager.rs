use anyhow::{Context, Result};
use tracing::{info, error, warn};
use tokio::process::Command;
use tokio::time::{sleep, timeout};
use std::time::Duration;
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{Notify, RwLock};

use crate::models::installed_tool::InstalledTool;
use crate::models::ToolConnection;
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_command_params_resolver::ToolCommandParamsResolver;
use crate::services::tool_connection_message_publisher::ToolConnectionMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::tool_connection_service::ToolConnectionService;
use crate::services::tool_run_manager::ToolRunManager;

const RETRY_DELAY_SECONDS: u64 = 15;
/// agentId command timeout; generous because `-nodeid-base64` boots the full agent runtime.
const AGENT_ID_COMMAND_TIMEOUT_SECONDS: u64 = 30;
/// Consecutive agentId-resolution failures tolerated at the normal cadence before the tool
/// connection is treated as degraded and the retry loop backs off (e.g. a hung `-nodeid-base64`).
const AGENT_ID_MAX_FAST_RETRIES: u32 = 5;
/// Back-off delay between agentId attempts once resolution is degraded, so a persistently
/// unhealthy agent can't spin a tight 15s loop forever while staying invisible.
const AGENT_ID_DEGRADED_BACKOFF_SECONDS: u64 = 300;
/// Cadence of the periodic re-resolve + re-publish, so a mid-run re-key heals within the hour.
const REPUBLISH_INTERVAL_SECONDS: u64 = 3600;

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
    wake_signals: Arc<RwLock<HashMap<String, Arc<Notify>>>>,
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
            wake_signals: Arc::new(RwLock::new(HashMap::new())),
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

        // Re-resolve and re-publish on every start: the agent id can change behind our back (tool re-key, db wipe) and the backend updates the mapping only when told.
        for tool in tools {
            if tool.tool_type.is_empty() {
                warn!(tool_agent_id = %tool.tool_agent_id, "Tool has no tool_type - skipping connection publish (the backend rejects empty tool types)");
                continue;
            }

            if let Some(wake) = self.try_mark_running(&tool.tool_id).await {
                info!("Processing tool connection for {}", tool.tool_id);
                self.process_tool(tool, wake).await?;
            } else {
                info!("Connection processing for tool {} is already running - skipping", tool.tool_id);
            }
        }

        Ok(())
    }

    pub async fn run_new_tool(&self, installed_tool: InstalledTool) -> Result<()> {
        if installed_tool.tool_type.is_empty() {
            warn!(tool_agent_id = %installed_tool.tool_agent_id, "Tool has no tool_type - skipping connection publish (the backend rejects empty tool types)");
            return Ok(());
        }

        let wake = match self.try_mark_running(&installed_tool.tool_id).await {
            Some(wake) => wake,
            None => {
                // Reinstall with the loop still alive: wake it so the (possibly new) id publishes now, not at the next hourly tick.
                if let Some(wake) = self.wake_signals.read().await.get(&installed_tool.tool_id) {
                    wake.notify_one();
                    info!(
                        "Connection processing for tool {} is already running - requested immediate re-publish",
                        installed_tool.tool_id
                    );
                } else {
                    info!(
                        "Connection processing for tool {} is already running - skipping",
                        installed_tool.tool_id
                    );
                }
                return Ok(());
            }
        };

        info!(
            "Processing tool connection for newly installed tool {}",
            installed_tool.tool_id
        );
        self.process_tool(installed_tool, wake).await
    }

    /// Marks the tool as running and registers its wake handle under the same guard, so a racing run_new_tool can always nudge a marked tool.
    async fn try_mark_running(&self, tool_id: &str) -> Option<Arc<Notify>> {
        let mut set = self.running_tools.write().await;
        if set.contains(tool_id) {
            return None;
        }
        set.insert(tool_id.to_string());
        let wake = Arc::new(Notify::new());
        self.wake_signals.write().await.insert(tool_id.to_string(), wake.clone());
        Some(wake)
    }

    async fn process_tool(&self, mut tool: InstalledTool, wake: Arc<Notify>) -> Result<()> {
        let params_processor = self.params_processor.clone();
        let config_service = self.config_service.clone();
        let tool_connection_publisher = self.tool_connection_publisher.clone();
        let tool_connection_service = self.tool_connection_service.clone();
        let tool_run_manager = self.tool_run_manager.clone();
        let installed_tools_service = self.installed_tools_service.clone();
        let running_tools = self.running_tools.clone();
        let wake_signals = self.wake_signals.clone();

        tokio::spawn(async move {
            // Counts consecutive agentId-resolution failures so a hung agent backs off
            // (and is reported as degraded) instead of spinning a tight retry loop forever.
            let mut agent_id_failures: u32 = 0;
            loop {
                // Stop if the tool was uninstalled while we were retrying; don't proceed on a failed registry read.
                match installed_tools_service.get_by_tool_agent_id(&tool.tool_agent_id).await {
                    // Adopt the fresh record so a reinstall/update can't leave the loop resolving with stale config.
                    Ok(Some(fresh)) if !fresh.tool_type.is_empty() => tool = fresh,
                    Ok(Some(_)) => {}
                    Ok(None) => {
                        info!(tool_id = %tool.tool_id, "Tool no longer installed - stopping connection processing");
                        break;
                    }
                    Err(e) => {
                        warn!(tool_id = %tool.tool_id, "Cannot read installed tools registry: {e:#} - retrying");
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                }

                // `continue` instead of an inner wait loop so an uninstall during the update window is caught by the registry check above.
                if tool_run_manager.is_updating(&tool.tool_agent_id).await {
                    info!(tool_id = %tool.tool_id, "Tool is being updated, deferring node-id resolution...");
                    sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                    continue;
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
                            backoff_agent_id_failure(&tool.tool_id, &mut agent_id_failures).await;
                            continue;
                        }
                    };

                    info!(
                        "Run tool {} agentId command (to get agent_tool_id) with args: {:?}",
                        tool.tool_id,
                        processed_args
                    );

                    let command_path = params_processor.directory_manager
                        .get_tool_executable_path(&tool.tool_agent_id, tool.installation.executable_path())
                        .to_string_lossy()
                        .to_string();

                    if !std::path::Path::new(&command_path).exists() {
                        warn!("Executable not found at: {}", command_path);
                    }
                    // kill_on_drop: a timed-out agent must die with the future, or it leaks and holds the tool's db open
                    let command_future = Command::new(&command_path)
                        .args(&processed_args)
                        .kill_on_drop(true)
                        .output();
                    let output = match timeout(Duration::from_secs(AGENT_ID_COMMAND_TIMEOUT_SECONDS), command_future).await {
                        // Command finished within timeout
                        Ok(Ok(out)) => {
                            info!("Command completed successfully: {}", String::from_utf8_lossy(&out.stdout));
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
                            error!("agentId command timed out after {AGENT_ID_COMMAND_TIMEOUT_SECONDS} seconds – killed it, retrying");
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
                        tokio::select! {
                            _ = sleep(Duration::from_secs(REPUBLISH_INTERVAL_SECONDS)) => {}
                            _ = wake.notified() => info!(tool_id = %tool.tool_id, "Immediate re-publish requested - re-resolving agent id now"),
                        }
                    }
                    Err(e) => {
                        error!("Failed to get machine_id: {:#}", e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                }
            }

            // Drop the wake entry before the mark so a successor loop's fresh entry can't be clobbered.
            wake_signals.write().await.remove(&tool.tool_id);
            running_tools.write().await.remove(&tool.tool_id);
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


