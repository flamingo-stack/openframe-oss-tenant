use anyhow::Result;
use async_nats::jetstream::{self, consumer::push, consumer::DeliverPolicy, Message};
use futures::StreamExt;
use tokio::time::Duration;
use tracing::{error, info, warn};

use crate::config::updater_config::{
    CLIENT_UPDATE_ACK_WAIT_SECS, CLIENT_UPDATE_MAX_DELIVER, CLIENT_UPDATE_STREAM,
    CONSUMER_CYCLE_PAUSE_MS, CONSUMER_INITIAL_RETRY_DELAY_MS, CONSUMER_MAX_RETRY_DELAY_MS,
    CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, RECONNECTION_DELAY_MS,
};
use crate::models::ClientUpdateMessage;
use crate::services::{AgentConfigurationService, ClientUpdateService, NatsConnectionManager};

#[derive(Clone)]
pub struct ClientUpdateListener {
    nats: NatsConnectionManager,
    update_service: ClientUpdateService,
    config_service: AgentConfigurationService,
}

impl ClientUpdateListener {
    pub fn new(
        nats: NatsConnectionManager,
        update_service: ClientUpdateService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self { nats, update_service, config_service }
    }

    pub async fn start(&self) -> tokio::task::JoinHandle<()> {
        let listener = self.clone();
        tokio::spawn(async move {
            loop {
                info!("Starting CLIENT_UPDATE listener");
                match listener.listen().await {
                    Ok(_) => warn!("CLIENT_UPDATE listener exited unexpectedly"),
                    Err(e) => error!("CLIENT_UPDATE listener error: {:#}", e),
                }
                info!(
                    "Reconnecting in {}ms",
                    RECONNECTION_DELAY_MS
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        })
    }

    async fn listen(&self) -> Result<()> {
        let client = self.nats.get_client().await?;
        let js = jetstream::new((*client).clone());
        let machine_id = self.config_service.get_machine_id().await?;

        let consumer = self.acquire_consumer(&js, &machine_id).await;

        info!("Listening for CLIENT_UPDATE messages (machine_id={})", machine_id);

        let mut messages = consumer.messages().await?;
        while let Some(result) = messages.next().await {
            match result {
                Ok(msg) => {
                    if let Err(e) = self.handle_message(msg).await {
                        error!("Message handling error: {:#}", e);
                    }
                }
                Err(e) => error!("Failed to receive message: {:#}", e),
            }
        }

        Ok(())
    }

    async fn handle_message(&self, message: Message) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        info!("Received CLIENT_UPDATE message: {}", payload);

        let update_msg: ClientUpdateMessage = match serde_json::from_str(&payload) {
            Ok(m) => m,
            Err(e) => {
                error!("Failed to parse CLIENT_UPDATE message: {:#}", e);
                // ACK immediately — a malformed message will never become valid
                if let Err(e) = message.ack().await {
                    warn!("Failed to ACK malformed message: {}", e);
                }
                return Ok(());
            }
        };

        let version = update_msg.version.clone();

        match self.update_service.process_update(update_msg).await {
            Ok(_) => {
                info!("ACKing successful update message for v{}", version);
                message.ack().await
                    .map_err(|e| anyhow::anyhow!("Failed to ACK message: {}", e))?;
            }
            Err(e) => {
                error!("Update failed for v{}: {:#} — leaving unacked for redelivery", version, e);
            }
        }

        Ok(())
    }

    async fn acquire_consumer(
        &self,
        js: &jetstream::Context,
        machine_id: &str,
    ) -> async_nats::jetstream::consumer::PushConsumer {
        let config = self.build_consumer_config(machine_id);
        let durable = Self::durable_name(machine_id);
        let mut cycle = 0u32;

        loop {
            cycle += 1;
            let mut delay_ms = CONSUMER_INITIAL_RETRY_DELAY_MS;

            for attempt in 1..=CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                info!(
                    "Consumer create attempt {}/{} (cycle {})",
                    attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, cycle
                );

                match js
                    .create_consumer_on_stream(config.clone(), CLIENT_UPDATE_STREAM)
                    .await
                {
                    Ok(consumer) => {
                        info!("Consumer ready on stream {}", CLIENT_UPDATE_STREAM);
                        return consumer;
                    }
                    Err(e) => {
                        let msg = format!("{:?}", e);
                        if msg.contains("consumer name already in use") || msg.contains("10013") {
                            warn!("Consumer exists — attaching to existing");
                            if let Ok(c) = js
                                .get_consumer_from_stream(CLIENT_UPDATE_STREAM, &durable)
                                .await
                            {
                                info!("Attached to existing consumer");
                                return c;
                            }
                        }

                        if attempt < CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                            warn!("Attempt {}/{} failed: {:#}. Retrying in {}ms", attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, e, delay_ms);
                            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                            delay_ms = (delay_ms * 2).min(CONSUMER_MAX_RETRY_DELAY_MS);
                        } else {
                            warn!("All attempts in cycle {} failed: {:#}", cycle, e);
                        }
                    }
                }
            }

            info!("Pausing {}ms before next cycle", CONSUMER_CYCLE_PAUSE_MS);
            tokio::time::sleep(Duration::from_millis(CONSUMER_CYCLE_PAUSE_MS)).await;
        }
    }

    fn build_consumer_config(&self, machine_id: &str) -> push::Config {
        push::Config {
            filter_subject: "machine.all.client-update".to_string(),
            deliver_subject: format!("machine.{}.client-update.inbox", machine_id),
            durable_name: Some(Self::durable_name(machine_id)),
            ack_wait: Duration::from_secs(CLIENT_UPDATE_ACK_WAIT_SECS),
            deliver_policy: DeliverPolicy::New,
            max_deliver: CLIENT_UPDATE_MAX_DELIVER,
            ..Default::default()
        }
    }

    fn durable_name(machine_id: &str) -> String {
        format!("machine_{}_client-update_consumer_v2", machine_id)
    }
}
