use crate::models::{Installation, InstalledTool};
use crate::platform::system_service;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::InstalledToolsService;
use crate::services::ToolKillService;
use anyhow::{Context, Result};
use futures::FutureExt;
use std::panic::AssertUnwindSafe;
use tracing::{info, warn};

pub enum RestartOutcome {
    Restarted,
    NotInstalled,
    Busy,
}

/// Clears the updating flag on drop (surviving cancellation and panic), releasing the tool lock only after the flag clears.
struct UpdatingGuard {
    tool_run_manager: ToolRunManager,
    tool_agent_id: String,
    lock_guard: Option<tokio::sync::OwnedMutexGuard<()>>,
}

impl Drop for UpdatingGuard {
    fn drop(&mut self) {
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            let manager = self.tool_run_manager.clone();
            let tool_agent_id = self.tool_agent_id.clone();
            let lock_guard = self.lock_guard.take();
            handle.spawn(async move {
                manager.clear_updating(&tool_agent_id).await;
                drop(lock_guard);
            });
        }
    }
}

#[derive(Clone)]
pub struct ToolRestartService {
    installed_tools_service: InstalledToolsService,
    tool_kill_service: ToolKillService,
    tool_run_manager: ToolRunManager,
}

impl ToolRestartService {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        tool_kill_service: ToolKillService,
        tool_run_manager: ToolRunManager,
    ) -> Self {
        Self {
            installed_tools_service,
            tool_kill_service,
            tool_run_manager,
        }
    }

    /// Restart under the tool lock with the updating flag held; the flag is cleared exactly once on return, panic, or cancellation, and the lock is held until then.
    pub async fn restart_guarded(&self, tool_agent_id: &str) -> Result<RestartOutcome> {
        let tool_lock = self.tool_run_manager.tool_lock(tool_agent_id).await;
        let lock_guard = match tool_lock.try_lock_owned() {
            Ok(guard) => guard,
            Err(_) => return Ok(RestartOutcome::Busy),
        };
        self.tool_run_manager.mark_updating(tool_agent_id).await;
        let _updating = UpdatingGuard {
            tool_run_manager: self.tool_run_manager.clone(),
            tool_agent_id: tool_agent_id.to_string(),
            lock_guard: Some(lock_guard),
        };
        let outcome = AssertUnwindSafe(self.restart_by_tool_agent_id(tool_agent_id))
            .catch_unwind()
            .await;
        match outcome {
            Ok(result) => result,
            Err(_) => Err(anyhow::anyhow!(
                "Restart panicked for tool {}",
                tool_agent_id
            )),
        }
    }

    async fn restart_by_tool_agent_id(&self, tool_agent_id: &str) -> Result<RestartOutcome> {
        match self
            .installed_tools_service
            .get_by_tool_agent_id(tool_agent_id)
            .await?
        {
            None => {
                info!(
                    "Tool {} not present in registry, nothing to restart",
                    tool_agent_id
                );
                Ok(RestartOutcome::NotInstalled)
            }
            Some(tool) => {
                self.restart_tool(&tool)
                    .await
                    .with_context(|| format!("Failed to restart tool: {}", tool_agent_id))?;
                Ok(RestartOutcome::Restarted)
            }
        }
    }

    async fn restart_tool(&self, tool: &InstalledTool) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;

        // Stop the tool: for Service installs this stops the OS service and kills detached children.
        info!("Stopping tool for restart: {}", tool_agent_id);
        self.tool_kill_service
            .stop_installed_tool(tool, false)
            .await
            .with_context(|| format!("Failed to stop tool for restart: {}", tool_agent_id))?;

        match &tool.installation {
            Installation::Service { service_name, .. } => {
                // Services aren't supervised by the run manager, so start them back explicitly.
                info!(service_name = %service_name, "Starting service tool back up");
                if let Err(e) = system_service::start_service(service_name).await {
                    // A start error can mean "already running" (e.g. relaunched by the OS supervisor) — verify before failing.
                    if self.tool_kill_service.is_installed_tool_running(tool).await {
                        info!(service_name = %service_name, "start_service failed but the tool is running — treating as restarted: {e:#}");
                    } else {
                        warn!(service_name = %service_name, "start_service failed, retrying once: {e:#}");
                        system_service::start_service(service_name)
                            .await
                            .with_context(|| format!("Failed to start service {}", service_name))?;
                    }
                }
            }
            _ => {
                // Supervised process: the run-manager loop relaunches it once the update flag clears.
                self.tool_run_manager
                    .run_new_tool(tool.clone())
                    .await
                    .with_context(|| {
                        format!("Failed to ensure supervision for tool: {}", tool_agent_id)
                    })?;
            }
        }

        info!("Tool {} restart triggered", tool_agent_id);
        Ok(())
    }
}
