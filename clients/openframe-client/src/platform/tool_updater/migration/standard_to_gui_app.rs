use anyhow::Result;
use async_trait::async_trait;
use std::path::PathBuf;
use tokio::fs;
use tracing::{info, warn};

use super::{ToolMigrator, MigrationContext};
use crate::models::{InstalledTool, Installation, DownloadConfiguration, InstallationType};
use crate::platform::tool_updater::ToolUpdaterDeps;
use crate::platform::DirectoryManager;

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
        info!(tool_id = %tool_agent_id, "Preparing migration: Standard -> GuiApp");

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
        info!(tool_id = %tool_agent_id, "Migrating: Standard -> GuiApp");

        // 1. Remove old standard binary
        let old_agent_path = self.deps.directory_manager.get_agent_path(tool_agent_id);
        if old_agent_path.exists() {
            info!(tool_id = %tool_agent_id, "Removing old standard binary: {}", old_agent_path.display());
            fs::remove_file(&old_agent_path).await.ok();
        }

        // 2. Download and extract new .app bundle to /Applications
        let applications_dir = PathBuf::from("/Applications");
        info!(tool_id = %tool_agent_id, "Installing GuiApp to: {}", applications_dir.display());

        self.deps.github_download_service
            .download_and_extract_all(config, &applications_dir)
            .await?;

        // 3. Resolve executable path from .app bundle
        let new_app_path = applications_dir.join(&config.target_file_name);
        let executable_path = if DirectoryManager::find_app_bundle_path(&new_app_path).is_some() {
            applications_dir.join(&config.target_file_name).to_string_lossy().to_string()
        } else {
            new_app_path.join("Contents/MacOS").join(tool_agent_id).to_string_lossy().to_string()
        };

        info!(tool_id = %tool_agent_id, "Migration complete, new executable: {}", executable_path);

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
        use crate::platform::user_session::{get_console_user, launch_as_user};

        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Finalizing migration: Standard -> GuiApp");

        if !ctx.needs_start {
            return Ok(());
        }

        let Installation::GuiApp { executable_path, bundle_id } = new_installation else {
            return Ok(());
        };

        // Write preferences if bundle_id exists
        if let Some(bid) = bundle_id {
            use crate::platform::preferences_writer::{write, args_to_pairs};

            let resolved_args = self.deps.command_params_resolver
                .process(tool_agent_id, tool.run_command_args.clone())
                .unwrap_or_else(|_| tool.run_command_args.clone());

            let prefs = args_to_pairs(&resolved_args);
            if let Err(e) = write(bid, prefs) {
                warn!(tool_id = %tool_agent_id, "Failed to write preferences: {:#}", e);
            }
        }

        // Launch as user
        let Some(user) = get_console_user() else {
            warn!(tool_id = %tool_agent_id, "No console user, cannot launch GuiApp");
            return Ok(());
        };

        let launch_args = if bundle_id.is_some() && tool_agent_id == "openframe-chat" {
            vec!["--background".to_string()]
        } else if bundle_id.is_some() {
            vec![]
        } else {
            tool.run_command_args.clone()
        };

        match launch_as_user(executable_path, &launch_args, &user).await {
            Ok(child) => {
                info!(tool_id = %tool_agent_id, "GuiApp launched after migration, PID: {:?}", child.id());
            }
            Err(e) => {
                warn!(tool_id = %tool_agent_id, "Failed to launch GuiApp: {:#}", e);
            }
        }

        Ok(())
    }

    async fn rollback(&self, tool: &InstalledTool, _ctx: &MigrationContext) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        warn!(
            tool_id = %tool_agent_id,
            "Rollback for Standard->GuiApp migration: old binary may be lost. Reinstall required."
        );
        Ok(())
    }
}
