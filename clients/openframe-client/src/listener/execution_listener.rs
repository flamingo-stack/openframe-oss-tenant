use std::marker::PhantomData;

use anyhow::{anyhow, Result};
use async_nats::Message;
use futures::StreamExt;
use tokio::time::Duration;
use tracing::{error, info, warn};

use crate::config::update_config::RECONNECTION_DELAY_MS;
use crate::models::ExecutionMessage;
use crate::services::execution_service::ExecutionService;
use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::nats_message_publisher::NatsMessagePublisher;
use crate::services::AgentConfigurationService;

pub struct ExecutionListener<M> {
    nats_connection_manager: NatsConnectionManager,
    nats_message_publisher: NatsMessagePublisher,
    execution_service: ExecutionService,
    config_service: AgentConfigurationService,
    _marker: PhantomData<fn() -> M>,
}

impl<M> Clone for ExecutionListener<M> {
    fn clone(&self) -> Self {
        Self {
            nats_connection_manager: self.nats_connection_manager.clone(),
            nats_message_publisher: self.nats_message_publisher.clone(),
            execution_service: self.execution_service.clone(),
            config_service: self.config_service.clone(),
            _marker: PhantomData,
        }
    }
}

impl<M: ExecutionMessage + 'static> ExecutionListener<M> {
    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        nats_message_publisher: NatsMessagePublisher,
        execution_service: ExecutionService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            nats_connection_manager,
            nats_message_publisher,
            execution_service,
            config_service,
            _marker: PhantomData,
        }
    }

    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                info!(kind = M::KIND, "Starting execution listener...");
                match listener.listen().await {
                    Ok(_) => warn!(
                        kind = M::KIND,
                        "Execution listener exited normally (unexpected)"
                    ),
                    Err(e) => error!(kind = M::KIND, "Execution listener error: {:#}", e),
                }
                info!(
                    kind = M::KIND,
                    delay_ms = RECONNECTION_DELAY_MS,
                    "Reconnecting execution listener..."
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        let client = self.nats_connection_manager.get_client().await?;
        let machine_id = self.config_service.get_machine_id()?;

        let subject = format!("machine.{}.{}", machine_id, M::KIND);
        let mut subscriber = client
            .subscribe(subject.clone())
            .await
            .map_err(|e| anyhow!("failed to subscribe to {}: {}", subject, e))?;

        info!(subject = %subject, "Execution listener active");

        while let Some(message) = subscriber.next().await {
            if let Err(e) = self.handle_message(message, &machine_id).await {
                error!(
                    kind = M::KIND,
                    "Failed to handle execution message: {:#}", e
                );
            }
        }

        Ok(())
    }

    async fn handle_message(&self, message: Message, machine_id: &str) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        let parsed = match M::from_payload(&payload) {
            Ok(m) => m,
            Err(e) => {
                error!(kind = M::KIND, error = %e, "Failed to parse execution message, skipping");
                return Ok(());
            }
        };
        let execution_id = parsed.execution_id().to_string();
        info!(kind = M::KIND, execution_id = %execution_id, "Execution request received");

        let request = parsed.to_request();
        let result = self.execution_service.execute(&request, machine_id).await;

        info!(
            kind = M::KIND,
            execution_id = %execution_id,
            exit_code = result.exit_code,
            timed_out = result.timed_out,
            execution_time_ms = result.execution_time_ms,
            "Execution finished"
        );

        let result_subject = format!("machine.{}.{}.result", machine_id, M::KIND);
        if let Err(e) = self
            .nats_message_publisher
            .publish(&result_subject, &result)
            .await
        {
            error!(kind = M::KIND, execution_id = %execution_id, error = %e, "Failed to publish result");
        }

        Ok(())
    }
}
