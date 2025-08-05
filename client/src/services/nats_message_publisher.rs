struct NatsMessagePublisher {
    nats_connection_manager: NatsConnectionManager,
}

impl NatsMessagePublisher {
    pub fn new(nats_connection_manager: NatsConnectionManager) -> Self {
        Self { nats_connection_manager }
    }

    pub async fn publish<T: Serialize>(&self, subject: &str, payload: T) -> Result<()> {
        let payload_json = serde_json::to_string(&payload).context("Failed to serialize payload")?;
        self.nats_connection_manager.publish(subject, payload_json.into()).await
    }
}