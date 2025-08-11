use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::tool_installation_service::ToolInstallationService;
use async_nats::jetstream::consumer::PushConsumer;
use async_nats::jetstream::consumer::push;
use tokio::time::Duration;
use anyhow::Result;
use async_nats::jetstream;
use futures::StreamExt;
use crate::models::ToolInstallationMessage;

pub struct ToolInstallationMessageListener {
    pub nats_connection_manager: NatsConnectionManager,
    pub tool_installation_service: ToolInstallationService,
}

impl ToolInstallationMessageListener {

    const STREAM_NAME: &'static str = "TOOL_AGENT_INSTALLATION_MESSAGES";

    pub fn new(nats_connection_manager: NatsConnectionManager, tool_installation_service: ToolInstallationService) -> Self {
        Self { nats_connection_manager, tool_installation_service }
    }

    pub async fn listen(&self) -> Result<()> {
        let client = self.nats_connection_manager
            .get_client()
            .await?;
        let js = jetstream::new((*client).clone());

        let machine_id = "TODO_MACHINE_ID".to_string(); // TODO: Replace with actual machine_id source

        // TODO: manage consumer here?
        // TODO: async nats process multithreading by default?
        let consumer = self.create_consumer(&js, &machine_id).await?;

        // TODO: create generic subscriber
        let mut messages = consumer.messages().await?;
        while let Some(message) = messages.next().await {
            let message = message?;
            let payload = String::from_utf8_lossy(&message.payload);
            let tool_installation_message: ToolInstallationMessage = serde_json::from_str(&payload)?;

            // TODO: add error handling
            self.tool_installation_service.install(tool_installation_message).await?;

            message.ack().await
                .map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
        }
        Ok(())
    }

    async fn create_consumer(&self, js: &jetstream::Context, machine_id: &str) -> Result<PushConsumer> {
        let deliver_subject = Self::build_deliver_subject(machine_id);
        let consumer_configuration = Self::build_consumer_configuration(&deliver_subject, machine_id);
        let stream = js.get_stream(Self::STREAM_NAME).await?;
        let consumer = stream.create_consumer(consumer_configuration).await?;
        Ok(consumer)
    }

    fn build_consumer_configuration(deliver_subject: &str, machine_id: &str) -> push::Config {
        push::Config {
            deliver_subject: deliver_subject.to_string(),
            durable_name: Some(Self::build_durable_name(machine_id)),
            inactive_threshold: Duration::from_secs(60),
            ..Default::default()
        }
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.tool-installation", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_tool-installation_consumer", machine_id)
    }

}


