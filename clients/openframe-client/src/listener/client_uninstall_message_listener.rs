use crate::services::deactivation_service::DeactivationService;
use crate::services::nats_connection_manager::NatsConnectionManager;
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
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::time::Duration;
use anyhow::Result;
use async_nats::jetstream;
use futures::StreamExt;
use tracing::{error, info, warn};

#[derive(Clone)]
pub struct ClientUninstallMessageListener {
    nats_connection_manager: NatsConnectionManager,
    deactivation_service: Arc<DeactivationService>,
    config_service: AgentConfigurationService,
    uninstall_dispatched: Arc<AtomicBool>,
}

impl ClientUninstallMessageListener {

    const STREAM_NAME: &'static str = "CLIENT_UNINSTALL";

    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        deactivation_service: Arc<DeactivationService>,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_connection_manager,
            deactivation_service,
            config_service,
            uninstall_dispatched: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Start listening for messages in a background task
    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                info!("Starting client uninstall message listener...");
                match listener.listen().await {
                    Ok(_) => {
                        warn!("Client uninstall message listener exited normally (unexpected)");
                    }
                    Err(e) => {
                        error!("Client uninstall message listener error: {:#}", e);
                    }
                }

                // Stay down after a dispatched uninstall so the deleted durable is not recreated.
                if listener.uninstall_dispatched.load(Ordering::Acquire) {
                    info!("Client uninstall dispatched, listener stopping permanently");
                    break;
                }

                info!(
                    "Reconnecting client uninstall message listener in {} seconds...",
                    RECONNECTION_DELAY_MS / 1000
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        info!("Run client uninstall message listener");
        let machine_id = self.config_service.get_machine_id()?;

        loop {
            let client = self.nats_connection_manager
                .get_client()
                .await?;
            let mut reconnect_rx = self.nats_connection_manager.subscribe_reconnect();
            let js = jetstream::new((*client).clone());

            let consumer = self.create_consumer(&js, &machine_id).await;

            info!("Start listening for client uninstall messages");
            let mut messages = consumer.messages().await?;

            loop {
                tokio::select! {
                    msg_result = messages.next() => {
                        match msg_result {
                            Some(Ok(message)) => {
                                if let Err(e) = self.handle_message(message, &js, &machine_id).await {
                                    error!("Failed to handle message: {:#}", e);
                                }
                                if self.uninstall_dispatched.load(Ordering::Acquire) {
                                    return Ok(());
                                }
                            }
                            Some(Err(e)) => {
                                error!("Message stream error, recreating consumer: {:#}", e);
                                return Err(anyhow::anyhow!("Message stream error: {}", e));
                            }
                            None => {
                                warn!("Message stream ended, rebinding consumer");
                                break;
                            }
                        }
                    }
                    _ = reconnect_rx.recv() => {
                        info!("NATS reconnected, re-provisioning client uninstall consumer");
                        self.create_consumer(&js, &machine_id).await;
                    }
                }
            }
        }
    }

    async fn handle_message(&self, message: Message, js: &jetstream::Context, machine_id: &str) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        info!("Received client uninstall message: {:?}", payload);

        // Client self-uninstall is macOS/Windows only; drop the command elsewhere.
        if !cfg!(any(target_os = "macos", target_os = "windows")) {
            warn!("Client self-uninstall is not supported on this platform, ignoring message");
            message.ack().await
                .map_err(|e| anyhow::anyhow!("Failed to ack unsupported-platform message: {}", e))?;
            return Ok(());
        }

        // Any message on this machine-scoped subject is the command; no payload contract yet.
        self.deactivation_service.request_uninstall().await;

        // Ack right away: request_uninstall is idempotent and its supervisor retries the spawn.
        message.ack().await
            .map_err(|e| anyhow::anyhow!("Failed to ack client uninstall message: {}", e))?;
        info!("Client uninstall message acknowledged");

        // Drop the durable so a reinstall starts a fresh consumer instead of inheriting a stale command.
        let durable_name = Self::build_durable_name(machine_id);
        match js.delete_consumer_from_stream(&durable_name, Self::STREAM_NAME).await {
            Ok(_) => info!("Deleted client uninstall consumer {}", durable_name),
            Err(e) => warn!("Failed to delete client uninstall consumer {} (continuing with uninstall): {:#}", durable_name, e),
        }

        self.uninstall_dispatched.store(true, Ordering::Release);

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
                    "Creating client uninstall consumer for stream {} (cycle {}, attempt {}/{})",
                    Self::STREAM_NAME, cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE
                );

                match js.create_consumer_on_stream(consumer_configuration.clone(), Self::STREAM_NAME).await {
                    Ok(consumer) => {
                        info!("Client uninstall consumer created for stream: {}", Self::STREAM_NAME);
                        return consumer;
                    }
                    Err(e) => {
                        let error_msg = format!("{:?}", e);
                        if error_msg.contains("consumer name already in use") || error_msg.contains("10013") {
                            warn!("Client uninstall consumer already exists, attempting to get existing consumer");
                            let durable_name = Self::build_durable_name(machine_id);
                            if let Ok(existing_consumer) = js.get_consumer_from_stream(Self::STREAM_NAME, &durable_name).await {
                                info!("Retrieved existing client uninstall consumer for stream: {}", Self::STREAM_NAME);
                                return existing_consumer;
                            }
                        }

                        if attempt < CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                            warn!(
                                "Failed to create client uninstall consumer (cycle {}, attempt {}/{}): {:#}. Retrying in {} ms...",
                                cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, e, delay_ms
                            );
                            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                            delay_ms = (delay_ms * 2).min(MAX_RETRY_DELAY_MS);
                        } else {
                            warn!(
                                "Failed to create client uninstall consumer (cycle {}, attempt {}/{}): {:#}",
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
        let filter_subject = Self::build_filter_subject(machine_id);
        let deliver_subject = Self::build_deliver_subject(machine_id);
        let durable_name = Self::build_durable_name(machine_id);

        info!("Client uninstall consumer configuration - filter subject: {}, deliver subject: {}, durable name: {}", filter_subject, deliver_subject, durable_name);

        push::Config {
            filter_subject,
            deliver_subject,
            durable_name: Some(durable_name),
            ack_wait: Duration::from_secs(CONSUMER_ACK_WAIT_SECS),
            // New: never replay a stale uninstall command to a reinstalled client.
            deliver_policy: DeliverPolicy::New,
            max_deliver: CONSUMER_MAX_DELIVER,
            ..Default::default()
        }
    }

    fn build_filter_subject(machine_id: &str) -> String {
        format!("machine.{}.client-uninstall", machine_id)
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.client-uninstall.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_client-uninstall_consumer", machine_id)
    }
}
