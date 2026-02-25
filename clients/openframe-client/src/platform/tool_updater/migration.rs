use anyhow::{Result, bail};
use async_trait::async_trait;
use std::sync::Arc;
use tracing::{info, warn};

use super::ToolUpdaterDeps;
use crate::models::{InstalledTool, Installation, DownloadConfiguration, InstallationType};

#[derive(Debug, Clone, Default)]
pub struct MigrationContext {
    pub old_cleaned: bool,
    pub needs_start: bool,
}

#[async_trait]
pub trait ToolMigrator: Send + Sync {
    /// Source installation type this migrator handles
    fn from_type(&self) -> InstallationType;

    /// Target installation type this migrator produces
    fn to_type(&self) -> InstallationType;

    /// Phase 1: Stop old installation and prepare for migration
    async fn prepare(&self, tool: &InstalledTool) -> Result<MigrationContext>;

    /// Phase 2: Remove old installation and install new way
    async fn migrate(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        ctx: &MigrationContext,
    ) -> Result<Installation>;

    /// Phase 3: Start new installation and cleanup
    async fn finalize(
        &self,
        tool: &InstalledTool,
        new_installation: &Installation,
        ctx: &MigrationContext,
    ) -> Result<()>;

    /// Rollback on failure (best effort)
    async fn rollback(&self, tool: &InstalledTool, ctx: &MigrationContext) -> Result<()> {
        warn!(
            tool_id = %tool.tool_agent_id,
            "Migration rollback requested but not implemented for {:?} -> {:?}",
            self.from_type(),
            self.to_type()
        );
        Ok(())
    }
}

pub fn create_migrator(
    from: &Installation,
    to: InstallationType,
    deps: ToolUpdaterDeps,
) -> Result<Option<Arc<dyn ToolMigrator>>> {
    let from_type = installation_to_type(from);

    // No migration needed if types match
    if from_type == to {
        return Ok(None);
    }

    info!("Migration required: {:?} -> {:?}", from_type, to);

    match (from_type, to) {
        // Standard -> GuiApp 
        #[cfg(target_os = "macos")]
        (InstallationType::Standard, InstallationType::GuiApp) => {
            Ok(Some(Arc::new(StandardToGuiAppMigrator::new(deps))))
        }
        _ => {
            bail!(
                "Unsupported migration path: {:?} -> {:?}",
                from_type,
                to
            );
        }
    }
}

pub fn needs_migration(current: &Installation, target: InstallationType) -> bool {
    installation_to_type(current) != target
}

fn installation_to_type(installation: &Installation) -> InstallationType {
    match installation {
        Installation::Standard { .. } => InstallationType::Standard,
        Installation::GuiApp { .. } => InstallationType::GuiApp,
        Installation::Service { .. } => InstallationType::Service,
    }
}

#[cfg(target_os = "macos")]
pub struct StandardToGuiAppMigrator {
    deps: ToolUpdaterDeps,
}

#[cfg(target_os = "macos")]
impl StandardToGuiAppMigrator {
    pub fn new(deps: ToolUpdaterDeps) -> Self {
        Self { deps }
    }
}

#[cfg(target_os = "macos")]
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
        use crate::platform::DirectoryManager;
        use std::path::PathBuf;
        use tokio::fs;

        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Migrating: Standard -> GuiApp");

        // 1. Remove old standard binary
        let old_agent_path = self.deps.directory_manager.get_agent_path(tool_agent_id);
        if old_agent_path.exists() {
            info!(tool_id = %tool_agent_id, "Removing old standard binary: {}", old_agent_path.display());
            fs::remove_file(&old_agent_path).await.ok(); // Best effort
        }

        // 2. Download and extract new .app bundle to /Applications
        let applications_dir = PathBuf::from("/Applications");
        info!(tool_id = %tool_agent_id, "Installing GuiApp to: {}", applications_dir.display());

        self.deps.github_download_service
            .download_and_extract_all(config, &applications_dir)
            .await?;

        // 3. Verify installation
        let new_app_path = applications_dir.join(&config.target_file_name);
        let executable_path = if let Some(app_bundle) = DirectoryManager::find_app_bundle_path(&new_app_path) {
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