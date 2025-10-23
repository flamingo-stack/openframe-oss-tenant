use crate::models::MachineHeartbeatMessage;
use crate::services::nats_message_publisher::NatsMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use anyhow::Result;
use serde_json;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info};

#[derive(Clone)]
pub struct MachineHeartbeatPublisher {
    nats_publisher: NatsMessagePublisher,
    config_service: AgentConfigurationService,
}

impl MachineHeartbeatPublisher {
    pub fn new(
        nats_publisher: NatsMessagePublisher,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_publisher,
            config_service,
        }
    }

    pub async fn publish_heartbeat(&self) -> Result<()> {
        let machine_id = self.config_service.get_machine_id().await?;

        let heartbeat_message = MachineHeartbeatMessage::new();
        let message_json = serde_json::to_string(&heartbeat_message)?;
        
        let topic = format!("machine.{}.heartbeat", machine_id);
        
        self.nats_publisher.publish(&topic, &message_json).await?;
        
        info!("Sent heartbeat for machine: {}", machine_id);
        Ok(())
    }
}