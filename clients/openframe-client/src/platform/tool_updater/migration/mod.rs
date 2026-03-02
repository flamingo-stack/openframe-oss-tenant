#[cfg(any(target_os = "macos", windows))]
mod standard_to_gui_app;

use anyhow::{bail, Result};
use async_trait::async_trait;
use std::sync::Arc;
use tracing::{info, warn};

use super::ToolUpdaterDeps;
use crate::models::{DownloadConfiguration, Installation, InstallationType, InstalledTool};

#[cfg(any(target_os = "macos", windows))]
use standard_to_gui_app::StandardToGuiAppMigrator;

#[derive(Debug, Clone, Default)]
pub struct MigrationContext {
    pub old_cleaned: bool,
    pub needs_start: bool,
}

#[async_trait]
pub trait ToolMigrator: Send + Sync {
    fn from_type(&self) -> InstallationType;

    fn to_type(&self) -> InstallationType;

    async fn prepare(&self, tool: &InstalledTool) -> Result<MigrationContext>;

    async fn migrate(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        ctx: &MigrationContext,
    ) -> Result<Installation>;

    async fn finalize(
        &self,
        tool: &InstalledTool,
        new_installation: &Installation,
        ctx: &MigrationContext,
    ) -> Result<()>;

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
