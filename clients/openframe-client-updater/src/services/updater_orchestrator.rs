use anyhow::{Context, Result};
use std::path::PathBuf;
use std::time::Duration;
use tracing::{error, info, warn};

use crate::config::updater_config::{CLIENT_SERVICE_FULL_NAME, SERVICE_START_VERIFY_WAIT_SECS};
use crate::listener::ClientUpdateListener;
use crate::models::UpdaterPhase;
use crate::platform::{atomic_replace, DirectoryManager};
use crate::services::{
    AgentConfigurationService, ClientUpdateService, GithubDownloadService,
    InitialConfigurationService, LocalTlsConfigProvider, NatsConnectionManager,
    NatsMessagePublisher, ServiceManagerService, UpdateProgressPublisher, UpdaterStateService,
};
use crate::logging::log_streaming::LogStreamingRunManager;
use crate::services::token_watcher::TokenWatcher;

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

        // Start watching the shared token file written by the main openframe-client.
        // The watcher polls every 5 seconds and updates the shared state on change.
        let token_file_path = self.dir_manager.secured_dir().join("shared_token.enc");
        info!("Starting token watcher for: {}", token_file_path.display());
        let token = TokenWatcher::start(token_file_path);

        // Wait for the initial token before connecting to NATS.
        info!("Waiting for shared token to become available");
        loop {
            if token.read().await.is_some() {
                info!("Shared token available");
                break;
            }
            warn!("Shared token not yet available — retrying in 10 seconds");
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

        nats_manager.connect().await.context("Failed to connect to NATS")?;
        info!("NATS connected");

        // Start the self-contained log streaming pipeline — same pattern as meshagent:
        // the updater owns its pipeline (write → read → stream to NATS) independently.
        let log_file_path = self.dir_manager.app_support_dir()
            .join("openframe-client-updater")
            .join("openframe-client-updater.log");
        let offset_file_path = self.dir_manager.secured_dir()
            .join("updater_log_offset");

        match nats_manager.get_client().await {
            Ok(nats_client) => {
                match LogStreamingRunManager::new(
                    nats_client,
                    agent_config_service.clone(),
                    &initial_config_service,
                    log_file_path,
                    offset_file_path,
                ) {
                    Ok(manager) => {
                        manager.start();
                        info!("Log streaming started");
                    }
                    Err(e) => error!("Failed to init log streaming: {:#}", e),
                }
            }
            Err(e) => {
                error!("Failed to get NATS client for log streaming: {:#}", e);
            }
        }

        let nats_publisher = NatsMessagePublisher::new(nats_manager.clone());

        let machine_id = agent_config_service
            .get_machine_id()
            .await
            .context("Failed to read machine_id")?;

        let progress_publisher =
            UpdateProgressPublisher::new(nats_publisher, machine_id.clone());

        state_service.cleanup_legacy_state();
        self.recover_from_crash(&state_service, &progress_publisher).await?;

        progress_publisher.publish_updater_version().await;

        let download_service = GithubDownloadService::new(http_client);

        let update_service = ClientUpdateService::new(
            download_service,
            state_service,
            progress_publisher,
        );

        let listener = ClientUpdateListener::new(
            nats_manager,
            update_service,
            agent_config_service,
        );

        info!("Updater ready — listening for update commands");
        let handle = listener.start().await;
        handle.await.ok();

        Ok(())
    }

    async fn recover_from_crash(
        &self,
        state_service: &UpdaterStateService,
        publisher: &UpdateProgressPublisher,
    ) -> Result<()> {
        let state = match state_service.load()? {
            None => return Ok(()),
            Some(s) => s,
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
                self.restore_and_start(&state.backup_path, &target, version, publisher).await;
                state_service.clear()?;
            }

            UpdaterPhase::StartingService => {
                match ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
                    Ok(true) => {
                        info!("Crash recovery: service is already running — marking success");
                        publisher.publish_success(version).await;
                    }
                    _ => {
                        info!("Crash recovery: service not running — attempting start");
                        match ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
                            Ok(()) => {
                                tokio::time::sleep(Duration::from_secs(
                                    SERVICE_START_VERIFY_WAIT_SECS,
                                ))
                                .await;
                                match ServiceManagerService::is_running(CLIENT_SERVICE_FULL_NAME) {
                                    Ok(true) => {
                                        info!("Crash recovery: service started successfully");
                                        publisher.publish_success(version).await;
                                    }
                                    _ => {
                                        warn!("Crash recovery: service start failed — rolling back");
                                        self.restore_and_start(
                                            &state.backup_path,
                                            &target,
                                            version,
                                            publisher,
                                        )
                                        .await;
                                    }
                                }
                            }
                            Err(e) => {
                                warn!("Crash recovery: start failed ({}), rolling back", e);
                                self.restore_and_start(
                                    &state.backup_path,
                                    &target,
                                    version,
                                    publisher,
                                )
                                .await;
                            }
                        }
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
        target: &PathBuf,
        version: &str,
        publisher: &UpdateProgressPublisher,
    ) {
        if let Some(path_str) = backup_path {
            let backup = PathBuf::from(path_str);
            if backup.exists() {
                match atomic_replace::restore(&backup, target) {
                    Ok(()) => {
                        info!("Crash recovery: backup restored");
                        if let Err(e) = ServiceManagerService::start(CLIENT_SERVICE_FULL_NAME) {
                            error!("Crash recovery: failed to start restored service: {}", e);
                        }
                        publisher
                            .publish_failure(
                                &UpdaterPhase::RolledBack,
                                version,
                                "Updater crashed mid-update, old binary restored",
                                true,
                            )
                            .await;
                        return;
                    }
                    Err(e) => error!("Crash recovery: restore failed: {}", e),
                }
            }
        }

        publisher
            .publish_failure(
                &UpdaterPhase::Failed,
                version,
                "Updater crashed mid-update, no backup available",
                false,
            )
            .await;
    }
}
