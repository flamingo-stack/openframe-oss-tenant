use anyhow::{Context, Result};
use serde::Serialize;

use crate::services::nats_connection_manager::NatsConnectionManager;

#[derive(Clone)]
pub struct NatsMessagePublisher {
    nats_connection_manager: NatsConnectionManager,
}

impl NatsMessagePublisher {
    /// Creates a NATS message publisher using the provided connection manager.
    
    ///
    
    /// # Examples
    
    ///
    
    /// ```ignore
    
    /// let publisher = NatsMessagePublisher::new(nats_connection_manager);
    
    /// ```
    pub fn new(nats_connection_manager: NatsConnectionManager) -> Self {
        Self {
            nats_connection_manager,
        }
    }

    /// Publishes a serializable payload as a JSON message to a NATS subject.
    ///
    /// # Errors
    ///
    /// Returns an error if the payload cannot be serialized or the message cannot be published.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(publisher: &NatsMessagePublisher) -> anyhow::Result<()> {
    /// publisher
    ///     .publish("events.created", serde_json::json!({ "id": 42 }))
    ///     .await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn publish<T: Serialize>(&self, subject: &str, payload: T) -> Result<()> {
        let json = serde_json::to_string(&payload).context("Failed to serialize NATS payload")?;

        let client = self.nats_connection_manager.get_client().await?;

        client
            .publish(subject.to_string(), json.into())
            .await
            .context("Failed to publish message to NATS")
    }
}
