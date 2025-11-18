use anyhow::{Context, Result};
use tracing::{info, warn};
use crate::models::update_state::{UpdateState, UpdatePhase};
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::services::update_state_service::UpdateStateService;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::services::update_cleanup_service::UpdateCleanupService;
use crate::services::installed_agent_message_publisher::InstalledAgentMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
#[derive(Clone)]
pub struct UpdateHandlerService {
    state_service: UpdateStateService,
    client_info_service: OpenFrameClientInfoService,
    cleanup_service: UpdateCleanupService,
    installed_agent_publisher: InstalledAgentMessagePublisher,
    config_service: AgentConfigurationService,
}

impl UpdateHandlerService {
    pub fn new(
        state_service: UpdateStateService,
        client_info_service: OpenFrameClientInfoService,
        cleanup_service: UpdateCleanupService,
        installed_agent_publisher: InstalledAgentMessagePublisher,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            state_service,
            client_info_service,
            cleanup_service,
            installed_agent_publisher,
            config_service,
        }
    }

    pub async fn handle_pending_update(&self) -> Result<()> {
        let update_state = match self.state_service.load().await? {
            Some(state) => state,
            None => return Ok(()), 
        };

        info!("Found update state: version={}, phase={:?}", update_state.target_version, update_state.phase);

        let update_succeeded = if update_state.phase == UpdatePhase::Completed {
            true
        } else {
            let client_info = self.client_info_service.get().await?;
            client_info.current_version == update_state.target_version
        };

        if update_succeeded {
            self.handle_success(update_state).await
        } else {
            self.handle_failure(update_state).await
        }
    }

    async fn handle_success(&self, state: UpdateState) -> Result<()> {
        info!("Update to {} succeeded", state.target_version);

        self.client_info_service
            .update_version(state.target_version.clone())
            .await
            .context("Failed to update client version")?;

        self.client_info_service
            .set_update_status(ClientUpdateStatus::Updated, Some(state.target_version.clone()))
            .await
            .context("Failed to set update status")?;

        self.send_nats_notification(&state.target_version).await;

        self.cleanup_service.cleanup_all().await;
        self.state_service.clear().await?;

        info!("Update completed, notified backend, cleaned up");
        Ok(())
    }

    async fn handle_failure(&self, state: UpdateState) -> Result<()> {
        info!("Update to {} failed (PowerShell rollback done)", state.target_version);

        self.client_info_service
            .set_update_status(ClientUpdateStatus::Failed, Some(state.target_version.clone()))
            .await
            .context("Failed to set update status")?;

        self.cleanup_service.cleanup_all().await;
        self.state_service.clear().await?;

        info!("Update marked as failed, NATS will retry");
        Ok(())
    }

    async fn send_nats_notification(&self, version: &str) {
        match self.config_service.get_machine_id().await {
            Ok(machine_id) => {
                for attempt in 1..=5 {
                    match self.installed_agent_publisher
                        .publish(machine_id.clone(), "openframe-client".to_string(), version.to_string())
                        .await
                    {
                        Ok(_) => {
                            info!("Successfully published NATS notification for update to {}", version);
                            return;
                        }
                        Err(e) => {
                            if attempt < 5 {
                                warn!("Failed to publish NATS notification (attempt {}/5): {:#}. Retrying...", attempt, e);
                                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                            } else {
                                warn!("Failed to publish NATS notification after 5 attempts: {:#}", e);
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
