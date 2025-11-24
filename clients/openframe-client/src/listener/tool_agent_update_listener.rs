use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::tool_agent_update_service::ToolAgentUpdateService;
use crate::config::update_config::{
    MAX_CONSUMER_CREATE_RETRIES,
    INITIAL_RETRY_DELAY_MS,
    MAX_RETRY_DELAY_MS,
    RECONNECTION_DELAY_MS,
    CONSUMER_ACK_WAIT_SECS,
};
use async_nats::jetstream::consumer::PushConsumer;
use async_nats::jetstream::consumer::push;
use async_nats::jetstream::consumer::DeliverPolicy;
use tokio::time::Duration;
use anyhow::{Result, Context};
use async_nats::jetstream;
use futures::StreamExt;
use tracing::{error, info, warn};
use crate::services::AgentConfigurationService;
use crate::models::tool_agent_update_message::ToolAgentUpdateMessage;

#[derive(Clone)]
pub struct ToolAgentUpdateListener {
    pub nats_connection_manager: NatsConnectionManager,
    pub tool_agent_update_service: ToolAgentUpdateService,
    pub config_service: AgentConfigurationService,
}

impl ToolAgentUpdateListener {

    const STREAM_NAME: &'static str = "TOOL_UPDATE";

    pub fn new(
        nats_connection_manager: NatsConnectionManager, 
        tool_agent_update_service: ToolAgentUpdateService, 
        config_service: AgentConfigurationService
    ) -> Self {
        Self { 
            nats_connection_manager, 
            tool_agent_update_service,
            config_service 
        }
    }

    /// Start listening for messages in a background task
    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            // Reconnection loop - keeps trying to reconnect on failure
            loop {
                info!("Starting tool agent update listener...");
                match listener.listen().await {
                    Ok(_) => {
                        warn!("Tool agent update listener exited normally (unexpected)");
                    }
                    Err(e) => {
                        error!("Tool agent update listener error: {:#}", e);
                    }
                }

                // Wait before reconnecting
                info!(
                    "Reconnecting tool agent update listener in {} seconds...",
                    RECONNECTION_DELAY_MS / 1000
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        info!("Run tool agent update message listener");
        let client = self.nats_connection_manager
            .get_client()
            .await?;
        let js = jetstream::new((*client).clone());

        let machine_id = self.config_service.get_machine_id().await?;   

        let consumer = self.create_consumer(&js, &machine_id).await?;

        info!("Start listening for tool agent update messages");
        let mut messages = consumer.messages().await?;
        while let Some(message) = messages.next().await {
            info!("Received tool agent update message: {:?}", message);

            let message = message?;

            let payload = String::from_utf8_lossy(&message.payload);
            let tool_agent_update_message: ToolAgentUpdateMessage = serde_json::from_str(&payload)?;
            let tool_agent_id = tool_agent_update_message.tool_agent_id.clone();

            match self.tool_agent_update_service.process_update(tool_agent_update_message).await {
                Ok(_) => {
                    // ack
                    info!("Acknowledging tool agent update message for tool: {}", tool_agent_id);
                    message.ack().await
                        .map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
                    info!("Tool agent update message acknowledged for tool: {}", tool_agent_id);
                }
                Err(e) => {
                    // do not ack: let message be redelivered per consumer ack policy
                    error!("Failed to process tool agent update message for tool {}: {:#}", tool_agent_id, e);
                    info!("Leaving message unacked for potential redelivery: tool {}", tool_agent_id);
                }
            }
        }
        Ok(())
    }

    async fn create_consumer(&self, js: &jetstream::Context, machine_id: &str) -> Result<PushConsumer> {
        let consumer_configuration = Self::build_consumer_configuration(machine_id);

        // Retry loop with exponential backoff
        let mut retry_count = 0;
        let mut delay_ms = INITIAL_RETRY_DELAY_MS;

        loop {
            info!(
                "Creating consumer for stream {} (attempt {}/{})",
                Self::STREAM_NAME,
                retry_count + 1,
                MAX_CONSUMER_CREATE_RETRIES
            );

            // Try to create consumer directly - simpler approach without get_consumer_from_stream
            match js.create_consumer_on_stream(consumer_configuration.clone(), Self::STREAM_NAME).await {
                Ok(consumer) => {
                    info!("Consumer created for stream: {}", Self::STREAM_NAME);
                    return Ok(consumer);
                }
                Err(e) => {
                    // Check if consumer already exists - try to get it
                    let error_msg = format!("{:?}", e);
                    if error_msg.contains("consumer name already in use") || error_msg.contains("10013") {
                        warn!("Consumer already exists, attempting to get existing consumer");
                        let durable_name = Self::build_durable_name(machine_id);
                        if let Ok(existing_consumer) = js.get_consumer_from_stream(Self::STREAM_NAME, &durable_name).await {
                            info!("Retrieved existing consumer for stream: {}", Self::STREAM_NAME);
                            return Ok(existing_consumer);
                        }
                    }

                    retry_count += 1;

                    // Check if this is a permissions error - fail fast
                    if error_msg.contains("Permissions Violation") {
                        error!(
                            "Permission denied for TOOL_UPDATE stream. This requires server-side NATS permissions configuration. \
                            Consumer name: {}, Stream: {}",
                            Self::build_durable_name(machine_id),
                            Self::STREAM_NAME
                        );
                        return Err(e).context(
                            "Insufficient NATS permissions for TOOL_UPDATE stream. \
                            Please configure permissions on the server for: $JS.API.CONSUMER.CREATE.TOOL_UPDATE.>"
                        );
                    }

                    if retry_count >= MAX_CONSUMER_CREATE_RETRIES {
                        error!(
                            "Failed to create consumer after {} attempts: {:#}",
                            MAX_CONSUMER_CREATE_RETRIES, e
                        );
                        return Err(e).context(format!(
                            "Failed to create consumer after {} retries",
                            MAX_CONSUMER_CREATE_RETRIES
                        ));
                    }

                    warn!(
                        "Failed to create consumer (attempt {}/{}): {:#}. Retrying in {} ms...",
                        retry_count, MAX_CONSUMER_CREATE_RETRIES, e, delay_ms
                    );

                    tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    delay_ms = (delay_ms * 2).min(MAX_RETRY_DELAY_MS);
                }
            }
        }
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
            ack_wait: Duration::from_secs(CONSUMER_ACK_WAIT_SECS),
            deliver_policy: DeliverPolicy::Last,
            ..Default::default()
        }
    }

    fn build_filter_subject(_machine_id: &str) -> String {
        "machine.all.tool-update".to_string()
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.tool-update.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_tool-update_consumer", machine_id)
    }

}
