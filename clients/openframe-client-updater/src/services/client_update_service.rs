use anyhow::{anyhow, Result};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::config::updater_config::{
    ALLOW_DOWNGRADE, BOOT_MARKER_POLL_INTERVAL_SECS, BOOT_MARKER_WAIT_SECS,
    CLIENT_SERVICE_FULL_NAME, MIN_BINARY_SIZE_BYTES, OBSERVATION_MAX_CLIENT_RESTARTS,
    POST_BOOT_OBSERVATION_SECS, POST_BOOT_POLL_INTERVAL_SECS, ROLLBACK_RESTORE_ATTEMPTS,
    ROLLBACK_RESTORE_RETRY_DELAY_SECS, SERVICE_START_SETTLE_SECS,
};
use crate::models::{ClientUpdateMessage, UpdaterPhase, UpdaterState};
use crate::platform::atomic_replace;
use crate::services::last_known_good_service::LastKnownGoodService;
use crate::services::service_manager_service::ServiceManagerService;
use crate::services::{GithubDownloadService, UpdateProgressPublisher, UpdaterStateService};

#[derive(Clone)]
pub struct ClientUpdateService {
    download_service: GithubDownloadService,
    state_service: UpdaterStateService,
    progress_publisher: UpdateProgressPublisher,
    lkg_service: LastKnownGoodService,
    in_progress: Arc<Mutex<bool>>,
    /// Bumped at the start of every update; a running observation task exits
    /// silently when it sees a newer generation (superseded by a new update).
    generation: Arc<AtomicU64>,
}

impl ClientUpdateService {
    pub fn new(
        download_service: GithubDownloadService,
        state_service: UpdaterStateService,
        progress_publisher: UpdateProgressPublisher,
        lkg_service: LastKnownGoodService,
    ) -> Self {
        Self {
            download_service,
            state_service,
            progress_publisher,
            lkg_service,
            in_progress: Arc::new(Mutex::new(false)),
            generation: Arc::new(AtomicU64::new(0)),
        }
    }

    pub async fn process_update(&self, msg: ClientUpdateMessage) -> Result<()> {
        let mut guard = self.in_progress.lock().await;
        if *guard {
            // Only an observation-rollback holds the slot here (the listener is
            // sequential); an ACK would silently consume a genuinely new update.
            warn!(
                "Update already in progress — leaving message for v{} unacked for redelivery",
                msg.version
            );
            return Err(anyhow!(
                "update already in progress, deferring v{} to redelivery",
                msg.version
            ));
        }
        *guard = true;
        drop(guard);

        let result = self.run_update(&msg).await;

        *self.in_progress.lock().await = false;

        result
    }

    async fn run_update(&self, msg: &ClientUpdateMessage) -> Result<()> {
        let requested_semver = match semver::Version::parse(msg.version.trim_start_matches('v')) {
            Ok(v) => v,
            Err(_) => {
                let reason = format!("Invalid version string: '{}'", msg.version);
                error!("{}", reason);
                self.progress_publisher
                    .publish_failure(&UpdaterPhase::Failed, &msg.version, &reason, false)
                    .await;
                // Ok → ACK: a malformed version never becomes valid on redelivery.
                return Ok(());
            }
        };
        let canonical_version = requested_semver.to_string();
        let version = &canonical_version;
        info!("Starting update to v{}", version);

        // The boot marker holds the version the client last booted with — the
        // updater's only view of the running client version.
        if self
            .lkg_service
            .boot_marker_version()
            .map(|m| Self::versions_match(&m, version))
            .unwrap_or(false)
        {
            info!(
                "Client already booted with version {}, ignoring update request",
                version
            );
            return Ok(());
        }

        // An explicit rollback is allowed below the anchor — that's its point.
        if !ALLOW_DOWNGRADE && !msg.rollback {
            match self.lkg_service.load_anchor() {
                Ok(Some(anchor)) => match semver::Version::parse(anchor.trim_start_matches('v')) {
                    Ok(anchor_semver) if requested_semver < anchor_semver => {
                        let reason = format!(
                            "Refusing downgrade to {} — last-known-good anchored at {}",
                            version, anchor
                        );
                        warn!("{}", reason);
                        self.progress_publisher
                            .publish_failure(&UpdaterPhase::Failed, version, &reason, false)
                            .await;
                        // Ok → ACK: redelivering a refused downgrade changes nothing.
                        return Ok(());
                    }
                    Ok(_) => {}
                    Err(e) => warn!(
                        "Failed to parse last-known-good anchor '{}': {:#}",
                        anchor, e
                    ),
                },
                Ok(None) => {}
                Err(e) => warn!(
                    "Failed to load last-known-good anchor, skipping downgrade guard: {:#}",
                    e
                ),
            }
        }

        // Bumped after the guards: a redelivered duplicate must not cancel the
        // observation task of the update it duplicates.
        self.generation.fetch_add(1, Ordering::SeqCst);

        let mut state = UpdaterState::new(version.clone());

        // A rollback whose target matches the local reserve restores from disk
        // — no download, so it works even when the machine can't reach GitHub.
        let anchor_matches_target = matches!(
            self.lkg_service.load_anchor(),
            Ok(Some(ref anchor))
                if semver::Version::parse(anchor.trim_start_matches('v'))
                    .map(|a| a == requested_semver)
                    .unwrap_or(false)
        );
        let restore_from_reserve =
            msg.rollback && anchor_matches_target && self.lkg_service.reserve_path().exists();

        let binary_bytes = if restore_from_reserve {
            info!(
                "Rollback to v{}: restoring from local last-known-good reserve (no download)",
                version
            );
            match std::fs::read(self.lkg_service.reserve_path()) {
                Ok(bytes) => bytes::Bytes::from(bytes),
                Err(e) => {
                    let reason = format!("Failed to read last-known-good reserve: {:#}", e);
                    error!("{}", reason);
                    self.fail(&mut state, version, &reason, false).await;
                    return Err(anyhow!(reason));
                }
            }
        } else {
            let config = match self
                .download_service
                .find_for_current_os(&msg.download_configurations)
            {
                Ok(c) => c,
                Err(e) => {
                    let reason =
                        format!("No download config for current OS (v{}): {:#}", version, e);
                    error!("{}", reason);
                    self.fail(&mut state, version, &reason, false).await;
                    // Ok → ACK: a message with no artifact for this OS never becomes valid.
                    return Ok(());
                }
            };

            self.state_service
                .transition(&mut state, UpdaterPhase::Downloading)?;
            self.progress_publisher
                .publish(&UpdaterPhase::Downloading, version)
                .await;

            match self.download_service.download_and_extract(config).await {
                Ok(bytes) => bytes,
                Err(e) => {
                    let reason = format!("Download failed: {:#}", e);
                    error!("{}", reason);
                    self.fail(&mut state, version, &reason, false).await;
                    return Err(anyhow!(reason));
                }
            }
        };

        self.state_service
            .transition(&mut state, UpdaterPhase::Verifying)?;
        self.progress_publisher
            .publish(&UpdaterPhase::Verifying, version)
            .await;

        if binary_bytes.len() < MIN_BINARY_SIZE_BYTES as usize {
            let reason = format!(
                "Binary too small ({} bytes, minimum {})",
                binary_bytes.len(),
                MIN_BINARY_SIZE_BYTES
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

        self.state_service
            .transition(&mut state, UpdaterPhase::StoppingService)?;
        self.progress_publisher
            .publish(&UpdaterPhase::StoppingService, version)
            .await;

        if let Err(e) = ServiceManagerService::stop_async(CLIENT_SERVICE_FULL_NAME).await {
            let reason = format!("Failed to stop service: {:#}", e);
            error!("{}", reason);
            self.cleanup_temp(&temp_path);
            self.fail(&mut state, version, &reason, false).await;
            return Err(anyhow!(reason));
        }

        // Point of no return: from here a state-persistence failure must not abort
        // the swap — the file only drives crash recovery, while aborting strands a
        // stopped client. The backup path is persisted before the binary is
        // touched, so recovery knows where the previous binary went even if the
        // swap never returns.
        let backup_path = atomic_replace::backup_path_for(&target);
        state.backup_path = Some(backup_path.to_string_lossy().to_string());
        self.transition_best_effort(&mut state, UpdaterPhase::ReplacingBinary);
        self.progress_publisher
            .publish(&UpdaterPhase::ReplacingBinary, version)
            .await;

        if let Err(e) = atomic_replace::replace(&target, &temp_path, &backup_path) {
            let reason = format!("Binary replacement failed: {:#}", e);
            error!("{}", reason);
            if target.exists() {
                self.try_start_service(version, false).await;
                self.fail(&mut state, version, &reason, true).await;
            } else {
                // Half-swapped: keep the state file (it holds the backup path
                // crash recovery needs) and leave the message unacked.
                self.progress_publisher
                    .publish_failure(&UpdaterPhase::Failed, version, &reason, false)
                    .await;
            }
            return Err(anyhow!(reason));
        }

        // Stale markers must go before the new binary starts: the verification
        // below treats any marker that doesn't match the target as a failure.
        if let Err(e) = self.lkg_service.clear_boot_marker() {
            let reason = format!("Failed to clear boot marker before start: {:#}", e);
            error!("{}", reason);
            return self
                .rollback(&mut state, &target, &backup_path, version, &reason)
                .await;
        }

        self.transition_best_effort(&mut state, UpdaterPhase::StartingService);
        self.progress_publisher
            .publish(&UpdaterPhase::StartingService, version)
            .await;

        if let Err(e) = ServiceManagerService::start_async(CLIENT_SERVICE_FULL_NAME).await {
            let reason = format!("Failed to start new service: {:#}", e);
            error!("{}", reason);
            return self
                .rollback(&mut state, &target, &backup_path, version, &reason)
                .await;
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(SERVICE_START_SETTLE_SECS)).await;

        match ServiceManagerService::is_running_async(CLIENT_SERVICE_FULL_NAME).await {
            Ok(true) => {}
            Ok(false) => {
                let reason = "Service is not running after start".to_string();
                error!("{}", reason);
                return self
                    .rollback(&mut state, &target, &backup_path, version, &reason)
                    .await;
            }
            Err(e) => {
                let reason = format!("Failed to check service state: {:#}", e);
                error!("{}", reason);
                return self
                    .rollback(&mut state, &target, &backup_path, version, &reason)
                    .await;
            }
        }

        self.transition_best_effort(&mut state, UpdaterPhase::VerifyingBoot);
        self.progress_publisher
            .publish(&UpdaterPhase::VerifyingBoot, version)
            .await;

        if let Err(reason) = self.wait_for_boot_marker(version).await {
            error!("{}", reason);
            return self
                .rollback(&mut state, &target, &backup_path, version, &reason)
                .await;
        }

        // Boot verified — report success (the NATS message ACKs when this
        // returns), then keep watching the client before promoting the anchor.
        // A client that dies or crash-loops after a good boot is rolled back
        // automatically; deferring the promotion also means a backend-pushed
        // downgrade to the previous version is never blocked by the bad build.
        self.transition_best_effort(&mut state, UpdaterPhase::Observing);
        self.progress_publisher.publish_success(version).await;

        self.spawn_observation(state, target, backup_path);

        info!(
            "Update to v{} boot-verified — observing for {}s before anchor promotion",
            version, POST_BOOT_OBSERVATION_SECS
        );
        Ok(())
    }

    fn spawn_observation(&self, state: UpdaterState, target: PathBuf, backup_path: PathBuf) {
        let service = self.clone();
        let my_generation = self.generation.load(Ordering::SeqCst);
        tokio::spawn(async move {
            service
                .observe_and_finalize(state, target, backup_path, my_generation)
                .await;
        });
    }

    /// Watch the freshly updated client for the observation window. Healthy →
    /// promote the anchor and clean up. Service gone or crash-looping (boot
    /// marker rewrites) → automatic rollback to the last known-good binary.
    async fn observe_and_finalize(
        &self,
        mut state: UpdaterState,
        target: PathBuf,
        backup_path: PathBuf,
        my_generation: u64,
    ) {
        let version = state.target_version.clone();
        let mut restarts = 0u32;
        let mut last_marker_mtime = self.lkg_service.boot_marker_mtime();
        let mut elapsed = 0u64;
        let mut failure: Option<String> = None;

        while elapsed < POST_BOOT_OBSERVATION_SECS {
            tokio::time::sleep(tokio::time::Duration::from_secs(
                POST_BOOT_POLL_INTERVAL_SECS,
            ))
            .await;
            elapsed += POST_BOOT_POLL_INTERVAL_SECS;

            if self.generation.load(Ordering::SeqCst) != my_generation {
                info!(
                    "Observation of v{} superseded by a newer update — stopping",
                    version
                );
                return;
            }

            match ServiceManagerService::is_running_async(CLIENT_SERVICE_FULL_NAME).await {
                Ok(true) => {}
                Ok(false) => {
                    failure = Some(format!(
                        "Client service stopped {}s after update to {}",
                        elapsed, version
                    ));
                    break;
                }
                Err(e) => warn!("Observation: failed to query service state: {:#}", e),
            }

            let marker_mtime = self.lkg_service.boot_marker_mtime();
            if marker_mtime != last_marker_mtime {
                last_marker_mtime = marker_mtime;
                restarts += 1;
                warn!(
                    "Observation: client restarted ({}/{} tolerated)",
                    restarts, OBSERVATION_MAX_CLIENT_RESTARTS
                );
                if restarts >= OBSERVATION_MAX_CLIENT_RESTARTS {
                    failure = Some(format!(
                        "Client crash-looped after update to {} ({} restarts within {}s)",
                        version, restarts, elapsed
                    ));
                    break;
                }
            }
        }

        if self.generation.load(Ordering::SeqCst) != my_generation {
            info!(
                "Observation of v{} superseded by a newer update — stopping",
                version
            );
            return;
        }

        match failure {
            None => {
                if let Err(e) = self.lkg_service.promote(&version) {
                    warn!(
                        "Failed to raise last-known-good anchor to {} (keeping previous anchor): {:#}",
                        version, e
                    );
                }
                if backup_path.exists() {
                    if let Err(e) = std::fs::remove_file(&backup_path) {
                        warn!(
                            "Failed to remove backup file {}: {}",
                            backup_path.display(),
                            e
                        );
                    }
                }
                if let Err(e) = self.state_service.clear() {
                    warn!("Failed to clear updater state after observation: {}", e);
                }
                info!(
                    "Update to v{} completed — anchor promoted after {}s observation",
                    version, POST_BOOT_OBSERVATION_SECS
                );
            }
            Some(reason) => {
                // Take the update slot before rolling back so a concurrently arriving
                // CLIENT_UPDATE can't interleave its own swap with this restore; if a
                // newer update already claimed it, that update owns the binary now.
                let mut guard = self.in_progress.lock().await;
                if *guard || self.generation.load(Ordering::SeqCst) != my_generation {
                    info!(
                        "Observation rollback of v{} superseded by a newer update — skipping",
                        version
                    );
                    return;
                }
                *guard = true;
                drop(guard);

                error!("{} — rolling back automatically", reason);
                let _ = self
                    .rollback(&mut state, &target, &backup_path, &version, &reason)
                    .await;

                *self.in_progress.lock().await = false;
            }
        }
    }

    /// Wait for the new client binary to write a boot marker with the target
    /// version. A marker carrying a different version means the wrong binary
    /// booted — fail immediately instead of waiting out the window.
    async fn wait_for_boot_marker(&self, version: &str) -> std::result::Result<(), String> {
        info!(
            "Waiting up to {}s for boot marker with version {}",
            BOOT_MARKER_WAIT_SECS, version
        );

        let mut elapsed = 0u64;
        while elapsed < BOOT_MARKER_WAIT_SECS {
            match self.lkg_service.boot_marker_version() {
                Some(marker) if Self::versions_match(&marker, version) => {
                    info!("Boot marker matched target version {}", version);
                    return Ok(());
                }
                Some(marker) => {
                    return Err(format!(
                        "Boot marker reports '{}', expected '{}' — wrong binary booted",
                        marker, version
                    ));
                }
                None => {}
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(
                BOOT_MARKER_POLL_INTERVAL_SECS,
            ))
            .await;
            elapsed += BOOT_MARKER_POLL_INTERVAL_SECS;
        }

        Err(format!(
            "New binary did not report target version '{}' within {}s",
            version, BOOT_MARKER_WAIT_SECS
        ))
    }

    async fn rollback(
        &self,
        state: &mut UpdaterState,
        target: &Path,
        backup_path: &Path,
        version: &str,
        reason: &str,
    ) -> Result<()> {
        warn!("Rolling back update to v{}: {}", version, reason);

        self.transition_best_effort(state, UpdaterPhase::RollingBack);
        self.progress_publisher
            .publish(&UpdaterPhase::RollingBack, version)
            .await;

        // The service may still be running the bad binary (e.g. it booted but
        // reported the wrong version) — stop it before touching the file.
        if let Ok(true) = ServiceManagerService::is_running_async(CLIENT_SERVICE_FULL_NAME).await {
            if let Err(e) = ServiceManagerService::stop_async(CLIENT_SERVICE_FULL_NAME).await {
                warn!("Failed to stop service before rollback restore: {:#}", e);
            }
        }

        // Prefer the last-known-good reserve over the pre-swap backup: the
        // backup is merely what ran before, the reserve is what verified.
        // The reserve is copied (it must survive); the backup is renamed.
        let reserve = self.lkg_service.reserve_path();
        let use_reserve = reserve.exists();
        let restore_source: &Path = if use_reserve { reserve } else { backup_path };

        let mut restored = false;
        for attempt in 1..=ROLLBACK_RESTORE_ATTEMPTS {
            let result = if use_reserve {
                atomic_replace::restore_copy(restore_source, target)
            } else {
                atomic_replace::restore(restore_source, target)
            };
            match result {
                Ok(()) => {
                    info!(
                        "Rollback restored client binary from {}",
                        restore_source.display()
                    );
                    restored = true;
                    break;
                }
                Err(e) => {
                    warn!(
                        "Restore attempt {}/{} failed: {:#}",
                        attempt, ROLLBACK_RESTORE_ATTEMPTS, e
                    );
                    tokio::time::sleep(tokio::time::Duration::from_secs(
                        ROLLBACK_RESTORE_RETRY_DELAY_SECS,
                    ))
                    .await;
                }
            }
        }

        if restored && use_reserve && backup_path.exists() {
            if let Err(e) = std::fs::remove_file(backup_path) {
                warn!(
                    "Failed to remove leftover backup {}: {}",
                    backup_path.display(),
                    e
                );
            }
        }

        if !restored {
            let full_reason = format!(
                "{} — rollback also failed: all restore attempts failed",
                reason
            );
            error!("{}", full_reason);
            self.fail(state, version, &full_reason, false).await;
            return Err(anyhow!(full_reason));
        }

        self.try_start_service(version, true).await;

        self.transition_best_effort(state, UpdaterPhase::RolledBack);
        self.progress_publisher
            .publish_failure(&UpdaterPhase::RolledBack, version, reason, true)
            .await;

        if let Err(e) = self.state_service.clear() {
            warn!("Failed to clear updater state after rollback: {:#}", e);
        }
        Err(anyhow!("Update failed and was rolled back: {}", reason))
    }

    async fn try_start_service(&self, version: &str, after_rollback: bool) {
        if let Err(e) = ServiceManagerService::start_async(CLIENT_SERVICE_FULL_NAME).await {
            let ctx = if after_rollback {
                "after rollback"
            } else {
                "after failed replace"
            };
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

    /// Boot-marker versions come from the client's build env, requested versions
    /// from the backend — compare semver-first so cosmetic differences (leading
    /// 'v', metadata formatting) never read as a wrong-binary boot.
    fn versions_match(marker: &str, requested: &str) -> bool {
        match (
            semver::Version::parse(marker.trim_start_matches('v')),
            semver::Version::parse(requested.trim_start_matches('v')),
        ) {
            (Ok(m), Ok(r)) => m == r,
            _ => marker == requested,
        }
    }

    /// Past the point of no return a state-persistence failure must not abort
    /// the swap: the file only drives crash recovery, while aborting strands a
    /// stopped client. Log and continue.
    fn transition_best_effort(&self, state: &mut UpdaterState, phase: UpdaterPhase) {
        let label = phase.to_string();
        if let Err(e) = self.state_service.transition(state, phase) {
            warn!("Failed to persist {} state (continuing): {:#}", label, e);
        }
    }

    async fn fail(&self, state: &mut UpdaterState, version: &str, reason: &str, rolled_back: bool) {
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
                warn!(
                    "Failed to clean up temp file {}: {}",
                    temp_path.display(),
                    e
                );
            }
        }
    }
}

#[cfg(test)]
#[path = "client_update_service_tests.rs"]
mod tests;
