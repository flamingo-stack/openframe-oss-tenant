use crate::services::nats_message_publisher::NatsMessagePublisher;

pub struct ToolConnectionMessagePublisher {
    nats_message_publisher: NatsMessagePublisher,
}

impl ToolConnectionMessagePublisher {

    const TOPIC_TEMPLATE: &str = "machine.{}.toolconnection";

    pub fn new(nats_message_publisher: NatsMessagePublisher) -> Self {
        Self { nats_message_publisher }
    }

    pub async fn publish(&self, machine_id: String, tool_agent_id: String) -> Result<()> {
        let topic = self.build_topic_name(machine_id);
        let message = self.build_message(tool_agent_id);
        self.nats_message_publisher.publish(topic, message).await
    }

    fn async build_topic_name(machine_id: String) -> String {
        format!(TOPIC_TEMPLATE, machine_id)
    }

    fn async build_message(tool_agent_id: String) -> ToolConnectionMessage {
        ToolConnectionMessage {
            tool_agent_id,
        }
    }
}