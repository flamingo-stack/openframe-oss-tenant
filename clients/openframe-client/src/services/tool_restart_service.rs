use anyhow::{Context, Result};
use tracing::info;
use crate::models::{InstalledTool, Installation};
use crate::services::InstalledToolsService;
use crate::services::ToolKillService;
use crate::services::tool_run_manager::ToolRunManager;
use crate::platform::system_service;

pub enum RestartOutcome {
    Restarted,
    NotInstalled,
}

#[derive(Clone)]
pub struct ToolRestartService {
    installed_tools_service: InstalledToolsService,
    tool_kill_service: ToolKillService,
    tool_run_manager: ToolRunManager,
}

impl ToolRestartService {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        tool_kill_service: ToolKillService,
        tool_run_manager: ToolRunManager,
    ) -> Self {
        Self {
            installed_tools_service,
            tool_kill_service,
            tool_run_manager,
        }
    }

    pub async fn restart_by_tool_agent_id(&self, tool_agent_id: &str) -> Result<RestartOutcome> {
        match self.installed_tools_service.get_by_tool_agent_id(tool_agent_id).await? {
            None => {
                info!("Tool {} not present in registry, nothing to restart", tool_agent_id);
                Ok(RestartOutcome::NotInstalled)
            }
            Some(tool) => {
                self.restart_tool(&tool).await
                    .with_context(|| format!("Failed to restart tool: {}", tool_agent_id))?;
                Ok(RestartOutcome::Restarted)
            }
        }
    }

    async fn restart_tool(&self, tool: &InstalledTool) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;

        // Stop the tool: for Service installs this stops the OS service and kills detached children.
        info!("Stopping tool for restart: {}", tool_agent_id);
        self.tool_kill_service.stop_installed_tool(tool, false).await
            .with_context(|| format!("Failed to stop tool for restart: {}", tool_agent_id))?;

        match &tool.installation {
            Installation::Service { service_name, .. } => {
                // Services aren't supervised by the run manager, so start them back explicitly.
                info!(service_name = %service_name, "Starting service tool back up");
                system_service::start_service(service_name).await
                    .with_context(|| format!("Failed to start service {}", service_name))?;
            }
            _ => {
                // Supervised process: the run-manager loop relaunches it once the update flag clears.
                self.tool_run_manager.run_new_tool(tool.clone()).await
                    .with_context(|| format!("Failed to ensure supervision for tool: {}", tool_agent_id))?;
            }
        }

        info!("Tool {} restart triggered", tool_agent_id);
        Ok(())
    }
}
