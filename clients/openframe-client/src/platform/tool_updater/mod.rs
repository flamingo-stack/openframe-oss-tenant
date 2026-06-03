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
use tracing::{info, warn, error};

use crate::models::{InstalledTool, Installation, DownloadConfiguration, InstallationType};
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

pub async fn run_update(
    tool: &InstalledTool,
    config: &DownloadConfiguration,
    deps: ToolUpdaterDeps,
) -> Result<()> {
    let tool_id = &tool.tool_agent_id;
    let updater = create_updater(&tool.installation, deps);

    info!(tool_id = %tool_id, "Phase 1: Preparing update");
    let ctx = updater.prepare(tool).await
        .with_context(|| format!("Failed to prepare update for: {}", tool_id))?;

    info!(tool_id = %tool_id, "Phase 2: Applying update");
    match updater.apply(tool, config, &ctx).await {
        Ok(()) => {
            info!(tool_id = %tool_id, "Phase 3: Finalizing update");
            updater.finalize(tool, &ctx).await
                .with_context(|| format!("Failed to finalize update for: {}", tool_id))?;
            Ok(())
        }
        Err(e) => {
            error!(tool_id = %tool_id, error = %e, "Update failed, rolling back");
            if let Err(rollback_err) = updater.rollback(tool, &ctx).await {
                error!(tool_id = %tool_id, error = %rollback_err, "Rollback also failed");
            }
            Err(e).with_context(|| format!("Update failed for: {}", tool_id))
        }
    }
}

pub async fn run_migration(
    tool: &InstalledTool,
    config: &DownloadConfiguration,
    target_type: InstallationType,
    deps: ToolUpdaterDeps,
) -> Result<Installation> {
    let tool_id = &tool.tool_agent_id;

    let migrator = create_migrator(&tool.installation, target_type, deps)?
        .ok_or_else(|| anyhow::anyhow!("No migration needed: {:?} -> {:?}", tool.installation, target_type))?;

    info!(tool_id = %tool_id, "Migration Phase 1: Preparing");
    let ctx = migrator.prepare(tool).await
        .with_context(|| format!("Failed to prepare migration for: {}", tool_id))?;

    info!(tool_id = %tool_id, "Migration Phase 2: Migrating");
    match migrator.migrate(tool, config, &ctx).await {
        Ok(new_installation) => {
            info!(tool_id = %tool_id, "Migration Phase 3: Finalizing");
            migrator.finalize(tool, &new_installation, &ctx).await
                .with_context(|| format!("Failed to finalize migration for: {}", tool_id))?;

            info!(tool_id = %tool_id, "Migration completed: {:?}", new_installation);
            Ok(new_installation)
        }
        Err(e) => {
            error!(tool_id = %tool_id, error = %e, "Migration failed, attempting rollback");
            if let Err(rollback_err) = migrator.rollback(tool, &ctx).await {
                error!(tool_id = %tool_id, error = %rollback_err, "Rollback also failed");
            }
            Err(e).with_context(|| format!("Migration failed for: {}", tool_id))
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

    match copy_with_retry(backup, target_path).await {
        Ok(()) => {
            if let Err(e) = fs::remove_file(backup).await {
                warn!(tool_id = %tool_agent_id,
                      "Restored but failed to remove backup: {:#}", e);
            }
            info!(tool_id = %tool_agent_id, "Rollback completed");
            Ok(())
        }
        Err(copy_err) => {
            // Last-resort fallback: delete the (likely partial) target, then rename
            // the backup into place. On NTFS, rename can succeed where copy fails
            // because it only updates the directory entry rather than opening the
            // data stream of the (still-locked) destination. This guarantees we
            // never leave the user without a working binary at `target_path`.
            warn!(
                tool_id = %tool_agent_id,
                "copy_with_retry exhausted ({:#}); trying delete+rename fallback",
                copy_err
            );

            // Best-effort delete of the partially-written target. Ignore the
            // result — if the file doesn't exist, rename will succeed; if delete
            // fails, rename below will surface the real error.
            let _ = fs::remove_file(target_path).await;

            fs::rename(backup, target_path).await
                .with_context(|| format!(
                    "Both copy and rename rollback failed for {}",
                    target_path.display()
                ))?;
            info!(tool_id = %tool_agent_id,
                  "Rollback completed via delete+rename fallback");
            Ok(())
        }
    }
}

// Copy with Windows ERROR_SHARING_VIOLATION (32) retry. Same backoff budget as
// binary_writer::create_file_with_retry: ~10 s total, enough to ride out AV
// scan-on-write windows that fire after backup_binary finishes.
#[cfg(target_os = "windows")]
async fn copy_with_retry(src: &Path, dst: &Path) -> Result<()> {
    use binary_writer::{
        SHARING_VIOLATION_OS_ERROR, WRITE_MAX_RETRIES, WRITE_RETRY_DELAY,
    };

    for attempt in 1..=WRITE_MAX_RETRIES {
        match fs::copy(src, dst).await {
            Ok(_) => {
                if attempt > 1 {
                    info!(
                        "fs::copy succeeded on attempt {} for {} -> {}",
                        attempt,
                        src.display(),
                        dst.display()
                    );
                }
                return Ok(());
            }
            Err(e)
                if e.raw_os_error() == Some(SHARING_VIOLATION_OS_ERROR)
                    && attempt < WRITE_MAX_RETRIES =>
            {
                warn!(
                    "fs::copy locked (attempt {}/{}) on {}: {}. Retrying in {}ms",
                    attempt,
                    WRITE_MAX_RETRIES,
                    dst.display(),
                    e,
                    WRITE_RETRY_DELAY.as_millis()
                );
                tokio::time::sleep(WRITE_RETRY_DELAY).await;
            }
            Err(e) => {
                return Err(e).with_context(|| {
                    format!("Failed to copy {} to {}", src.display(), dst.display())
                });
            }
        }
    }
    unreachable!()
}

#[cfg(not(target_os = "windows"))]
async fn copy_with_retry(src: &Path, dst: &Path) -> Result<()> {
    fs::copy(src, dst).await
        .with_context(|| format!("Failed to copy {} to {}", src.display(), dst.display()))?;
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
