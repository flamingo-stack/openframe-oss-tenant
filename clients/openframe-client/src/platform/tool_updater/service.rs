use anyhow::{Context, Result};
use async_trait::async_trait;
use std::path::PathBuf;
use tracing::{info, warn};

use super::{
    ToolUpdater, ToolUpdaterDeps, UpdateContext,
    backup_binary, download_and_write_binary, cleanup_backup, restore_from_backup,
};
use crate::models::{InstalledTool, Installation, DownloadConfiguration};
use crate::platform::{binary_writer, DirectoryManager, system_service};
#[cfg(target_os = "macos")]
use crate::platform::remove_app_bundle_path;

pub struct ServiceToolUpdater {
    deps: ToolUpdaterDeps,
}

impl ServiceToolUpdater {
    pub fn new(deps: ToolUpdaterDeps) -> Self {
        Self { deps }
    }

    fn resolve_executable_path(&self, tool: &InstalledTool) -> PathBuf {
        let agent_path = self.deps.directory_manager.get_agent_path(&tool.tool_agent_id);

        if let Installation::Service { executable_path: Some(exec_path), .. } = &tool.installation {
            if exec_path.starts_with('/') || exec_path.contains(':') {
                PathBuf::from(exec_path)
            } else {
                agent_path.parent().unwrap_or(&agent_path).join(exec_path)
            }
        } else {
            agent_path
        }
    }

    /// Check if download config targets an .app bundle
    fn is_app_bundle_download(config: &DownloadConfiguration) -> bool {
        config.target_file_name.contains(".app/")
    }
}

#[async_trait]
impl ToolUpdater for ServiceToolUpdater {
    async fn prepare(&self, tool: &InstalledTool) -> Result<UpdateContext> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Preparing Service tool for update");

        info!(tool_id = %tool_agent_id, "Stopping service");
        self.deps.tool_kill_service.stop_installed_tool(tool).await
            .with_context(|| format!("Failed to stop service: {}", tool_agent_id))?;

        // Also kill any managed processes (ToolRunManager may have spawned agent.exe
        // if the tool was previously installed as Standard)
        info!(tool_id = %tool_agent_id, "Killing any remaining processes by pattern");
        if let Err(e) = self.deps.tool_kill_service.stop_tool(tool_agent_id).await {
            warn!(tool_id = %tool_agent_id, "Failed to kill processes by pattern (non-fatal): {:#}", e);
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        let exec_path = self.resolve_executable_path(tool);

        // Skip backup for .app bundles on macOS - they're protected and too large
        let backup_path = if DirectoryManager::is_app_bundle_path(&exec_path) {
            warn!(tool_id = %tool_agent_id, "Skipping backup for .app bundle (protected by macOS)");
            None
        } else {
            backup_binary(&exec_path, tool_agent_id).await?
        };

        Ok(UpdateContext {
            backup_path,
            needs_restart: false,
        })
    }

    async fn apply(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        _ctx: &UpdateContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Applying Service tool update");

        let exec_path = self.resolve_executable_path(tool);

        // For .app bundles: remove old bundle, extract entire archive
        #[cfg(target_os = "macos")]
        if Self::is_app_bundle_download(config) {
            info!(tool_id = %tool_agent_id, "Detected .app bundle - using full extraction");

            // Remove old .app bundle if exists
            remove_app_bundle_path(&exec_path).await?;

            // Extract entire archive to tool folder
            let tool_folder = self.deps.directory_manager.get_tool_folder(tool_agent_id);
            info!(tool_id = %tool_agent_id, "Extracting to: {}", tool_folder.display());

            self.deps.github_download_service
                .download_and_extract_all(config, &tool_folder)
                .await
                .with_context(|| format!("Failed to download and extract: {}", tool_agent_id))?;

            // Set executable permissions on the binary
            if exec_path.exists() {
                binary_writer::set_executable_permissions(&exec_path).await?;
            }

            info!(tool_id = %tool_agent_id, "App bundle extracted successfully");
            return Ok(());
        }

        // Standard single binary update
        download_and_write_binary(&self.deps, config, &exec_path, tool_agent_id).await
    }

    async fn finalize(
        &self,
        tool: &InstalledTool,
        ctx: &UpdateContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Finalizing Service tool update");

        cleanup_backup(ctx.backup_path.as_ref(), tool_agent_id).await;

        // Restart service via system service manager
        if let Installation::Service { service_name, .. } = &tool.installation {
            info!(tool_id = %tool_agent_id, "Starting service: {}", service_name);
            system_service::start_service(service_name).await
                .with_context(|| format!("Failed to start service: {}", service_name))?;
        }

        Ok(())
    }

    async fn rollback(&self, tool: &InstalledTool, ctx: &UpdateContext) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Rolling back Service tool update");

        if ctx.backup_path.is_none() {
            warn!(tool_id = %tool_agent_id, "No backup available for rollback (app bundle). Reinstall from server required.");
            return Ok(());
        }

        let exec_path = self.resolve_executable_path(tool);
        restore_from_backup(ctx.backup_path.as_ref(), &exec_path, tool_agent_id).await
    }
}
