use anyhow::{Context, Result};
use async_nats::{Client, jetstream, jetstream::consumer::PushConsumer};
use futures::StreamExt;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{debug, info};

const NATS_SERVER_URL: &str = "ws://localhost:8100/ws/nats";

#[derive(Debug, Clone)]
pub struct NatsConnectionManager {
    client: Arc<RwLock<Option<Client>>>,
    nats_server_url: String,
    config_service: AgentConfigurationService,
}

impl NatsConnectionManager {
    
    const NATS_CONNECTION_URL_TEMPLATE: &str = "wss://{host}/ws/nats?authorization={token}";
    const NATS_DEVICE_USER: &str = "device";
    const NATS_DEVICE_PASSWORD: &str = "1234";
    
    pub fn new(nats_server_url: &str, config_service: AgentConfigurationService) -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            nats_server_url: nats_server_url.to_string(),
            config_service,
        }
    }

    pub async fn connect(&self) -> Result<()> {
        let connection_url = self.get_nats_connection_url().await?;
        let machine_id = self.config_service.get_machine_id().await?;

        let client = async_nats::ConnectOptions::new()
            .name(machine_id)
            .user_and_password(NATS_DEVICE_USER.to_string(), NATS_DEVICE_PASSWORD.to_string())
            .connect(NATS_SERVER_URL)
            .await
            .context("Failed to connect to NATS server")?;

        *self.client.write().await = Some(client);

        Ok(())
    }

     fn get_nats_connection_url(&self) -> String {
        let token = self.config_service.get_token().await?;
        let host = self.nats_server_url;
        format!(NATS_CONNECTION_URL_TEMPLATE, host, token)
    }
}