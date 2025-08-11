struct ToolInstallationMessageListener {
    nats_connection_manager: NatsConnectionManager
}

impl ToolInstallationMessageListener {

    const STREAM_NAME: &str = "TOOL_AGENT_INSTALLATION_MESSAGES";
    const DELIVER_SUBJECT_TEMPLATE: &str = "machine.{machine_id}.toolinstallation";

    pub fn new(nats_connection_manager: NatsConnectionManager, tool_installation_service: ToolInstallationService) -> Self {
        Self { nats_connection_manager, tool_installation_service }
    }

    pub async fn listen(&self) -> Result<()> {
        let client_guard = self.nats_connection_manager.client.read().await;
        if let Some(client) = &*client_guard {
            let jetstream = jetstream::new(client);

            let consumer: PushConsumer = self.create_consumer(jetstream).await?;
            let mut messages = consumer.messages().await?;

            while let Some(message) = messages.next().await {
                let message = message?;
                let payload = String::from_utf8_lossy(&message.payload);
                let tool_installation_message: ToolInstallationMessage = serde_json::from_str(&payload).unwrap();

                tool_installation_service.install(tool_installation_message).await?;

                message.ack().await.map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
            }
        }
        Ok(())
    }

    async fn create_consumer(jetstream: JetStream) -> PushConsumer {
        let deliver_subject = self.build_deliver_subject(machine_id);
        let consumer_configuration = self.build_consumer_configuration();
        jetstream.create_consumer(consumer_configuration).await?;
    }

    async fn build_consumer_configuration() -> jetstream::consumer::push::Config {
        return jetstream::consumer::push::Config {
            deliver_subject: deliver_subject.clone(),
            durable_name: Some(format!("device_{}_commands_consumer", device_id)),
            inactive_threshold: Duration::from_secs(60),
            ..Default::default()
        }
    }

    async fn build_deliver_subject(machine_id: String) -> String {
        format!(DELIVER_SUBJECT_TEMPLATE, machine_id)
    }
}


