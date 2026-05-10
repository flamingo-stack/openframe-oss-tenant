use anyhow::{anyhow, Context, Result};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::config::updater_config::{CLIENT_SERVICE_FULL_NAME, MIN_BINARY_SIZE_BYTES, SERVICE_START_VERIFY_WAIT_SECS};
use crate::models::{ClientUpdateMessage, UpdaterPhase, UpdaterState};
use crate::platform::atomic_replace;
use crate::services::{
    GithubDownloadService, UpdateProgressPublisher, UpdaterStateService,
};
use crate::services::service_manager_service::ServiceManagerService;

#[derive(Clone)]
pub struct ClientUpdateService {
    download_service: GithubDownloadService,
    state_service: UpdaterStateService,
    progress_publisher: UpdateProgressPublisher,
    in_progress: Arc<Mutex<bool>>,
}

impl ClientUpdateService {
    pub fn new(
        download_service: GithubDownloadService,
        state_service: UpdaterStateService,
        progress_publisher: UpdateProgressPublisher,
    ) -> Self {
        Self {
            download_service,
            state_service,
            progress_publisher,
            in_progress: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn process_update(&self, msg: ClientUpdateMessage) -> Result<()> {
        let mut guard = self.in_progress.lock().await;
        if *guard {
            warn!("Update already in progress, ignoring message for v{}", msg.version);
            return Ok(());
        }
        *guard = true;
        drop(guard);

        let result = self.run_update(&msg).await;

        *self.in_progress.lock().await = false;

        result
    }

    async fn run_update(&self, msg: &ClientUpdateMessage) -> Result<()> {
        let version = &msg.version;
        info!("Starting update to v{}", version);

        if semver::Version::parse(version.trim_start_matches('v')).is_err() {
            let reason = format!("Invalid version string: '{}'", version);
            error!("{}", reason);
            self.progress_publisher
                .publish_failure(&UpdaterPhase::Failed, version, &reason, false)
                .await;
            return Err(anyhow!(reason));
        }

        let config = self
            .download_service
            .find_for_current_os(&msg.download_configurations)
            .with_context(|| format!("No download config for current OS (v{})", version))?;

        let mut state = UpdaterState::new(version.clone());

        self.state_service.transition(&mut state, UpdaterPhase::Downloading)?;
        self.progress_publisher.publish(&UpdaterPhase::Downloading, version).await;

        let binary_bytes = match self.download_service.download_and_extract(config).await {
            Ok(bytes) => bytes,
            Err(e) => {
                let reason = format!("Download failed: {:#}", e);
                error!("{}", reason);
                self.fail(&mut state, version, &reason, false).await;
                return Err(anyhow!(reason));
            }
        };

        self.state_service.transition(&mut state, UpdaterPhase::Verifying)?;
        self.progress_publisher.publish(&UpdaterPhase::Verifying, version).await;

        if binary_bytes.len() < MIN_BINARY_SIZE_BYTES as usize {
            let reason = format!(
                "Binary too small ({} bytes, minimum {})",
                binary_bytes.len(), MIN_BINARY_SIZE_BYTES
            );
            error!("{}", reason);
            self.fail(&mut state, version, &reason, false).await;
            return Err(anyhow!(reason));
        }

        let target = ServiceManagerService::client_binary_path();
        let temp_path = match atomic_replace::write_temp(&binary_bytes, &target) {
            Ok(p) => p,
            Err(e) => {
                let reason = format!("Failed to write temp binary: {:#}", e);
                error!("{}", reason);
                self.fail(&mut state, version, &reason, false).await;
                return Err(anyhow!(reason));
            }
        };
        state.downloaded_binary_path = Some(temp_path.to_string_lossy().to_string());
        self.state_service.save(&state)?;

        self.state_service.transition(&mut state, UpdaterPhase::StoppingService)?;
        self.progress_publisher.publish(&UpdaterPhase::StoppingService, version).await;

        if let Err(e) = ServiceManagerService::stop(CLIENT_SERVICE_FULL_NAME) {
            let reason = format!("Failed to stop service: {:#}", e);
            error!("{}", reason);
            self.cleanup_temp(&temp_path);
            self.fail(&mut state, version, &reason, false).await;
            return Err(anyhow!(reason));
        }

        self.state_service.transition(&mut state, UpdaterPhase::ReplacingBinary)?;
        self.progress_publisher.publish(&UpdaterPhase::ReplacingBinary, version).await;

        let backup_path = match atomic_replace::replace(&target, &temp_path) {
            Ok(p) => p,
            Err(e) => {
                let reason = format!("Binary replacement failed: {:#}", e);
                error!("{}", reason);
                self.try_start_service(version, false).await;
                self.fail(&mut state, version, &reason, true).await;
                return Err(anyhow!(reason));
            }
        };
        state.backup_path = Some(backup_path.to_string_lossy().to_string());
        self.state_service.save(&state)?;

        self.state_service.transition(&mut state, UpdaterPhase::StartingService)?;
        self.progress_publisher.publish(&UpdaterPhase::StartingService, version).await;

        if let Err(e) = ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
            let reason = format!("Failed to start new service: {:#}", e);
            error!("{}", reason);
            return self.rollback(&mut state, &target, &backup_path, version, &reason).await;
        }

        info!("Waiting {}s before verifying service state", SERVICE_START_VERIFY_WAIT_SECS);
        tokio::time::sleep(tokio::time::Duration::from_secs(SERVICE_START_VERIFY_WAIT_SECS)).await;

        match ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
            Ok(true) => {
                info!("Service is running — update completed");
            }
            Ok(false) => {
                let reason = "Service is not running after start".to_string();
                error!("{}", reason);
                return self.rollback(&mut state, &target, &backup_path, version, &reason).await;
            }
            Err(e) => {
                let reason = format!("Failed to check service state: {:#}", e);
                error!("{}", reason);
                return self.rollback(&mut state, &target, &backup_path, version, &reason).await;
            }
        }

        self.state_service.transition(&mut state, UpdaterPhase::Completed)?;
        self.progress_publisher.publish_success(version).await;

        if let Err(e) = std::fs::remove_file(&backup_path) {
            warn!("Failed to remove backup file {}: {}", backup_path.display(), e);
        }

        self.state_service.clear()?;
        info!("Update to v{} completed", version);
        Ok(())
    }

    async fn rollback(
        &self,
        state: &mut UpdaterState,
        target: &PathBuf,
        backup_path: &PathBuf,
        version: &str,
        reason: &str,
    ) -> Result<()> {
        warn!("Rolling back update to v{}: {}", version, reason);

        self.state_service.transition(state, UpdaterPhase::RollingBack)?;
        self.progress_publisher.publish(&UpdaterPhase::RollingBack, version).await;

        if let Err(e) = atomic_replace::restore(backup_path, target) {
            let full_reason = format!("{} — rollback also failed: {:#}", reason, e);
            error!("{}", full_reason);
            self.fail(state, version, &full_reason, false).await;
            return Err(anyhow!(full_reason));
        }

        self.try_start_service(version, true).await;

        self.state_service.transition(state, UpdaterPhase::RolledBack)?;
        self.progress_publisher
            .publish_failure(&UpdaterPhase::RolledBack, version, reason, true)
            .await;

        self.state_service.clear()?;
        Err(anyhow!("Update failed and was rolled back: {}", reason))
    }

    async fn try_start_service(&self, version: &str, after_rollback: bool) {
        if let Err(e) = ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
            let ctx = if after_rollback { "after rollback" } else { "after failed replace" };
            error!("Failed to restart service {}: {:#}", ctx, e);
            self.progress_publisher
                .publish_failure(
                    &UpdaterPhase::Failed,
                    version,
                    &format!("Service restart failed {}: {:#}", ctx, e),
                    after_rollback,
                )
                .await;
        }
    }

    async fn fail(
        &self,
        state: &mut UpdaterState,
        version: &str,
        reason: &str,
        rolled_back: bool,
    ) {
        state.failure_reason = Some(reason.to_string());
        if let Err(e) = self.state_service.transition(state, UpdaterPhase::Failed) {
            warn!("Failed to persist Failed state: {}", e);
        }
        self.progress_publisher
            .publish_failure(&UpdaterPhase::Failed, version, reason, rolled_back)
            .await;
        let _ = self.state_service.clear();
    }

    fn cleanup_temp(&self, temp_path: &PathBuf) {
        if temp_path.exists() {
            if let Err(e) = std::fs::remove_file(temp_path) {
                warn!("Failed to clean up temp file {}: {}", temp_path.display(), e);
            }
        }
    }
}
