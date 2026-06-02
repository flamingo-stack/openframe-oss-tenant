use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::nats_message_publisher::NatsMessagePublisher;
use crate::services::script_execution_service::ScriptExecutionService;
use crate::services::AgentConfigurationService;
use crate::config::update_config::{
    CONSUMER_ACK_WAIT_SECS,
    CONSUMER_MAX_DELIVER,
};
use async_nats::jetstream::consumer::PushConsumer;
use async_nats::jetstream::consumer::push;
use async_nats::jetstream::Message;
use tokio::time::Duration;
use anyhow::Result;
use async_nats::jetstream;
use futures::StreamExt;
use tracing::{error, info, warn};
use crate::models::script_execution_message::ScriptExecutionMessage;

const MAX_CONNECT_ATTEMPTS: u32 = 3;
const CONNECT_RETRY_DELAY_SECS: u64 = 30;
const RECONNECTION_DELAY_SECS: u64 = 10;

#[derive(Clone)]
pub struct ScriptExecutionListener {
    pub nats_connection_manager: NatsConnectionManager,
    pub nats_message_publisher: NatsMessagePublisher,
    pub script_execution_service: ScriptExecutionService,
    pub config_service: AgentConfigurationService,
}

impl ScriptExecutionListener {

    const STREAM_NAME: &'static str = "SCRIPT_EXECUTION";

    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        nats_message_publisher: NatsMessagePublisher,
        script_execution_service: ScriptExecutionService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_connection_manager,
            nats_message_publisher,
            script_execution_service,
            config_service,
        }
    }

    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                match listener.try_listen_with_retries().await {
                    ListenOutcome::StreamNotFound => {
                        info!("Script execution stream not found, listener disabled");
                        return;
                    }
                    ListenOutcome::Disconnected => {
                        info!(
                            delay_secs = RECONNECTION_DELAY_SECS,
                            "Script execution listener disconnected, will reconnect"
                        );
                        tokio::time::sleep(Duration::from_secs(RECONNECTION_DELAY_SECS)).await;
                    }
                    ListenOutcome::FatalError(e) => {
                        error!(error = %e, "Script execution listener fatal error, stopping");
                        return;
                    }
                }
            }
        });
        Ok(handle)
    }

    async fn try_listen_with_retries(&self) -> ListenOutcome {
        let client = match self.nats_connection_manager.get_client().await {
            Ok(c) => c,
            Err(e) => return ListenOutcome::FatalError(format!("NATS client not available: {}", e)),
        };
        let js = jetstream::new((*client).clone());

        let machine_id = match self.config_service.get_machine_id().await {
            Ok(id) => id,
            Err(e) => return ListenOutcome::FatalError(format!("Failed to get machine ID: {}", e)),
        };

        let consumer = match self.try_create_consumer(&js, &machine_id).await {
            Some(c) => c,
            None => return ListenOutcome::StreamNotFound,
        };

        info!("Script execution listener active");

        let messages = match consumer.messages().await {
            Ok(m) => m,
            Err(e) => return ListenOutcome::FatalError(format!("Failed to get message stream: {}", e)),
        };

        let mut messages = messages;
        while let Some(msg_result) = messages.next().await {
            let message = match msg_result {
                Ok(msg) => msg,
                Err(e) => {
                    error!("Failed to receive message from script execution stream: {:#}", e);
                    continue;
                }
            };

            if let Err(e) = self.handle_message(message, &machine_id).await {
                error!("Failed to handle script execution message: {:#}", e);
            }
        }

        ListenOutcome::Disconnected
    }

    async fn handle_message(&self, message: Message, machine_id: &str) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        info!(payload = %payload, "Script execution request received");

        let script_message = match serde_json::from_str::<ScriptExecutionMessage>(&payload) {
            Ok(msg) => {
                info!(
                    execution_id = %msg.execution_id,
                    shell = %msg.shell,
                    timeout = msg.timeout,
                    code_len = msg.code.len(),
                    "Parsed script execution message"
                );
                msg
            }
            Err(e) => {
                error!(error = %e, "Failed to parse script execution message, ACKing to skip");
                if let Err(ack_err) = message.ack().await {
                    warn!("Failed to ack malformed message: {}", ack_err);
                }
                return Ok(());
            }
        };

        let execution_id = script_message.execution_id.clone();

        let result = self.script_execution_service.execute(&script_message, machine_id).await;

        info!(
            execution_id = %execution_id,
            exit_code = result.exit_code,
            timed_out = result.timed_out,
            execution_time_ms = result.execution_time_ms,
            stdout_len = result.stdout.len(),
            stderr_len = result.stderr.len(),
            "Script execution finished"
        );

        let result_subject = format!("machine.{}.script-execution.result", machine_id);
        if let Err(e) = self.nats_message_publisher.publish(&result_subject, &result).await {
            error!(execution_id = %execution_id, error = %e, "Failed to publish script result");
        }

        message.ack().await
            .map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;

        Ok(())
    }

    async fn try_create_consumer(&self, js: &jetstream::Context, machine_id: &str) -> Option<PushConsumer> {
        let consumer_configuration = Self::build_consumer_configuration(machine_id);

        for attempt in 1..=MAX_CONNECT_ATTEMPTS {
            match js.create_consumer_on_stream(consumer_configuration.clone(), Self::STREAM_NAME).await {
                Ok(consumer) => {
                    info!(stream = Self::STREAM_NAME, "Script execution consumer created");
                    return Some(consumer);
                }
                Err(e) => {
                    let error_msg = format!("{:?}", e);

                    if error_msg.contains("consumer name already in use") || error_msg.contains("10013") {
                        let durable_name = Self::build_durable_name(machine_id);
                        if let Ok(consumer) = js.get_consumer_from_stream(Self::STREAM_NAME, &durable_name).await {
                            info!("Retrieved existing script execution consumer");
                            return Some(consumer);
                        }
                    }

                    if error_msg.contains("stream not found") || error_msg.contains("10059") {
                        return None;
                    }

                    if attempt < MAX_CONNECT_ATTEMPTS {
                        warn!(
                            attempt = attempt,
                            max_attempts = MAX_CONNECT_ATTEMPTS,
                            error = %e,
                            "Failed to create script execution consumer, retrying..."
                        );
                        tokio::time::sleep(Duration::from_secs(CONNECT_RETRY_DELAY_SECS)).await;
                    } else {
                        warn!(
                            error = %e,
                            "Failed to create script execution consumer after {} attempts",
                            MAX_CONNECT_ATTEMPTS
                        );
                    }
                }
            }
        }

        None
    }

    fn build_consumer_configuration(machine_id: &str) -> push::Config {
        push::Config {
            filter_subject: Self::build_filter_subject(machine_id),
            deliver_subject: Self::build_deliver_subject(machine_id),
            durable_name: Some(Self::build_durable_name(machine_id)),
            ack_wait: Duration::from_secs(CONSUMER_ACK_WAIT_SECS),
            max_deliver: CONSUMER_MAX_DELIVER,
            ..Default::default()
        }
    }

    fn build_filter_subject(machine_id: &str) -> String {
        format!("machine.{}.script-execution", machine_id)
    }

    fn build_deliver_subject(machine_id: &str) -> String {
        format!("machine.{}.script-execution.inbox", machine_id)
    }

    fn build_durable_name(machine_id: &str) -> String {
        format!("machine_{}_script-execution_consumer", machine_id)
    }
}

enum ListenOutcome {
    StreamNotFound,
    Disconnected,
    FatalError(String),
}
