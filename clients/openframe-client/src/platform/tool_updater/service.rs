use anyhow::{Context, Result};
use async_trait::async_trait;
use std::path::PathBuf;
use tracing::{info, warn};

use super::{
    backup_binary, cleanup_backup, clear_aside_binary, download_and_write_binary,
    log_update_survivors, restore_from_backup, ToolUpdater, ToolUpdaterDeps, UpdateContext,
};
use crate::models::{DownloadConfiguration, Installation, InstalledTool};
#[cfg(target_os = "macos")]
use crate::platform::{binary_writer, remove_app_bundle_path};
use crate::platform::{system_service, DirectoryManager};

pub struct ServiceToolUpdater {
    deps: ToolUpdaterDeps,
}

impl ServiceToolUpdater {
    pub fn new(deps: ToolUpdaterDeps) -> Self {
        Self { deps }
    }

    fn resolve_executable_path(&self, tool: &InstalledTool) -> PathBuf {
        let agent_path = self
            .deps
            .directory_manager
            .get_agent_path(&tool.tool_agent_id);

        if let Installation::Service {
            executable_path: Some(exec_path),
            ..
        } = &tool.installation
        {
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
    #[cfg(target_os = "macos")]
    fn is_app_bundle_download(config: &DownloadConfiguration) -> bool {
        config.target_file_name.contains(".app/")
    }

    /// Best-effort bounce of a service still executing the pre-update image; never fails the update.
    #[cfg(target_os = "windows")]
    async fn remediate_orphaned_service(
        &self,
        tool: &InstalledTool,
        service_name: &str,
        exec_path: &std::path::Path,
    ) {
        let tool_agent_id = &tool.tool_agent_id;

        if let Err(e) = self
            .deps
            .tool_kill_service
            .stop_installed_tool(tool, false)
            .await
        {
            warn!(tool_id = %tool_agent_id, "Orphan remediation: service stop failed: {:#}", e);
        }
        if let Err(e) = self.deps.tool_kill_service.stop_tool(tool_agent_id).await {
            warn!(tool_id = %tool_agent_id, "Orphan remediation: process kill failed: {:#}", e);
        }

        // Only abstain when a tool process truly survives; a non-process lock holder (e.g. AV scan) must not block the start.
        if !clear_aside_binary(exec_path, tool_agent_id).await {
            if self
                .deps
                .tool_kill_service
                .is_installed_tool_running(tool)
                .await
            {
                tracing::error!(tool_id = %tool_agent_id,
                       "Orphan remediation: pre-update process would not die — leaving service stopped until it exits");
                return;
            }
            warn!(tool_id = %tool_agent_id,
                  "Orphan remediation: .old still locked but no tool process is running — starting the service anyway");
        }

        match system_service::start_service(service_name).await {
            Ok(()) => {
                info!(tool_id = %tool_agent_id, "Service {service_name} restarted on the updated binary")
            }
            Err(e) => {
                tracing::error!(tool_id = %tool_agent_id, "Orphan remediation: failed to start service: {:#}", e)
            }
        }
    }
}

#[async_trait]
impl ToolUpdater for ServiceToolUpdater {
    async fn prepare(&self, tool: &InstalledTool) -> Result<UpdateContext> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Preparing Service tool for update");

        info!(tool_id = %tool_agent_id, "Stopping service");
        if let Err(e) = self
            .deps
            .tool_kill_service
            .stop_installed_tool(tool, false)
            .await
        {
            warn!(tool_id = %tool_agent_id, "Failed to stop service (non-fatal): {:#}", e);
        }

        // Also kill any managed processes (ToolRunManager may have spawned agent.exe
        // if the tool was previously installed as Standard)
        info!(tool_id = %tool_agent_id, "Killing any remaining processes by pattern");
        if let Err(e) = self.deps.tool_kill_service.stop_tool(tool_agent_id).await {
            warn!(tool_id = %tool_agent_id, "Failed to kill processes by pattern (non-fatal): {:#}", e);
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        let exec_path = self.resolve_executable_path(tool);
        clear_aside_binary(&exec_path, tool_agent_id).await;
        log_update_survivors(&self.deps, tool).await;

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
    ) -> Result<Option<Installation>> {
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

            self.deps
                .github_download_service
                .download_and_extract_all(config, &tool_folder)
                .await
                .with_context(|| format!("Failed to download and extract: {}", tool_agent_id))?;

            // Set executable permissions on the binary
            if exec_path.exists() {
                binary_writer::set_executable_permissions(&exec_path).await?;
            }

            info!(tool_id = %tool_agent_id, "App bundle extracted successfully");
            return Ok(None);
        }

        // Standard single binary update
        download_and_write_binary(&self.deps, config, &exec_path, tool_agent_id).await?;
        Ok(None)
    }

    async fn finalize(&self, tool: &InstalledTool, ctx: &UpdateContext) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Finalizing Service tool update");

        if let Installation::Service { service_name, .. } = &tool.installation {
            // A locked .old means a pre-update process is still executing, whatever SCM reports — remediate before any start.
            #[cfg(target_os = "windows")]
            {
                let exec_path = self.resolve_executable_path(tool);
                if !clear_aside_binary(&exec_path, tool_agent_id).await {
                    tracing::error!(tool_id = %tool_agent_id,
                           "A pre-update process still holds the old {service_name} binary — remediating before start");
                    self.remediate_orphaned_service(tool, service_name, &exec_path)
                        .await;
                    cleanup_backup(ctx.backup_path.as_ref(), tool_agent_id).await;
                    return Ok(());
                }
                if system_service::service_not_stopped(service_name) {
                    // Benign: SCM recovery already restarted it on the new binary; start_service below no-ops on RUNNING.
                    info!(tool_id = %tool_agent_id,
                          "Service {service_name} already active with the updated binary");
                }
            }

            info!(tool_id = %tool_agent_id, "Starting service: {}", service_name);
            system_service::start_service(service_name)
                .await
                .with_context(|| format!("Failed to start service: {}", service_name))?;
        }

        cleanup_backup(ctx.backup_path.as_ref(), tool_agent_id).await;

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
        restore_from_backup(ctx.backup_path.as_ref(), &exec_path, tool_agent_id).await?;

        if let Installation::Service { service_name, .. } = &tool.installation {
            info!(tool_id = %tool_agent_id, "Restarting service after rollback: {}", service_name);
            if let Err(e) = system_service::start_service(service_name).await {
                warn!(tool_id = %tool_agent_id, "Failed to restart service after rollback (non-fatal): {:#}", e);
            }
        }

        Ok(())
    }
}
