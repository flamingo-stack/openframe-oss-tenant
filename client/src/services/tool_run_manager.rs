use anyhow::{Context, Result};
use tracing::{info, warn, error};

use crate::models::installed_tool::ToolStatus;
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_installation_command_params_processor::ToolInstallationCommandParamsProcessor;
use crate::platform::permissions::PermissionUtils;

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

                    let args_ref: Vec<&str> = processed_args.iter().map(|s| s.as_str()).collect();

                    if let Err(e) = PermissionUtils::run_as_admin("/Users/kirillgontar/Library/Logs/OpenFrame/meshcentral-server/agent", &args_ref) {
                        error!(tool_id = %tool.tool_id, err = %e, stacktrace = ?e, "Failed to run tool");
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
