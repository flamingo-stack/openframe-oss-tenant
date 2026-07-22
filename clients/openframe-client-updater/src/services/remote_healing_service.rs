use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use tracing::{info, warn};

use crate::config::updater_config::{
    CLIENT_SERVICE_FULL_NAME, SERVICE_START_SETTLE_SECS, UPDATER_VERSION,
};
use crate::models::{HealingMessage, HealingResult};
use crate::platform::atomic_replace;
use crate::services::last_known_good_service::LastKnownGoodService;
use crate::services::service_manager_service::ServiceManagerService;
use crate::services::updater_state_service::UpdaterStateService;

/// Executes allowlisted healing actions. Actions that touch the client service
/// share the update-in-progress flag with `ClientUpdateService`, so healing and
/// updating can never fight over the service or the binary.
#[derive(Clone)]
pub struct RemoteHealingService {
    lkg_service: LastKnownGoodService,
    state_service: UpdaterStateService,
    update_in_progress: Arc<Mutex<bool>>,
}

impl RemoteHealingService {
    pub fn new(
        lkg_service: LastKnownGoodService,
        state_service: UpdaterStateService,
        update_in_progress: Arc<Mutex<bool>>,
    ) -> Self {
        Self {
            lkg_service,
            state_service,
            update_in_progress,
        }
    }

    pub async fn execute(&self, msg: &HealingMessage, machine_id: &str) -> HealingResult {
        let start = Instant::now();
        info!(
            action = %msg.action,
            execution_id = %msg.execution_id,
            "Healing action requested"
        );

        let outcome = match msg.action.as_str() {
            "ping" => Ok(format!("openframe-client-updater {}", UPDATER_VERSION)),
            "restart-client" => self.guarded(Self::restart_client).await,
            "rollback-client" => self.guarded(Self::rollback_client).await,
            "clear-update-state" => self.clear_update_state(),
            other => Err(format!(
                "Unknown healing action '{}' — allowed: ping, restart-client, rollback-client, clear-update-state",
                other
            )),
        };

        let (success, message) = match outcome {
            Ok(m) => (true, m),
            Err(m) => {
                warn!(action = %msg.action, "Healing action failed: {}", m);
                (false, m)
            }
        };

        HealingResult {
            execution_id: msg.execution_id.clone(),
            machine_id: machine_id.to_string(),
            action: msg.action.clone(),
            success,
            message,
            execution_time_ms: start.elapsed().as_millis() as u64,
        }
    }

    /// Run a service-touching action under the shared update flag; reject
    /// instead of queueing when an update is mid-flight (the caller can retry).
    /// The action itself makes blocking OS service-manager calls, so it runs
    /// on the blocking pool.
    async fn guarded(&self, action: fn(&Self) -> Result<String, String>) -> Result<String, String> {
        let mut guard = self.update_in_progress.lock().await;
        if *guard {
            return Err("A client update is in progress — retry after it completes".to_string());
        }
        *guard = true;
        drop(guard);

        let this = self.clone();
        let result = tokio::task::spawn_blocking(move || action(&this))
            .await
            .unwrap_or_else(|e| Err(format!("Healing action panicked: {}", e)));

        *self.update_in_progress.lock().await = false;
        result
    }

    fn restart_client(&self) -> Result<String, String> {
        if let Ok(true) = ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
            ServiceManagerService::stop(CLIENT_SERVICE_FULL_NAME)
                .map_err(|e| format!("Failed to stop client service: {:#}", e))?;
        }
        ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME)
            .map_err(|e| format!("Failed to start client service: {:#}", e))?;

        std::thread::sleep(std::time::Duration::from_secs(SERVICE_START_SETTLE_SECS));
        match ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
            Ok(true) => Ok("Client service restarted and running".to_string()),
            Ok(false) => Err("Client service did not stay running after restart".to_string()),
            Err(e) => Err(format!("Failed to verify client service state: {:#}", e)),
        }
    }

    fn rollback_client(&self) -> Result<String, String> {
        let reserve = self.lkg_service.reserve_path();
        if !reserve.exists() {
            return Err("No last-known-good reserve available on this machine".to_string());
        }
        let anchor = self
            .lkg_service
            .load_anchor()
            .ok()
            .flatten()
            .unwrap_or_else(|| "unknown".to_string());

        if let Ok(true) = ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
            ServiceManagerService::stop(CLIENT_SERVICE_FULL_NAME)
                .map_err(|e| format!("Failed to stop client service: {:#}", e))?;
        }

        let target = ServiceManagerService::client_binary_path();
        atomic_replace::restore_copy(reserve, &target)
            .map_err(|e| format!("Failed to restore reserve: {:#}", e))?;

        ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME)
            .map_err(|e| format!("Restored binary but failed to start service: {:#}", e))?;

        std::thread::sleep(std::time::Duration::from_secs(SERVICE_START_SETTLE_SECS));
        match ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
            Ok(true) => Ok(format!(
                "Client rolled back to last-known-good {} and running",
                anchor
            )),
            _ => Err(format!(
                "Client rolled back to last-known-good {} but service is not running",
                anchor
            )),
        }
    }

    fn clear_update_state(&self) -> Result<String, String> {
        self.state_service
            .clear()
            .map_err(|e| format!("Failed to clear updater state: {:#}", e))?;

        // Sweep leftover swap artifacts next to the client binary.
        let target = ServiceManagerService::client_binary_path();
        let mut swept = 0u32;
        if let Some(dir) = target.parent() {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    let is_leftover = (name.starts_with(".openframe-client-update-")
                        && name.ends_with(".tmp"))
                        || name.contains(".backup.");
                    if is_leftover && std::fs::remove_file(entry.path()).is_ok() {
                        swept += 1;
                    }
                }
            }
        }
        Ok(format!(
            "Updater state cleared, {} leftover file(s) swept",
            swept
        ))
    }
}
