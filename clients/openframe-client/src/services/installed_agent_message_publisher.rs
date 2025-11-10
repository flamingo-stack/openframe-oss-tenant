use anyhow::Context;
use crate::models::InstalledAgentMessage;
use crate::services::nats_message_publisher::NatsMessagePublisher;

#[derive(Clone)]
pub struct InstalledAgentMessagePublisher {
    nats_message_publisher: NatsMessagePublisher,
}

impl InstalledAgentMessagePublisher {

    pub fn new(nats_message_publisher: NatsMessagePublisher) -> Self {
        Self { nats_message_publisher }
    }

    pub async fn publish(&self, machine_id: String, agent_type: String, version: String) -> anyhow::Result<()> {
        let topic = Self::build_topic_name(machine_id);
        let message = Self::build_message(agent_type, version);
        self.nats_message_publisher.publish(&topic, message).await
            .context(format!("Failed to publish installed agent message to topic: {}", topic))
    }

    fn build_topic_name(machine_id: String) -> String {
        format!("machine.{}.installed-agent", machine_id)
    }

    fn build_message(agent_type: String, version: String) -> InstalledAgentMessage {
        InstalledAgentMessage {
            agent_type,
            version,
        }
    }
}

