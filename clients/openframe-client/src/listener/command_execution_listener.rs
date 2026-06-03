use crate::models::command_execution_message::CommandExecutionMessage;
use crate::services::command_execution_service::CommandExecutionService;
use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::nats_message_publisher::NatsMessagePublisher;
use crate::services::AgentConfigurationService;
use anyhow::Result;
use async_nats::Message;
use futures::StreamExt;
use tokio::time::Duration;
use tracing::{error, info};

const RECONNECTION_DELAY_SECS: u64 = 10;

#[derive(Clone)]
pub struct CommandExecutionListener {
    pub nats_connection_manager: NatsConnectionManager,
    pub nats_message_publisher: NatsMessagePublisher,
    pub command_execution_service: CommandExecutionService,
    pub config_service: AgentConfigurationService,
}

impl CommandExecutionListener {
    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        nats_message_publisher: NatsMessagePublisher,
        command_execution_service: CommandExecutionService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_connection_manager,
            nats_message_publisher,
            command_execution_service,
            config_service,
        }
    }

    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                match listener.try_listen().await {
                    ListenOutcome::Disconnected => {
                        info!(
                            delay_secs = RECONNECTION_DELAY_SECS,
                            "Command execution listener disconnected, will reconnect"
                        );
                        tokio::time::sleep(Duration::from_secs(RECONNECTION_DELAY_SECS)).await;
                    }
                    ListenOutcome::FatalError(e) => {
                        error!(error = %e, "Command execution listener fatal error, stopping");
                        return;
                    }
                }
            }
        });
        Ok(handle)
    }

    async fn try_listen(&self) -> ListenOutcome {
        let client = match self.nats_connection_manager.get_client().await {
            Ok(c) => c,
            Err(e) => {
                return ListenOutcome::FatalError(format!("NATS client not available: {}", e))
            }
        };

        let machine_id = match self.config_service.get_machine_id().await {
            Ok(id) => id,
            Err(e) => return ListenOutcome::FatalError(format!("Failed to get machine ID: {}", e)),
        };

        let subject = Self::build_command_subject(&machine_id);
        let mut subscriber = match client.subscribe(subject.clone()).await {
            Ok(s) => s,
            Err(e) => {
                return ListenOutcome::FatalError(format!(
                    "Failed to subscribe to {}: {}",
                    subject, e
                ))
            }
        };

        info!(subject = %subject, "Command execution listener active");

        while let Some(message) = subscriber.next().await {
            if let Err(e) = self.handle_message(message, &machine_id).await {
                error!("Failed to handle command execution message: {:#}", e);
            }
        }

        ListenOutcome::Disconnected
    }

    async fn handle_message(&self, message: Message, machine_id: &str) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        info!(payload = %payload, "Command execution request received");

        let command_message = match serde_json::from_str::<CommandExecutionMessage>(&payload) {
            Ok(msg) => {
                info!(
                    execution_id = %msg.execution_id,
                    shell = %msg.shell,
                    timeout = msg.timeout,
                    code_len = msg.code.len(),
                    "Parsed command execution message"
                );
                msg
            }
            Err(e) => {
                error!(error = %e, "Failed to parse command execution message, skipping");
                return Ok(());
            }
        };

        let execution_id = command_message.execution_id.clone();

        let result = self
            .command_execution_service
            .execute(&command_message, machine_id)
            .await;

        info!(
            execution_id = %execution_id,
            exit_code = result.exit_code,
            timed_out = result.timed_out,
            execution_time_ms = result.execution_time_ms,
            stdout_len = result.stdout.len(),
            stderr_len = result.stderr.len(),
            "Command execution finished"
        );

        let result_subject = Self::build_result_subject(machine_id);
        if let Err(e) = self
            .nats_message_publisher
            .publish(&result_subject, &result)
            .await
        {
            error!(execution_id = %execution_id, error = %e, "Failed to publish command result");
        }

        Ok(())
    }

    fn build_command_subject(machine_id: &str) -> String {
        format!("machine.{}.command-execution", machine_id)
    }

    fn build_result_subject(machine_id: &str) -> String {
        format!("machine.{}.command-execution.result", machine_id)
    }
}

enum ListenOutcome {
    Disconnected,
    FatalError(String),
}
