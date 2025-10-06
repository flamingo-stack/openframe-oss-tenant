use anyhow::{Context, Result};
use tracing::{info, warn, error, debug};
use std::process::Command;
use tokio::time::sleep;
use std::time::Duration;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::RwLock;
use sysinfo::{System, Signal};
use crate::models::installed_tool::{InstalledTool, ToolStatus};
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_command_params_resolver::ToolCommandParamsResolver;

const RETRY_DELAY_SECONDS: u64 = 5;

#[derive(Clone)]
pub struct ToolRunManager {
    installed_tools_service: InstalledToolsService,
    params_processor: ToolCommandParamsResolver,
    running_tools: Arc<RwLock<HashSet<String>>>,
}

impl ToolRunManager {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        params_processor: ToolCommandParamsResolver
    ) -> Self {
        Self {
            installed_tools_service,
            params_processor,
            running_tools: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub async fn run(&self) -> Result<()> {
        info!("Starting tool run manager");

        let tools = self
            .installed_tools_service
            .get_all()
            .await
            .context("Failed to retrieve installed tools list")?;

        if tools.is_empty() {
            info!("No installed tools found – nothing to run");
            return Ok(());
        }

        for tool in tools {
            if self.try_mark_running(&tool.tool_agent_id).await {
                info!("Running tool {}", tool.tool_agent_id);
                self.run_tool(tool).await?;
            } else {
                warn!("Tool {} is already running - skipping", tool.tool_agent_id);
            }
        }
 
        Ok(())
    }

    pub async fn run_new_tool(&self, installed_tool: InstalledTool) -> Result<()> {
        if !self.try_mark_running(&installed_tool.tool_agent_id).await {
            warn!("Tool {} is already running - skipping", installed_tool.tool_agent_id);
            return Ok(());
        }

        info!("Running new single tool {}", installed_tool.tool_agent_id);
        self.run_tool(installed_tool).await
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

    async fn run_tool(&self, tool: InstalledTool) -> Result<()> {
        self.stop_previous_tool_process(&tool.tool_agent_id).await?;

        let params_processor = self.params_processor.clone();
        tokio::spawn(async move {
            loop {
                // exchange args placeholders to real values
                let processed_args = match params_processor.process(&tool.tool_agent_id, tool.run_command_args.clone()) {
                    Ok(args) => args,
                    Err(e) => {
                        error!("Failed to resolve tool {} run command args: {:#}", tool.tool_agent_id, e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                debug!("Run tool {} with args: {:?}", tool.tool_agent_id, processed_args);

                // Build executable path using directory manager
                let command_path = params_processor.directory_manager
                    .get_agent_path(&tool.tool_agent_id)
                    .to_string_lossy()
                    .to_string();

                // spawn tool run process and wait async till the end
                let mut child = match Command::new(&command_path)
                    .args(&processed_args)
                    .spawn()
                {
                    Ok(child) => child,
                    Err(e) => {
                        error!(tool_id = %tool.tool_agent_id, error = %e,
                               "Failed to start tool process - retrying in {} seconds", RETRY_DELAY_SECONDS);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                match child.wait() {
                    Ok(status) => {
                        if status.success() {
                            warn!(tool_id = %tool.tool_agent_id,
                                  "Tool completed successfully but should keep running - restarting in {} seconds", 
                                  RETRY_DELAY_SECONDS);
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        } else {
                            error!(tool_id = %tool.tool_agent_id, exit_status = %status,
                                   "Tool failed with exit status - restarting in {} seconds", RETRY_DELAY_SECONDS);
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        }
                    }
                    Err(e) => {
                        error!(tool_id = %tool.tool_agent_id, error = %e,
                               "Failed to wait for tool process - restarting in {} seconds: {:#}", RETRY_DELAY_SECONDS, e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                    }
                }
            }
        });

        Ok(())
    }

    // TODO: make logic more smart and clean
    async fn stop_previous_tool_process(&self, tool_id: &str) -> Result<()> {
        let mut sys = System::new_all();
        sys.refresh_all();

        // Match processes whose command contains "/{tool_id}/agent"
        let pattern = Self::build_cmd_pattern(tool_id);

        for (pid, process) in sys.processes() {
            let cmd_items = process.cmd();
            let cmdline = cmd_items.join(" ").to_lowercase();

            if cmdline.contains(&pattern) {
                info!("Found previous tool process for {} with pid {}", tool_id, pid);

                if process.kill() {
                    info!("Previous tool process terminated for {} with pid {}", tool_id, pid);
                    continue;
                } else {
                    warn!("Failed to terminate previous tool process for {} with pid {}", tool_id, pid);
                    if let Some(killed) = process.kill_with(Signal::Kill) {
                        if killed {
                            info!("Previous tool process terminated with kill signal for {} with pid {}", tool_id, pid);
                        } else {
                            error!("Failed to terminate previous tool process with kill signal for {} with pid {}", tool_id, pid);
                        }
                    }
                }
            }
        }

        Ok(())
    }
    fn build_cmd_pattern(tool_id: &str) -> String {
        #[cfg(target_os = "windows")]
        {
            format!("\\{}\\agent", tool_id).to_lowercase()
        }
        #[cfg(any(target_os = "macos"))]
        {
            format!("/{}/agent", tool_id).to_lowercase()
        }
    }
}
