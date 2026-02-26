use anyhow::Result;
use async_trait::async_trait;
use tracing::{info, warn};

use super::{ToolMigrator, MigrationContext};
use crate::models::{InstalledTool, Installation, DownloadConfiguration, InstallationType};
use crate::platform::tool_updater::{ToolUpdaterDeps, download_and_write_binary};

pub(super) struct StandardToGuiAppMigrator {
    deps: ToolUpdaterDeps,
}

impl StandardToGuiAppMigrator {
    pub fn new(deps: ToolUpdaterDeps) -> Self {
        Self { deps }
    }
}

#[async_trait]
impl ToolMigrator for StandardToGuiAppMigrator {
    fn from_type(&self) -> InstallationType {
        InstallationType::Standard
    }

    fn to_type(&self) -> InstallationType {
        InstallationType::GuiApp
    }

    async fn prepare(&self, tool: &InstalledTool) -> Result<MigrationContext> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Preparing migration: Standard -> GuiApp (Windows)");

        self.deps.tool_kill_service.stop_tool(tool_agent_id).await?;
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        Ok(MigrationContext {
            old_cleaned: false,
            needs_start: true,
        })
    }

    async fn migrate(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        _ctx: &MigrationContext,
    ) -> Result<Installation> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Migrating: Standard -> GuiApp (Windows)");

        let agent_path = self.deps.directory_manager.get_agent_path(tool_agent_id);
        download_and_write_binary(&self.deps, config, &agent_path, tool_agent_id).await?;

        let executable_path = agent_path.to_string_lossy().to_string();
        info!(tool_id = %tool_agent_id, "Migration binary written: {}", executable_path);

        Ok(Installation::GuiApp {
            executable_path,
            bundle_id: config.bundle_id.clone(),
        })
    }

    async fn finalize(
        &self,
        tool: &InstalledTool,
        new_installation: &Installation,
        ctx: &MigrationContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Finalizing migration: Standard -> GuiApp (Windows)");

        if !ctx.needs_start {
            return Ok(());
        }

        let Installation::GuiApp { executable_path, .. } = new_installation else {
            return Ok(());
        };

        let args = self.deps.command_params_resolver
            .process(tool_agent_id, tool.run_command_args.clone())
            .unwrap_or_else(|_| tool.run_command_args.clone());

        // Launch in user session so it's visible in the system tray
        match crate::services::tool_run_manager::launch_process_in_user_session(executable_path, &args) {
            Ok((pid, process_handle)) => {
                info!(tool_id = %tool_agent_id, "GuiApp launched in user session after migration, PID: {}", pid);
                // Fire-and-forget — ToolRunManager picks up lifecycle on next restart
                unsafe { let _ = windows::Win32::Foundation::CloseHandle(process_handle); }
            }
            Err(e) => {
                warn!(tool_id = %tool_agent_id, "Failed to launch GuiApp after migration: {:#}", e);
            }
        }

        Ok(())
    }

    async fn rollback(&self, tool: &InstalledTool, _ctx: &MigrationContext) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        warn!(
            tool_id = %tool_agent_id,
            "Rollback for Standard->GuiApp migration (Windows): binary may have been overwritten. Reinstall may be required."
        );
        Ok(())
    }
}
