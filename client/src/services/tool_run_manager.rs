use anyhow::{Context, Result};
use tracing::{info, warn, error};
use std::process::Command;

use crate::models::installed_tool::{InstalledTool, ToolStatus};
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

        for tool in tools {
            self.run_tool(tool).await?;
        }
 
        Ok(())
    }

    pub async fn run_new_tool(&self, installed_tool: InstalledTool) -> Result<()> {
        info!(tool_id = %installed_tool.tool_id, "Running single tool");
        self.run_tool(installed_tool).await
    }

    async fn run_tool(&self, tool: InstalledTool) -> Result<()> {
        // exchange args placeholders to real values
        let processed_args = self
            .params_processor
            .process(&tool.tool_id, tool.run_command_args.clone())
            .context("Failed to process run command params for tool")?;
        // TODO: rerun

        let command_path = format!("/Users/kirillgontar/Library/Logs/OpenFrame/{}/agent", tool.tool_id);

        info!("TOOL_LOG: Executing tool command - tool_id: {}, command: {}, args: {:?}", tool.tool_id, command_path, processed_args);

        // spawn tool run process and wait async till the end
        let mut child = Command::new(command_path)
            .args(&processed_args)
            .spawn()
            .with_context(|| format!("Failed to start tool process: {}", tool.tool_id))?;

        tokio::spawn(async move {
            match child.wait() {
                Ok(status) => {
                    if status.success() {
                        info!("Tool completed successfully");
                        // TODO: rerun
                    } else {
                        error!("Tool failed with exit status: {}", status);
                        // TODO: rerun
                    }
                }
                Err(e) => {
                    error!(error = ?e, "Failed to wait for tool process");
                    // TODO: rerun
                }
            }
        });

        Ok(())
    }
}
