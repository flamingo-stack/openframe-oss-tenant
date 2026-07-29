use crate::config::update_config::{
    CONSUMER_ACK_WAIT_SECS, CONSUMER_CYCLE_PAUSE_MS, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE,
    INITIAL_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS, RECONNECTION_DELAY_MS,
    UNINSTALL_CONSUMER_MAX_DELIVER,
};
use crate::listener::client_update_gate::park_or_dispatch;
use crate::models::ToolUninstallMessage;
use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::tool_uninstall_service::ToolUninstallService;
use crate::services::tool_uninstall_service::UninstallOutcome;
use crate::services::AgentConfigurationService;
use anyhow::Result;
use async_nats::jetstream;
use async_nats::jetstream::consumer::push;
use async_nats::jetstream::consumer::PushConsumer;
use async_nats::jetstream::Message;
use futures::{FutureExt, StreamExt};
use tokio::time::Duration;
use tracing::{error, info, warn};

#[derive(Clone)]
pub struct ToolUninstallMessageListener {
    nats_connection_manager: NatsConnectionManager,
    tool_run_manager: ToolRunManager,
    tool_uninstall_service: ToolUninstallService,
    config_service: AgentConfigurationService,
}

impl ToolUninstallMessageListener {
    const STREAM_NAME: &'static str = "TOOL_INSTALLATION";

    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        tool_run_manager: ToolRunManager,
        tool_uninstall_service: ToolUninstallService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_connection_manager,
            tool_run_manager,
            tool_uninstall_service,
            config_service,
        }
    }

    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                info!("Starting tool uninstall message listener...");
                match listener.listen().await {
                    Ok(_) => {
                        warn!("Tool uninstall message listener exited normally (unexpected)");
                    }
                    Err(e) => {
                        error!("Tool uninstall message listener error: {:#}", e);
                    }
                }

                info!(
                    "Reconnecting tool uninstall message listener in {} seconds...",
                    RECONNECTION_DELAY_MS / 1000
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        info!("Run tool uninstall message listener");
        let machine_id = self.config_service.get_machine_id()?;

        loop {
            let client = self.nats_connection_manager.get_client().await?;
            let mut reconnect_rx = self.nats_connection_manager.subscribe_reconnect();
            let js = jetstream::new((*client).clone());

            let consumer = self.create_consumer(&js, &machine_id).await;

            info!("Start listening for tool uninstall messages");
            let mut messages = consumer.messages().await?;

            loop {
                tokio::select! {
                    msg_result = messages.next() => {
                        match msg_result {
                            Some(Ok(message)) => {
                                if let Err(e) = self.handle_message(message).await {
                                    error!("Failed to handle message: {:#}", e);
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
                        info!("NATS reconnected, re-provisioning tool uninstall consumer");
                        self.create_consumer(&js, &machine_id).await;
                    }
                }
            }
        }
    }

    async fn handle_message(&self, message: Message) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        info!("Received tool uninstall message: {:?}", payload);

        let uninstall_message: ToolUninstallMessage = match serde_json::from_str(&payload) {
            Ok(msg) => msg,
            Err(e) => {
                error!("Failed to parse tool uninstall message: {:#}", e);
                if let Err(ack_err) = message.ack().await {
                    warn!("Failed to ack malformed message: {}", ack_err);
                }
                return Ok(());
            }
        };

        let tool_agent_id = uninstall_message.tool_agent_id.clone();

        let listener = self.clone();
        park_or_dispatch(
            self.tool_run_manager.clone(),
            message,
            format!("tool-uninstall:{}", tool_agent_id),
            move |msg| async move {
                listener.dispatch(msg, uninstall_message).await;
            },
        )
        .await;

        Ok(())
    }

    async fn dispatch(&self, message: Message, uninstall_message: ToolUninstallMessage) {
        let tool_agent_id = uninstall_message.tool_agent_id.clone();

        let tool_lock = self.tool_run_manager.tool_lock(&tool_agent_id).await;
        let _guard = match tool_lock.try_lock() {
            Ok(guard) => guard,
            Err(_) => {
                info!(
                    "Tool {} busy with another operation, deferring uninstall for redelivery",
                    tool_agent_id
                );
                return;
            }
        };

        self.tool_run_manager.mark_updating(&tool_agent_id).await;

        let outcome = std::panic::AssertUnwindSafe(
            self.tool_uninstall_service
                .uninstall_by_tool_agent_id(&tool_agent_id),
        )
        .catch_unwind()
        .await;

        let (ack_message, remove_supervision) = match outcome {
            Ok(Ok(UninstallOutcome::Removed)) => (true, true),
            Ok(Ok(UninstallOutcome::NotInstalled)) => (true, true),
            Ok(Err(e)) => {
                error!("Failed to uninstall tool {}: {:#}", tool_agent_id, e);
                (false, false)
            }
            Err(_) => {
                error!("Uninstall panicked for tool {}", tool_agent_id);
                (false, false)
            }
        };

        if remove_supervision {
            self.tool_run_manager
                .clear_running_tool(&tool_agent_id)
                .await;
        }
        self.tool_run_manager.clear_updating(&tool_agent_id).await;

        if ack_message {
            match message.ack().await {
                Ok(_) => info!("Uninstall message acknowledged for tool: {}", tool_agent_id),
                Err(e) => error!(
                    "Failed to ack uninstall message for tool {}: {}",
                    tool_agent_id, e
                ),
            }
        } else {
            info!(
                "Leaving uninstall message unacked for potential redelivery: tool {}",
                tool_agent_id
            );
        }
    }

    async fn create_consumer(&self, js: &jetstream::Context, machine_id: &str) -> PushConsumer {
        let consumer_configuration = Self::build_consumer_configuration(machine_id);
        let mut cycle = 0u32;

        loop {
            cycle += 1;
            let mut delay_ms = INITIAL_RETRY_DELAY_MS;

            for attempt in 1..=CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                info!(
                    "Creating uninstall consumer for stream {} (cycle {}, attempt {}/{})",
                    Self::STREAM_NAME,
                    cycle,
                    attempt,
                    CONSUMER_RETRY_ATTEMPTS_PER_CYCLE
                );

                match js
                    .create_consumer_on_stream(consumer_configuration.clone(), Self::STREAM_NAME)
                    .await
                {
                    Ok(consumer) => {
                        info!(
                            "Uninstall consumer created for stream: {}",
                            Self::STREAM_NAME
                        );
                        return consumer;
                    }
                    Err(e) => {
                        let error_msg = format!("{:?}", e);
                        if error_msg.contains("consumer name already in use")
                            || error_msg.contains("10013")
                        {
                            warn!("Uninstall consumer already exists, attempting to get existing consumer");
                            let durable_name = Self::build_durable_name(machine_id);
                            if let Ok(existing_consumer) = js
                                .get_consumer_from_stream(Self::STREAM_NAME, &durable_name)
                                .await
                            {
                                info!(
                                    "Retrieved existing uninstall consumer for stream: {}",
                                    Self::STREAM_NAME
                                );
                                return existing_consumer;
                            }
                        }

                        if attempt < CONSUMER_RETRY_ATTEMPTS_PER_CYCLE {
                            warn!(
                                "Failed to create uninstall consumer (cycle {}, attempt {}/{}): {:#}. Retrying in {} ms...",
                                cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, e, delay_ms
                            );
                            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                            delay_ms = (delay_ms * 2).min(MAX_RETRY_DELAY_MS);
                        } else {
                            warn!(
                                "Failed to create uninstall consumer (cycle {}, attempt {}/{}): {:#}",
                                cycle, attempt, CONSUMER_RETRY_ATTEMPTS_PER_CYCLE, e
                            );
                        }
                    }
                }
            }

            info!(
                "All {} attempts in cycle {} failed. Pausing {} seconds before next cycle...",
                CONSUMER_RETRY_ATTEMPTS_PER_CYCLE,
                cycle,
                CONSUMER_CYCLE_PAUSE_MS / 1000
            );
            tokio::time::sleep(Duration::from_millis(CONSUMER_CYCLE_PAUSE_MS)).await;
        }
    }

    fn build_consumer_configuration(machine_id: &str) -> push::Config {
        let filter_subject = Self::build_filter_subject(machine_id);
        let deliver_subject = Self::build_deliver_subject(machine_id);
        let durable_name = Self::build_durable_name(machine_id);

        info!("Uninstall consumer configuration - filter subject: {}, deliver subject: {}, durable name: {}", filter_subject, deliver_subject, durable_name);

        push::Config {
            filter_subject,
            deliver_subject,
            durable_name: Some(durable_name),
            ack_wait: Duration::from_secs(CONSUMER_ACK_WAIT_SECS),
            max_deliver: UNINSTALL_CONSUMER_MAX_DELIVER,
            ..Default::default()
        }
    }

    fn build_filter_subject(machine_id: &str) -> String {
        format!("machine.{}.tool-uninstall", machine_id)
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.tool-uninstall.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_tool-uninstall_consumer", machine_id)
    }
}
