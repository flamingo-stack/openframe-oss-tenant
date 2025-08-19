use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::tool_installation_service::ToolInstallationService;
use async_nats::jetstream::consumer::{DeliverPolicy, PushConsumer};
use async_nats::jetstream::consumer::push;
use tokio::time::Duration;
use anyhow::Result;
use async_nats::jetstream;
use futures::StreamExt;
use tracing::info;
use crate::models::ToolInstallationMessage;
use crate::services::AgentConfigurationService;

pub struct ToolInstallationMessageListener {
    pub nats_connection_manager: NatsConnectionManager,
    pub tool_installation_service: ToolInstallationService,
    pub config_service: AgentConfigurationService,
}

impl ToolInstallationMessageListener {

    const STREAM_NAME: &'static str = "TOOL_INSTALLATION";

    pub fn new(
        nats_connection_manager: NatsConnectionManager, 
        tool_installation_service: ToolInstallationService, 
        config_service: AgentConfigurationService
    ) -> Self {
        Self { 
            nats_connection_manager, 
            tool_installation_service, 
            config_service 
        }
    }

    // TODO: add error handling
    pub async fn listen(&self) -> Result<()> {
        info!("Run tool installation message listener");
        let client = self.nats_connection_manager
            .get_client()
            .await?;
        let js = jetstream::new((*client).clone());

        let machine_id = self.config_service.get_machine_id().await?;   

        // TODO: manage consumer here?
        // TODO: async nats process multithreading by default?
        let consumer = self.create_consumer(&js, &machine_id).await?;

        info!("Start listening for tool installation messages");

        // TODO: create generic subscriber
        let mut messages = consumer.messages().await?;
        while let Some(message) = messages.next().await {
            info!("Received tool installation message: {:?}", message);

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
        let consumer_configuration = Self::build_consumer_configuration(machine_id);
        info!("Creating consumer for stream {}", Self::STREAM_NAME);
        // TODO: server side
        // let stream = js.create_stream(Self::STREAM_NAME).await?;
        let consumer = js.create_consumer_on_stream(consumer_configuration, Self::STREAM_NAME).await?;
        info!("Consumer created for stream: {}", Self::STREAM_NAME);
        Ok(consumer)
    }

    fn build_consumer_configuration(machine_id: &str) -> push::Config {
        let filter_subject = Self::build_filter_subject(machine_id);
        let deliver_subject = Self::build_deliver_subject(machine_id);
        let durable_name = Self::build_durable_name(machine_id);

        info!("Consumer configuration - filter subject: {}, deliver subject: {}, durable name: {}", filter_subject, deliver_subject, durable_name);

        push::Config {
            filter_subject,
            deliver_subject,
            durable_name: Some(durable_name),
            inactive_threshold: Duration::from_secs(60),
            // deliver_policy: DeliverPolicy::All,
            ..Default::default()
        }
    }

    fn build_filter_subject(machine_id: &str) -> String {
        format!("machine.{}.tool-installation", machine_id)
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.tool-installation.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_tool-installation_consumer", machine_id)
    }

}


