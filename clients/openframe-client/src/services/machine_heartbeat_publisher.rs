use crate::models::MachineHeartbeatMessage;
use crate::services::nats_message_publisher::NatsMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use anyhow::Result;
use serde_json;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::RwLock;
use tracing::{debug, error, info};

const HEARTBEAT_LOG_INTERVAL: u64 = 60;

#[derive(Clone)]
pub struct MachineHeartbeatPublisher {
    nats_publisher: NatsMessagePublisher,
    config_service: AgentConfigurationService,
    heartbeat_count: Arc<AtomicU64>,
}

impl MachineHeartbeatPublisher {
    pub fn new(
        nats_publisher: NatsMessagePublisher,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_publisher,
            config_service,
            heartbeat_count: Arc::new(AtomicU64::new(0)),
        }
    }

    pub async fn publish_heartbeat(&self) -> Result<()> {
        let machine_id = self.config_service.get_machine_id().await?;

        let heartbeat_message = MachineHeartbeatMessage::new();
        let message_json = serde_json::to_string(&heartbeat_message)?;
        
        let topic = format!("machine.{}.heartbeat", machine_id);
        
        self.nats_publisher.publish(&topic, &message_json).await?;
        self.log_heartbeat(&machine_id);
        Ok(())
    }

    fn log_heartbeat(&self, machine_id: &str) {
        let count = self.heartbeat_count.fetch_add(1, Ordering::Relaxed) + 1;
        if count >= HEARTBEAT_LOG_INTERVAL {
            self.heartbeat_count.store(0, Ordering::Relaxed);
            info!("Heartbeat healthy for machine: {} ({} sent since last check)", machine_id, count);
        } else {
            debug!("Sent heartbeat for machine: {}", machine_id);
        }
    }
}