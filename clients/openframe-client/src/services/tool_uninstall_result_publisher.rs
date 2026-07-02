use anyhow::Context;
use crate::models::{ToolUninstallResult, UninstallStatus};
use crate::services::nats_message_publisher::NatsMessagePublisher;

#[derive(Clone)]
pub struct ToolUninstallResultPublisher {
    nats_message_publisher: NatsMessagePublisher,
}

impl ToolUninstallResultPublisher {
    pub fn new(nats_message_publisher: NatsMessagePublisher) -> Self {
        Self { nats_message_publisher }
    }

    pub async fn publish(
        &self,
        machine_id: &str,
        tool_agent_id: &str,
        status: UninstallStatus,
    ) -> anyhow::Result<()> {
        let topic = format!("machine.{}.tool-uninstall.result", machine_id);
        let result = ToolUninstallResult {
            tool_agent_id: tool_agent_id.to_string(),
            status,
        };
        self.nats_message_publisher.publish(&topic, result).await
            .context(format!("Failed to publish tool uninstall result to topic: {}", topic))
    }
}
