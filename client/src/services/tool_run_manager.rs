use anyhow::{Context, Result};
use tracing::{info, warn, error};
use std::process::Command;

use crate::models::installed_tool::ToolStatus;
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_installation_command_params_processor::ToolInstallationCommandParamsProcessor;

pub struct ToolRunManager {
    installed_tools_service: InstalledToolsService,
    params_processor: ToolInstallationCommandParamsProcessor,
}

impl ToolRunManager {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        params_processor: ToolInstallationCommandParamsProcessor
    ) -> Self {
        Self {
            installed_tools_service,
            params_processor
        }
    }

    pub async fn run(&self) -> Result<()> {
        let tools = self
            .installed_tools_service
            .get_all()
            .await
            .context("Failed to retrieve installed tools list")?;

        if tools.is_empty() {
            info!("No installed tools found – nothing to run");
            return Ok(());
        }

        for tool in tools.into_iter().filter(|t| t.status == ToolStatus::Installed) {
            let processor = self.params_processor.clone();

            tokio::spawn(async move {
                let res: Result<()> = tokio::task::spawn_blocking(move || {
                    if tool.run_command_args.is_empty() {
                        warn!(tool_id = %tool.tool_id, "Tool has no run_command_args – skipping");
                        return Ok(());
                    }

                    let processed_args = match processor.process(&tool.tool_id, tool.run_command_args.clone()) {
                        Ok(a) => a,
                        Err(e) => {
                            error!(tool_id = %tool.tool_id, err = %e, stacktrace = ?e, "Failed to process command parameters – skipping tool");
                            return Ok(());
                        }
                    };

                    let command_path = "/Users/kirillgontar/Library/Logs/OpenFrame/meshcentral-server/agent";
                    
                    info!(
                        tool_id = %tool.tool_id, 
                        command = %command_path, 
                        args = ?processed_args, 
                        "TOOL_LOG: Executing tool command"
                    );

                    let mut cmd = Command::new(command_path);
                    cmd.args(&processed_args);

                    match cmd.spawn() {
                        Ok(mut child) => {
                            info!(tool_id = %tool.tool_id, "TOOL_LOG: Tool process started successfully");
                            // Optionally wait for the process or let it run in background
                            tokio::spawn(async move {
                                match child.wait() {
                                    Ok(status) => {
                                        if status.success() {
                                            info!(tool_id = %tool.tool_id, "TOOL_LOG: Tool completed successfully");
                                        } else {
                                            error!(tool_id = %tool.tool_id, exit_code = ?status.code(), "TOOL_LOG: Tool exited with error");
                                        }
                                    }
                                    Err(e) => {
                                        error!(tool_id = %tool.tool_id, error = ?e, "Failed to wait for tool process");
                                    }
                                }
                            });
                        }
                        Err(e) => {
                            error!(error = ?e, "Failed to start tool process");
                        }
                    }
                    Ok(())
                }).await.unwrap_or_else(|e| Err(anyhow::anyhow!(e)));

                if let Err(e) = res {
                    error!(err = %e, stacktrace = ?e, "Background execution error for tool");
                }
            });
        }
 
        Ok(())
    }
}
