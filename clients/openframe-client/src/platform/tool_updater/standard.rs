use anyhow::{Context, Result};
use async_trait::async_trait;
use tracing::info;

use super::{
    ToolUpdater, ToolUpdaterDeps, UpdateContext,
    backup_binary, download_and_write_binary, cleanup_backup, restore_from_backup,
};
use crate::models::{InstalledTool, DownloadConfiguration};

pub struct StandardToolUpdater {
    deps: ToolUpdaterDeps,
}

impl StandardToolUpdater {
    pub fn new(deps: ToolUpdaterDeps) -> Self {
        Self { deps }
    }
}

#[async_trait]
impl ToolUpdater for StandardToolUpdater {
    async fn prepare(&self, tool: &InstalledTool) -> Result<UpdateContext> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Preparing Standard tool for update");

        info!(tool_id = %tool_agent_id, "Stopping tool process");
        self.deps.tool_kill_service.stop_tool(tool_agent_id).await
            .with_context(|| format!("Failed to stop tool: {}", tool_agent_id))?;

        let agent_path = self.deps.directory_manager.get_agent_path(tool_agent_id);
        let backup_path = backup_binary(&agent_path, tool_agent_id).await?;

        Ok(UpdateContext {
            backup_path,
            needs_restart: true,
        })
    }

    async fn apply(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        _ctx: &UpdateContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Applying Standard tool update");

        let agent_path = self.deps.directory_manager.get_agent_path(tool_agent_id);
        download_and_write_binary(&self.deps, config, &agent_path, tool_agent_id).await
    }

    async fn finalize(
        &self,
        tool: &InstalledTool,
        ctx: &UpdateContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Finalizing Standard tool update");

        cleanup_backup(ctx.backup_path.as_ref(), tool_agent_id).await;

        if ctx.needs_restart {
            info!(tool_id = %tool_agent_id, "Tool will auto-restart via run manager");
        }

        Ok(())
    }

    async fn rollback(&self, tool: &InstalledTool, ctx: &UpdateContext) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Rolling back Standard tool update");

        let agent_path = self.deps.directory_manager.get_agent_path(tool_agent_id);
        restore_from_backup(ctx.backup_path.as_ref(), &agent_path, tool_agent_id).await
    }
}
