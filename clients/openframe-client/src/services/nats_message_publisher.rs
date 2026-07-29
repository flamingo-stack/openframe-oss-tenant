use crate::services::nats_connection_manager::NatsConnectionManager;
use anyhow::{Context, Result};
use serde::Serialize;

#[derive(Clone)]
pub struct NatsMessagePublisher {
    nats_connection_manager: NatsConnectionManager,
}

impl NatsMessagePublisher {
    pub fn new(nats_connection_manager: NatsConnectionManager) -> Self {
        Self {
            nats_connection_manager,
        }
    }

    pub async fn publish<T: Serialize>(&self, subject: &str, payload: T) -> Result<()> {
        let payload_json =
            serde_json::to_string(&payload).context("Failed to serialize payload")?;

        let client = self.nats_connection_manager.get_client().await?;

        client
            .publish(subject.to_string(), payload_json.into())
            .await
            .context("Failed to publish message to NATS")?;
        client
            .flush()
            .await
            .context("Failed to flush NATS publish")?;
        Ok(())
    }

    pub async fn publish_raw(&self, subject: &str, bytes: &[u8]) -> Result<()> {
        let client = self.nats_connection_manager.get_client().await?;

        client
            .publish(subject.to_string(), bytes.to_vec().into())
            .await
            .context("Failed to publish message to NATS")?;
        client
            .flush()
            .await
            .context("Failed to flush NATS publish")?;
        Ok(())
    }
}

impl crate::services::result_store::ResultPublisher for NatsMessagePublisher {
    fn publish_raw(
        &self,
        subject: &str,
        bytes: &[u8],
    ) -> impl std::future::Future<Output = Result<()>> + Send {
        NatsMessagePublisher::publish_raw(self, subject, bytes)
    }
}
