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
        let client_guard = self.nats_connection_manager.get_client().read().await;
        if let Some(client) = &*client_guard {
            let jetstream = jetstream::new(client);
            let machine_id = "TODO_MACHINE_ID".to_string(); // Replace with actual machine_id source
            let consumer = self.create_consumer(&jetstream, &machine_id).await?;
            let mut messages = consumer.messages().await?;
            while let Some(message) = messages.next().await {
                let message = message?;
                let payload = String::from_utf8_lossy(&message.payload);
                let tool_installation_message: ToolInstallationMessage = serde_json::from_str(&payload).unwrap();
                self.tool_installation_service.install(tool_installation_message).await?;
                message.ack().await.map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
            }
        }
        Ok(())
    }

    async fn create_consumer(&self, jetstream: &JetStream, machine_id: &str) -> Result<PushConsumer> {
        let deliver_subject = Self::build_deliver_subject(machine_id);
        let consumer_configuration = Self::build_consumer_configuration(&deliver_subject, machine_id);
        let consumer = jetstream.create_consumer(Self::STREAM_NAME, consumer_configuration).await?;
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

    async fn build_deliver_subject(machine_id: String) -> String {
        format!("machine.{}.toolinstallation", machine_id)
    }

    async fn build_durable_name(machine_id: String) -> String {
        format!("machine_{}_toolinstallation_consumer", machine_id)
    }

}


