use anyhow::{anyhow, Result};
use futures::StreamExt;
use tokio::time::Duration;
use tracing::{error, info, warn};

use crate::config::updater_config::{
    RECONNECTION_DELAY_MS, SUBJECT_REMOTE_HEALING, SUBJECT_REMOTE_HEALING_RESULT,
};
use crate::models::HealingMessage;
use crate::services::remote_healing_service::RemoteHealingService;
use crate::services::{AgentConfigurationService, NatsConnectionManager, NatsMessagePublisher};

/// Core-NATS listener for allowlisted healing actions on
/// `machine.{id}.remote-healing`. Fire-and-forget delivery (v1): an offline
/// machine misses the message, matching the client's RMM execution semantics.
#[derive(Clone)]
pub struct RemoteHealingListener {
    nats: NatsConnectionManager,
    publisher: NatsMessagePublisher,
    healing_service: RemoteHealingService,
    config_service: AgentConfigurationService,
}

impl RemoteHealingListener {
    pub fn new(
        nats: NatsConnectionManager,
        publisher: NatsMessagePublisher,
        healing_service: RemoteHealingService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats,
            publisher,
            healing_service,
            config_service,
        }
    }

    pub async fn start(&self) -> tokio::task::JoinHandle<()> {
        let listener = self.clone();
        tokio::spawn(async move {
            loop {
                info!("Starting remote-healing listener");
                match listener.listen().await {
                    Ok(_) => warn!("Remote-healing listener exited unexpectedly"),
                    Err(e) => error!("Remote-healing listener error: {:#}", e),
                }
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        })
    }

    async fn listen(&self) -> Result<()> {
        let machine_id = self.config_service.get_machine_id().await?;
        let subject = SUBJECT_REMOTE_HEALING.replace("{machine_id}", &machine_id);
        let result_subject = SUBJECT_REMOTE_HEALING_RESULT.replace("{machine_id}", &machine_id);

        let client = self.nats.get_client().await?;
        let mut subscriber = client
            .subscribe(subject.clone())
            .await
            .map_err(|e| anyhow!("Failed to subscribe to {}: {}", subject, e))?;

        info!(subject = %subject, "Remote-healing listener active");

        while let Some(message) = subscriber.next().await {
            let payload = String::from_utf8_lossy(&message.payload);
            let healing_msg: HealingMessage = match serde_json::from_str(&payload) {
                Ok(m) => m,
                Err(e) => {
                    error!("Failed to parse healing message, skipping: {:#}", e);
                    continue;
                }
            };

            let result = self
                .healing_service
                .execute(&healing_msg, &machine_id)
                .await;
            info!(
                execution_id = %result.execution_id,
                action = %result.action,
                success = result.success,
                "Healing action finished"
            );

            if let Err(e) = self.publisher.publish(&result_subject, &result).await {
                error!(
                    execution_id = %result.execution_id,
                    "Failed to publish healing result: {:#}", e
                );
            }
        }

        Ok(())
    }
}
