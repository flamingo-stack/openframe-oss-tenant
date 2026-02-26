#[cfg(target_os = "macos")]
mod standard_to_gui_app;
#[cfg(windows)]
mod standard_to_gui_app_win;

use anyhow::{Result, bail};
use async_trait::async_trait;
use std::sync::Arc;
use tracing::{info, warn};

use super::ToolUpdaterDeps;
use crate::models::{InstalledTool, Installation, DownloadConfiguration, InstallationType};

#[cfg(target_os = "macos")]
use standard_to_gui_app::StandardToGuiAppMigrator;
#[cfg(windows)]
use standard_to_gui_app_win::StandardToGuiAppMigrator;

// ── Context ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct MigrationContext {
    pub old_cleaned: bool,
    pub needs_start: bool,
}

// ── Trait ─────────────────────────────────────────────────────────────────────

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

// ── Factory ──────────────────────────────────────────────────────────────────

pub fn create_migrator(
    from: &Installation,
    to: InstallationType,
    deps: ToolUpdaterDeps,
) -> Result<Option<Arc<dyn ToolMigrator>>> {
    let from_type = installation_to_type(from);

    if from_type == to {
        return Ok(None);
    }

    info!("Migration required: {:?} -> {:?}", from_type, to);

    match (from_type, to) {
        #[cfg(any(target_os = "macos", windows))]
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
