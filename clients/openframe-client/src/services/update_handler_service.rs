use crate::config::update_config::{CRASH_LOOP_MAX_BOOT_ATTEMPTS, UPDATER_TRANSCRIPTS_KEPT};
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::models::update_state::{UpdatePhase, UpdateState};
use crate::platform::updater_launcher::{self, UpdaterParams};
use crate::service::FULL_SERVICE_NAME;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::installed_agent_message_publisher::InstalledAgentMessagePublisher;
use crate::services::last_known_good_service::LastKnownGoodService;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::services::update_cleanup_service::UpdateCleanupService;
use crate::services::update_state_service::UpdateStateService;
use anyhow::Result;
use tracing::{info, warn};
#[derive(Clone)]
pub struct UpdateHandlerService {
    state_service: UpdateStateService,
    client_info_service: OpenFrameClientInfoService,
    cleanup_service: UpdateCleanupService,
    last_known_good_service: LastKnownGoodService,
    installed_agent_publisher: InstalledAgentMessagePublisher,
    config_service: AgentConfigurationService,
}

impl UpdateHandlerService {
    pub fn new(
        state_service: UpdateStateService,
        client_info_service: OpenFrameClientInfoService,
        cleanup_service: UpdateCleanupService,
        last_known_good_service: LastKnownGoodService,
        installed_agent_publisher: InstalledAgentMessagePublisher,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            state_service,
            client_info_service,
            cleanup_service,
            last_known_good_service,
            installed_agent_publisher,
            config_service,
        }
    }

    pub async fn record_boot_attempt(&self) -> Result<()> {
        let mut update_state = match self.state_service.load().await? {
            Some(state) => state,
            None => return Ok(()),
        };

        if !matches!(
            update_state.phase,
            UpdatePhase::UpdaterLaunched | UpdatePhase::Verifying
        ) {
            return Ok(());
        }

        if update_state.target_version == env!("OPENFRAME_VERSION") {
            info!(
                "Update state targets the running version {} — skipping crash-loop accounting",
                update_state.target_version
            );
            return Ok(());
        }

        if update_state.boot_attempts >= CRASH_LOOP_MAX_BOOT_ATTEMPTS {
            warn!(
                "Update to {} still unresolved after {} boots — treating as failed (crash-loop guard)",
                update_state.target_version, update_state.boot_attempts
            );
            let target_version = update_state.target_version.clone();
            self.handle_failure(update_state).await?;
            self.launch_reserve_rollback(&target_version).await;
            return Ok(());
        }

        update_state.boot_attempts += 1;
        self.state_service.save(&update_state).await?;
        info!(
            "Update to {} unresolved, boot attempt {}/{}",
            update_state.target_version, update_state.boot_attempts, CRASH_LOOP_MAX_BOOT_ATTEMPTS
        );
        Ok(())
    }

    async fn launch_reserve_rollback(&self, target_version: &str) {
        if !(cfg!(windows) || cfg!(target_os = "macos")) {
            info!("Reserve rollback not implemented on this platform yet");
            return;
        }

        let current_exe = match std::env::current_exe() {
            Ok(exe) => exe,
            Err(e) => {
                warn!("Cannot resolve current exe for reserve rollback: {:#}", e);
                return;
            }
        };

        let params = UpdaterParams {
            binary_path: std::path::PathBuf::new(),
            target_exe: current_exe,
            service_name: FULL_SERVICE_NAME.to_string(),
            update_state_path: self.state_service.get_state_file_path(),
            target_version: target_version.to_string(),
            boot_marker_path: self
                .last_known_good_service
                .boot_marker_path()
                .to_path_buf(),
            lkg_path: self.last_known_good_service.reserve_path().to_path_buf(),
            transcript_path: self.last_known_good_service.new_transcript_path("rollback"),
            rollback_only: true,
        };

        match updater_launcher::launch_updater(params).await {
            Ok(_) => info!("Reserve rollback launched (crash-loop guard), service will restart"),
            Err(e) => warn!("Failed to launch reserve rollback: {:#}", e),
        }
    }

    pub async fn handle_pending_update(&self) -> Result<()> {
        let update_state = match self.state_service.load().await? {
            Some(state) => state,
            None => return Ok(()),
        };

        info!(
            "Found update state: version={}, phase={:?}, boot_attempts={}",
            update_state.target_version, update_state.phase, update_state.boot_attempts
        );

        let running_version = env!("OPENFRAME_VERSION");
        if running_version == update_state.target_version {
            return self.handle_success(update_state).await;
        }

        match update_state.phase {
            UpdatePhase::UpdaterLaunched | UpdatePhase::Verifying => {
                info!(
                    "Update to {} not verified yet (running {}) — keeping state for next boot",
                    update_state.target_version, running_version
                );
                Ok(())
            }
            _ => self.handle_failure(update_state).await,
        }
    }

    async fn handle_success(&self, state: UpdateState) -> Result<()> {
        info!(
            "Update to {} succeeded (running binary matches target)",
            state.target_version
        );

        match self
            .last_known_good_service
            .promote(&state.target_version)
            .await
        {
            Ok(_) => info!("Last-known-good anchor raised to {}", state.target_version),
            Err(e) => warn!(
                "Failed to raise last-known-good anchor to {} (keeping previous anchor): {:#}",
                state.target_version, e
            ),
        }

        if let Err(e) = self
            .client_info_service
            .update_version(state.target_version.clone())
            .await
        {
            warn!("Failed to update client version bookkeeping: {:#}", e);
        }

        if let Err(e) = self
            .client_info_service
            .set_update_status(
                ClientUpdateStatus::Updated,
                Some(state.target_version.clone()),
            )
            .await
        {
            warn!("Failed to set update status to Updated: {:#}", e);
        }

        self.send_nats_notification(&state.target_version).await;

        self.cleanup_service.cleanup_all().await;
        self.last_known_good_service
            .prune_transcripts(UPDATER_TRANSCRIPTS_KEPT)
            .await;
        self.state_service.clear().await?;

        info!("Update completed, notified backend, cleaned up");
        Ok(())
    }

    async fn handle_failure(&self, state: UpdateState) -> Result<()> {
        info!(
            "Update to {} failed (phase: {:?}; binary restore is owned by the updater script)",
            state.target_version, state.phase
        );

        if let Err(e) = self
            .client_info_service
            .set_update_status(
                ClientUpdateStatus::Failed,
                Some(state.target_version.clone()),
            )
            .await
        {
            warn!("Failed to set update status to Failed: {:#}", e);
        }

        self.cleanup_service.cleanup_all().await;
        self.last_known_good_service
            .prune_transcripts(UPDATER_TRANSCRIPTS_KEPT)
            .await;
        self.state_service.clear().await?;

        info!("Update marked as failed, NATS will retry");
        Ok(())
    }

    async fn send_nats_notification(&self, version: &str) {
        match self.config_service.get_machine_id() {
            Ok(machine_id) => {
                for attempt in 1..=5 {
                    match self
                        .installed_agent_publisher
                        .publish(
                            machine_id.clone(),
                            "openframe-client".to_string(),
                            version.to_string(),
                        )
                        .await
                    {
                        Ok(_) => {
                            info!(
                                "Successfully published NATS notification for update to {}",
                                version
                            );
                            return;
                        }
                        Err(e) => {
                            if attempt < 5 {
                                warn!("Failed to publish NATS notification (attempt {}/5): {:#}. Retrying...", attempt, e);
                                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                            } else {
                                warn!(
                                    "Failed to publish NATS notification after 5 attempts: {:#}",
                                    e
                                );
                            }
                        }
                    }
                }
            }
            Err(e) => {
                warn!("Failed to get machine_id for NATS notification: {:#}", e);
            }
        }
    }
}
