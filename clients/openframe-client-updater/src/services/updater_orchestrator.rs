use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::time::Duration;
use tracing::{error, info, warn};

use crate::clients::AuthClient;
use crate::config::updater_config::{
    BOOT_MARKER_POLL_INTERVAL_SECS, BOOT_MARKER_WAIT_SECS, CLIENT_SERVICE_FULL_NAME,
};
use crate::listener::ClientUpdateListener;
use crate::models::UpdaterPhase;
use crate::platform::{atomic_replace, DirectoryManager};
use crate::services::last_known_good_service::LastKnownGoodService;
use crate::services::token_provider::TokenProvider;
use crate::services::{
    AgentConfigurationService, ClientUpdateService, GithubDownloadService,
    InitialConfigurationService, LocalTlsConfigProvider, NatsConnectionManager,
    NatsMessagePublisher, ServiceManagerService, UpdateProgressPublisher, UpdaterStateService,
};

pub struct UpdaterOrchestrator {
    dir_manager: DirectoryManager,
}

impl UpdaterOrchestrator {
    pub fn new(dir_manager: DirectoryManager) -> Self {
        Self { dir_manager }
    }

    pub async fn start(&self) -> Result<()> {
        let initial_config_service = InitialConfigurationService::new(&self.dir_manager)
            .context("Failed to init initial configuration service")?;

        let agent_config_service = AgentConfigurationService::new(&self.dir_manager)
            .context("Failed to init agent configuration service")?;

        let server_host = initial_config_service
            .get_server_url()
            .context("Failed to read server_host from initial_config.json")?;

        let ws_url = format!("wss://{}", server_host);

        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .danger_accept_invalid_certs(initial_config_service.is_local_mode()?)
            .no_proxy()
            .pool_max_idle_per_host(0)
            .build()
            .context("Failed to build HTTP client")?;

        // Token supply: primary is shared_token.enc written by openframe-client;
        // if the client stops refreshing it, the provider authenticates on its own
        // via client_credentials from agent_config.json (held in memory only).
        let token_file_path = self.dir_manager.secured_dir().join("shared_token.enc");
        info!(
            "Starting token provider (file: {})",
            token_file_path.display()
        );
        let auth_client = AuthClient::new(format!("https://{}", server_host), http_client.clone());
        let token =
            TokenProvider::start(token_file_path, auth_client, agent_config_service.clone());

        // Wait for the initial token before connecting to NATS. The provider
        // self-authenticates when the shared file is missing or stale, so this
        // resolves even if openframe-client is down.
        info!("Waiting for an access token to become available");
        loop {
            if token.read().await.is_some() {
                info!("Access token available");
                break;
            }
            warn!("No access token yet — retrying in 10 seconds");
            tokio::time::sleep(Duration::from_secs(10)).await;
        }

        let tls_config_provider = LocalTlsConfigProvider::new(initial_config_service.clone());

        let nats_manager = NatsConnectionManager::new(
            ws_url,
            agent_config_service.clone(),
            initial_config_service.clone(),
            token,
            tls_config_provider,
        );

        let state_service = UpdaterStateService::new(&self.dir_manager);

        nats_manager
            .connect()
            .await
            .context("Failed to connect to NATS")?;
        info!("NATS connected");

        // The updater only writes its own .log file; openframe-client tails it and ships
        // it to NATS (LogSourceKind::Updater), the same way it handles the MeshCentral
        // agent log. The updater does not run its own log-streaming pipeline.

        let nats_publisher = NatsMessagePublisher::new(nats_manager.clone());

        let machine_id = agent_config_service
            .get_machine_id()
            .await
            .context("Failed to read machine_id")?;

        let progress_publisher = UpdateProgressPublisher::new(nats_publisher, machine_id.clone());

        let lkg_service = LastKnownGoodService::new(
            &self.dir_manager,
            ServiceManagerService::client_binary_path(),
        );

        state_service.cleanup_legacy_state();
        self.recover_from_crash(&state_service, &progress_publisher, &lkg_service)
            .await?;

        progress_publisher.publish_updater_version().await;

        let download_service = GithubDownloadService::new(http_client);

        let update_service = ClientUpdateService::new(
            download_service,
            state_service,
            progress_publisher,
            lkg_service,
        );

        let listener =
            ClientUpdateListener::new(nats_manager, update_service, agent_config_service);

        info!("Updater ready — listening for update commands");
        let handle = listener.start().await;
        handle.await.ok();

        Ok(())
    }

    async fn recover_from_crash(
        &self,
        state_service: &UpdaterStateService,
        publisher: &UpdateProgressPublisher,
        lkg_service: &LastKnownGoodService,
    ) -> Result<()> {
        let state = match state_service.load() {
            Ok(None) => return Ok(()),
            Ok(Some(s)) => s,
            Err(e) => {
                // An unreadable state file must not crash-loop the service via KeepAlive —
                // drop it and start clean; the NATS message redelivers any lost update.
                warn!(
                    "Updater state file unreadable — removing it and skipping crash recovery: {:#}",
                    e
                );
                if let Err(remove_err) = std::fs::remove_file(state_service.state_file_path()) {
                    warn!("Failed to remove unreadable state file: {}", remove_err);
                }
                return Ok(());
            }
        };

        info!(
            phase = %state.phase,
            version = %state.target_version,
            "Crash recovery: found pending state"
        );

        let version = &state.target_version;
        let target = ServiceManagerService::client_binary_path();

        match state.phase {
            UpdaterPhase::Downloading | UpdaterPhase::Verifying | UpdaterPhase::Idle => {
                if let Some(path) = &state.downloaded_binary_path {
                    let p = PathBuf::from(path);
                    if p.exists() {
                        if let Err(e) = std::fs::remove_file(&p) {
                            warn!("Failed to remove temp binary during recovery: {}", e);
                        }
                    }
                }
                publisher
                    .publish_failure(
                        &UpdaterPhase::Failed,
                        version,
                        "Updater crashed before stopping service — no changes made",
                        false,
                    )
                    .await;
                state_service.clear()?;
            }

            UpdaterPhase::StoppingService | UpdaterPhase::ReplacingBinary => {
                self.restore_and_start(
                    &state.backup_path,
                    &target,
                    version,
                    publisher,
                    lkg_service,
                    false,
                )
                .await;
                state_service.clear()?;
            }

            // The boot marker was cleared before StartingService, so in these
            // phases the marker is the source of truth: only a marker carrying
            // the target version proves the new binary booted. An updater
            // restart during Observing skips the rest of the window — a
            // matching marker plus a running service is the health snapshot.
            UpdaterPhase::StartingService
            | UpdaterPhase::VerifyingBoot
            | UpdaterPhase::Observing => {
                if lkg_service.boot_marker_version().as_deref() == Some(version.as_str()) {
                    info!("Crash recovery: boot marker matches target — marking success");
                    if let Err(e) = lkg_service.promote(version) {
                        warn!(
                            "Crash recovery: failed to raise last-known-good anchor to {}: {:#}",
                            version, e
                        );
                    }
                    publisher.publish_success(version).await;
                } else {
                    if !matches!(
                        ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME),
                        Ok(true)
                    ) {
                        info!("Crash recovery: service not running — attempting start");
                        if let Err(e) = ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
                            warn!("Crash recovery: start failed: {:#}", e);
                        }
                    }
                    // Give the (possibly just-started) binary one marker window
                    // before rolling back.
                    let deadline = BOOT_MARKER_WAIT_SECS;
                    let mut elapsed = 0u64;
                    let mut verified = false;
                    while elapsed < deadline {
                        if lkg_service.boot_marker_version().as_deref() == Some(version.as_str()) {
                            verified = true;
                            break;
                        }
                        tokio::time::sleep(Duration::from_secs(BOOT_MARKER_POLL_INTERVAL_SECS))
                            .await;
                        elapsed += BOOT_MARKER_POLL_INTERVAL_SECS;
                    }

                    if verified {
                        info!("Crash recovery: boot marker matched after restart — success");
                        if let Err(e) = lkg_service.promote(version) {
                            warn!(
                                "Crash recovery: failed to raise last-known-good anchor to {}: {:#}",
                                version, e
                            );
                        }
                        publisher.publish_success(version).await;
                    } else {
                        warn!("Crash recovery: boot not verified — rolling back");
                        self.restore_and_start(
                            &state.backup_path,
                            &target,
                            version,
                            publisher,
                            lkg_service,
                            true,
                        )
                        .await;
                    }
                }
                state_service.clear()?;
            }

            UpdaterPhase::Completed
            | UpdaterPhase::Failed
            | UpdaterPhase::RollingBack
            | UpdaterPhase::RolledBack => {
                info!("Crash recovery: clearing terminal state ({})", state.phase);
                state_service.clear()?;
            }
        }

        Ok(())
    }

    async fn restore_and_start(
        &self,
        backup_path: &Option<String>,
        target: &Path,
        version: &str,
        publisher: &UpdateProgressPublisher,
        lkg_service: &LastKnownGoodService,
        prefer_reserve: bool,
    ) {
        let backup = backup_path
            .as_ref()
            .map(PathBuf::from)
            .filter(|p| p.exists());
        let reserve = lkg_service.reserve_path().to_path_buf();
        let reserve = reserve.exists().then_some(reserve);

        // Restore sources in preference order. The reserve is copied (it must
        // survive), the backup is renamed (consumed). After a failed boot the
        // reserve is the stronger choice — it verified; the backup merely ran.
        // Before the swap the backup is authoritative, and the reserve is only
        // a last resort when the client binary itself is gone.
        let mut candidates: Vec<(PathBuf, bool)> = Vec::new();
        if prefer_reserve {
            if let Some(r) = &reserve {
                candidates.push((r.clone(), true));
            }
            if let Some(b) = &backup {
                candidates.push((b.clone(), false));
            }
        } else {
            if let Some(b) = &backup {
                candidates.push((b.clone(), false));
            }
            if !target.exists() {
                if let Some(r) = &reserve {
                    candidates.push((r.clone(), true));
                }
            }
        }

        if candidates.is_empty() {
            if target.exists() {
                info!("Crash recovery: client binary intact — ensuring service is running");
                if let Err(e) = ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
                    error!("Crash recovery: failed to start service: {}", e);
                }
                publisher
                    .publish_failure(
                        &UpdaterPhase::Failed,
                        version,
                        "Updater crashed mid-update; client binary untouched",
                        false,
                    )
                    .await;
            } else {
                publisher
                    .publish_failure(
                        &UpdaterPhase::Failed,
                        version,
                        "Updater crashed mid-update, no backup or reserve available",
                        false,
                    )
                    .await;
            }
            return;
        }

        let mut restored = false;
        for (source, is_reserve) in &candidates {
            let result = if *is_reserve {
                atomic_replace::restore_copy(source, target)
            } else {
                atomic_replace::restore(source, target)
            };
            match result {
                Ok(()) => {
                    info!(
                        "Crash recovery: restored client binary from {}",
                        source.display()
                    );
                    restored = true;
                    break;
                }
                Err(e) => error!(
                    "Crash recovery: restore from {} failed: {:#}",
                    source.display(),
                    e
                ),
            }
        }

        if !restored {
            publisher
                .publish_failure(
                    &UpdaterPhase::Failed,
                    version,
                    "Updater crashed mid-update and all restore attempts failed",
                    false,
                )
                .await;
            return;
        }

        if let Err(e) = ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
            error!("Crash recovery: failed to start restored service: {}", e);
        }
        publisher
            .publish_failure(
                &UpdaterPhase::RolledBack,
                version,
                "Updater crashed mid-update, previous binary restored",
                true,
            )
            .await;
    }
}
