use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::tool_agent_update_service::ToolAgentUpdateService;
use crate::services::AgentConfigurationService;
use crate::config::update_config::{
    CONSUMER_RETRY_ATTEMPTS_PER_CYCLE,
    INITIAL_RETRY_DELAY_MS,
    MAX_RETRY_DELAY_MS,
    CONSUMER_CYCLE_PAUSE_MS,
    RECONNECTION_DELAY_MS,
    CONSUMER_ACK_WAIT_SECS,
    CONSUMER_MAX_DELIVER,
};
use async_nats::jetstream::consumer::PushConsumer;
use async_nats::jetstream::consumer::push;
use async_nats::jetstream::consumer::DeliverPolicy;
use async_nats::jetstream::Message;
use tokio::time::Duration;
use anyhow::Result;
use async_nats::jetstream;
use futures::StreamExt;
use tracing::{error, info, warn};
use crate::models::AssetUpdateMessage;

#[derive(Clone)]
pub struct AssetUpdateListener {
    nats_connection_manager: NatsConnectionManager,
    tool_agent_update_service: ToolAgentUpdateService,
    config_service: AgentConfigurationService,
}

impl AssetUpdateListener {
    const STREAM_NAME: &'static str = "ASSET_UPDATE";

    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        tool_agent_update_service: ToolAgentUpdateService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_connection_manager,
            tool_agent_update_service,
            config_service,
        }
    }

    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                info!("Starting asset update listener...");
                match listener.listen().await {
                    Ok(_) => {
                        warn!("Asset update listener exited normally (unexpected)");
                    }
                    Err(e) => {
                        error!("Asset update listener error: {:#}", e);
                    }
                }

                info!(
                    "Reconnecting asset update listener in {} seconds...",
                    RECONNECTION_DELAY_MS / 1000
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        info!("Run asset update message listener");
        let client = self.nats_connection_manager.get_client().await?;
        let js = jetstream::new((*client).clone());

        let machine_id = self.config_service.get_machine_id().await?;
        let consumer = self.create_consumer(&js, &machine_id).await;

        info!("Start listening for asset update messages");
        let mut messages = consumer.messages().await?;

        while let Some(msg_result) = messages.next().await {
            let message = match msg_result {
                Ok(msg) => msg,
                Err(e) => {
                    error!("Failed to receive message: {:#}", e);
                    continue;
                }
            };

            if let Err(e) = self.handle_message(message).await {
                error!("Failed to handle message: {:#}", e);
            }
        }

        Ok(())
    }

    async fn handle_message(&self, message: Message) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        info!("Received asset update message: {:?}", payload);

        let asset_update_message: AssetUpdateMessage = match serde_json::from_str(&payload) {
            Ok(msg) => msg,
            Err(e) => {
                error!("Failed to parse asset update message: {:#}", e);
                if let Err(ack_err) = message.ack().await {
                    warn!("Failed to ack malformed message: {}", ack_err);
                }
                return Ok(());
            }
        };

        let asset_id = asset_update_message.asset_id.clone();
        let tool_agent_id = asset_update_message.tool_agent_id.clone();

        match self.tool_agent_update_service.process_asset_update(asset_update_message).await {
            Ok(_) => {
                info!("Acknowledging asset update message for asset: {} (tool: {})", asset_id, tool_agent_id);
                message.ack().await
                    .map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
                info!("Asset update message acknowledged for asset: {}", asset_id);
            }
            Err(e) => {
                error!("Failed to process asset update for {} (tool: {}): {:#}", asset_id, tool_agent_id, e);
                info!("Leaving message unacked for potential redelivery: asset {}", asset_id);
            }
        }

        Ok(())
    }

    async fn create_consumer(&self, js: &jetstream::Context, machine_id: &str) -> PushConsumer {
        let consumer_configuration = Self::build_consumer_configuration(machine_id);
        let mut cycle = 0u32;

        loop {
            cycle += 1;
            let mut delay_ms = INITIAL_RETRY_DELAY_MS;

            for attempt in 1..=CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                info!(
                    "Creating consumer for stream {} (cycle {}, attempt {}/{})",
                    Self::STREAM_NAME, cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE
                );

                match js.create_consumer_on_stream(consumer_configuration.clone(), Self::STREAM_NAME).await {
                    Ok(consumer) => {
                        info!("Consumer created for stream: {}", Self::STREAM_NAME);
                        return consumer;
                    }
                    Err(e) => {
                        let error_msg = format!("{:?}", e);
                        if error_msg.contains("consumer name already in use") || error_msg.contains("10013") {
                            warn!("Consumer already exists, attempting to get existing consumer");
                            let durable_name = Self::build_durable_name(machine_id);
                            if let Ok(existing_consumer) = js.get_consumer_from_stream(Self::STREAM_NAME, &durable_name).await {
                                info!("Retrieved existing consumer for stream: {}", Self::STREAM_NAME);
                                return existing_consumer;
                            }
                        }

                        if error_msg.contains("Permissions Violation") {
                            error!(
                                "Permission denied for {} stream. Consumer name: {}, Stream: {}",
                                Self::STREAM_NAME,
                                Self::build_durable_name(machine_id),
                                Self::STREAM_NAME
                            );
                        }

                        if attempt < CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                            warn!(
                                "Failed to create consumer (cycle {}, attempt {}/{}): {:#}. Retrying in {} ms...",
                                cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, e, delay_ms
                            );
                            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                            delay_ms = (delay_ms * 2).min(MAX_RETRY_DELAY_MS);
                        } else {
                            warn!(
                                "Failed to create consumer (cycle {}, attempt {}/{}): {:#}",
                                cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, e
                            );
                        }
                    }
                }
            }

            info!(
                "All {} attempts in cycle {} failed. Pausing {} seconds before next cycle...",
                CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, cycle, CONSUMER_CYCLE_PAUSE_MS / 1000
            );
            tokio::time::sleep(Duration::from_millis(CONSUMER_CYCLE_PAUSE_MS)).await;
        }
    }

    fn build_consumer_configuration(machine_id: &str) -> push::Config {
        let filter_subject = Self::build_filter_subject();
        let deliver_subject = Self::build_deliver_subject(machine_id);
        let durable_name = Self::build_durable_name(machine_id);

        info!(
            "Consumer configuration - filter subject: {}, deliver subject: {}, durable name: {}",
            filter_subject, deliver_subject, durable_name
        );

        push::Config {
            filter_subject,
            deliver_subject,
            durable_name: Some(durable_name),
            ack_wait: Duration::from_secs(CONSUMER_ACK_WAIT_SECS),
            deliver_policy: DeliverPolicy::New,
            max_deliver: CONSUMER_MAX_DELIVER,
            ..Default::default()
        }
    }

    fn build_filter_subject() -> String {
        "machine.all.asset.*.update".to_string()
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.asset.update.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_asset_update_consumer", machine_id)
    }
}
