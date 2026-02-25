mod standard;
#[cfg(target_os = "macos")]
mod gui_app;
mod service;
mod migration;

pub use standard::StandardToolUpdater;
#[cfg(target_os = "macos")]
pub use gui_app::GuiAppToolUpdater;
pub use service::ServiceToolUpdater;
pub use migration::{ToolMigrator, MigrationContext, create_migrator, needs_migration};

use anyhow::{Context, Result};
use async_trait::async_trait;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tracing::{info, warn};

use crate::models::{InstalledTool, Installation, DownloadConfiguration};
use crate::services::{GithubDownloadService, ToolKillService, ToolRunManager, ToolCommandParamsResolver};
use crate::platform::{DirectoryManager, binary_writer};

#[derive(Debug, Clone)]
pub struct UpdateContext {
    pub backup_path: Option<PathBuf>,
    pub needs_restart: bool,
}

impl Default for UpdateContext {
    fn default() -> Self {
        Self {
            backup_path: None,
            needs_restart: true,
        }
    }
}

#[async_trait]
pub trait ToolUpdater: Send + Sync {
    async fn prepare(&self, tool: &InstalledTool) -> Result<UpdateContext>;

    async fn apply(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        ctx: &UpdateContext,
    ) -> Result<()>;

    async fn finalize(
        &self,
        tool: &InstalledTool,
        ctx: &UpdateContext,
    ) -> Result<()>;

    async fn rollback(&self, tool: &InstalledTool, ctx: &UpdateContext) -> Result<()>;
}

#[derive(Clone)]
pub struct ToolUpdaterDeps {
    pub github_download_service: GithubDownloadService,
    pub tool_kill_service: ToolKillService,
    pub tool_run_manager: ToolRunManager,
    pub directory_manager: DirectoryManager,
    pub command_params_resolver: ToolCommandParamsResolver,
}

pub fn create_updater(
    installation: &Installation,
    deps: ToolUpdaterDeps,
) -> Arc<dyn ToolUpdater> {
    match installation {
        Installation::Standard { .. } => {
            Arc::new(StandardToolUpdater::new(deps))
        }
        Installation::GuiApp { .. } => {
            #[cfg(target_os = "macos")]
            {
                Arc::new(GuiAppToolUpdater::new(deps))
            }
            #[cfg(not(target_os = "macos"))]
            {
                // TODO: Implement proper Windows GuiApp updater
                // For now, use StandardToolUpdater which handles binary download/replace
                Arc::new(StandardToolUpdater::new(deps))
            }
        }
        Installation::Service { .. } => {
            Arc::new(ServiceToolUpdater::new(deps))
        }
    }
}

pub(crate) async fn backup_binary(
    source_path: &Path,
    tool_agent_id: &str,
) -> Result<Option<PathBuf>> {
    if !source_path.exists() {
        info!(tool_id = %tool_agent_id, "No existing binary to backup at: {}", source_path.display());
        return Ok(None);
    }

    let backup_path = source_path.with_extension("backup");
    info!(tool_id = %tool_agent_id, "Backing up binary: {} -> {}",
          source_path.display(), backup_path.display());

    fs::copy(source_path, &backup_path).await
        .with_context(|| format!("Failed to backup: {}", source_path.display()))?;

    Ok(Some(backup_path))
}

pub(crate) async fn download_and_write_binary(
    deps: &ToolUpdaterDeps,
    config: &DownloadConfiguration,
    target_path: &Path,
    tool_agent_id: &str,
) -> Result<()> {
    info!(tool_id = %tool_agent_id, "Downloading binary from: {}", config.link);
    let binary_bytes = deps.github_download_service
        .download_and_extract(config)
        .await
        .with_context(|| format!("Failed to download: {}", tool_agent_id))?;

    info!(tool_id = %tool_agent_id, "Writing binary to: {}", target_path.display());
    binary_writer::write_executable(&binary_bytes, target_path).await
        .with_context(|| format!("Failed to write binary for: {}", tool_agent_id))
}

pub(crate) async fn cleanup_backup(backup_path: Option<&PathBuf>, tool_agent_id: &str) {
    let Some(path) = backup_path else { return };

    if !path.exists() {
        return;
    }

    info!(tool_id = %tool_agent_id, "Removing backup: {}", path.display());
    if let Err(e) = fs::remove_file(path).await {
        warn!(tool_id = %tool_agent_id, "Failed to remove backup: {:#}", e);
    }
}

pub(crate) async fn restore_from_backup(
    backup_path: Option<&PathBuf>,
    target_path: &Path,
    tool_agent_id: &str,
) -> Result<()> {
    let Some(backup) = backup_path else {
        warn!(tool_id = %tool_agent_id, "No backup available for rollback");
        return Ok(());
    };

    if !backup.exists() {
        warn!(tool_id = %tool_agent_id, "Backup file not found: {}", backup.display());
        return Ok(());
    }

    info!(tool_id = %tool_agent_id, "Restoring from backup: {} -> {}",
          backup.display(), target_path.display());

    fs::copy(backup, target_path).await
        .with_context(|| "Failed to restore from backup")?;

    fs::remove_file(backup).await
        .with_context(|| "Failed to remove backup after restore")?;

    info!(tool_id = %tool_agent_id, "Rollback completed");
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub struct UnsupportedToolUpdater {
    message: String,
}

#[cfg(not(target_os = "macos"))]
impl UnsupportedToolUpdater {
    pub fn new(message: &str) -> Self {
        Self {
            message: message.to_string(),
        }
    }
}

#[cfg(not(target_os = "macos"))]
#[async_trait]
impl ToolUpdater for UnsupportedToolUpdater {
    async fn prepare(&self, _tool: &InstalledTool) -> Result<UpdateContext> {
        anyhow::bail!("{}", self.message)
    }

    async fn apply(
        &self,
        _tool: &InstalledTool,
        _config: &DownloadConfiguration,
        _ctx: &UpdateContext,
    ) -> Result<()> {
        anyhow::bail!("{}", self.message)
    }

    async fn finalize(&self, _tool: &InstalledTool, _ctx: &UpdateContext) -> Result<()> {
        Ok(())
    }

    async fn rollback(&self, _tool: &InstalledTool, _ctx: &UpdateContext) -> Result<()> {
        Ok(())
    }
}
