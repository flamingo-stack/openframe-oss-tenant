use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::openframe_client_update_service::OpenFrameClientUpdateService;
use async_nats::jetstream::consumer::PushConsumer;
use async_nats::jetstream::consumer::push;
use tokio::time::Duration;
use anyhow::Result;
use async_nats::jetstream;
use futures::StreamExt;
use tracing::{error, info};
use crate::services::AgentConfigurationService;
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;

#[derive(Clone)]
pub struct OpenFrameClientUpdateListener {
    pub nats_connection_manager: NatsConnectionManager,
    pub openframe_client_update_service: OpenFrameClientUpdateService,
    pub config_service: AgentConfigurationService,
}

impl OpenFrameClientUpdateListener {

    const STREAM_NAME: &'static str = "CLIENT_UPDATE";

    pub fn new(
        nats_connection_manager: NatsConnectionManager, 
        openframe_client_update_service: OpenFrameClientUpdateService, 
        config_service: AgentConfigurationService
    ) -> Self {
        Self { 
            nats_connection_manager, 
            openframe_client_update_service,
            config_service 
        }
    }

    /// Start listening for messages in a background task
    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            // TODO: add reconnection and consumer creation loop after token fallback is implemented
            if let Err(e) = listener.listen().await {
                error!("OpenFrame client update message listener error: {:#}", e);
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        info!("Run OpenFrame client update message listener");
        let client = self.nats_connection_manager
            .get_client()
            .await?;
        let js = jetstream::new((*client).clone());

        let machine_id = self.config_service.get_machine_id().await?;   

        let consumer = self.create_consumer(&js, &machine_id).await?;

        info!("Start listening for OpenFrame client update messages");
        let mut messages = consumer.messages().await?;
        while let Some(message) = messages.next().await {
            info!("Received OpenFrame client update message: {:?}", message);

            let message = message?;

            let payload = String::from_utf8_lossy(&message.payload);
            let client_update_message: OpenFrameClientUpdateMessage = serde_json::from_str(&payload)?;
            let version = client_update_message.version.clone();

            match self.openframe_client_update_service.process_update(client_update_message).await {
                Ok(_) => {
                    // ack
                    info!("Acknowledging client update message for version: {}", version);
                    message.ack().await
                        .map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
                    info!("Client update message acknowledged for version: {}", version);
                }
                Err(e) => {
                    // do not ack: let message be redelivered per consumer ack policy
                    error!("Failed to process client update message for version {}: {:#}", version, e);
                    info!("Leaving message unacked for potential redelivery: version {}", version);
                }
            }
        }
        Ok(())
    }

    async fn create_consumer(&self, js: &jetstream::Context, machine_id: &str) -> Result<PushConsumer> {
        // TODO: retry if failed to create
        let consumer_configuration = Self::build_consumer_configuration(machine_id);
        info!("Creating consumer for stream {}  ", Self::STREAM_NAME);
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
            ack_wait: Duration::from_secs(60),
            ..Default::default()
        }
    }

    fn build_filter_subject(_machine_id: &str) -> String {
        "machine.all.client-update".to_string()
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.client-update.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_client-update_consumer", machine_id)
    }

}
