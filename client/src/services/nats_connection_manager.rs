use anyhow::{Context, Result};
use async_nats::Client;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::dev_tls_config_provider::DevTlsConfigProvider;
use std::sync::Arc;
use std::env;

#[derive(Clone)]
pub struct NatsConnectionManager {
    client: Arc<RwLock<Option<Arc<Client>>>>,
    nats_server_url: String,
    config_service: AgentConfigurationService,
    tls_config_provider: DevTlsConfigProvider,
}

impl NatsConnectionManager {

    const NATS_DEVICE_USER: &'static str = "machine";
    const NATS_DEVICE_PASSWORD: &'static str = "";
    
    pub fn new(nats_server_url: &str, config_service: AgentConfigurationService) -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            nats_server_url: nats_server_url.to_string(),
            config_service,
            tls_config_provider: DevTlsConfigProvider::new(),
        }
    }

    pub async fn connect(&self) -> Result<()> {
        info!("Connecting to NATS server");

        let connection_url = self.build_nats_connection_url().await?;
        let machine_id = self.config_service.get_machine_id().await?;
        
        // TODO: token fallback and connection retry
        let mut connect_options = async_nats::ConnectOptions::new()
            .name(machine_id)
            .user_and_password(Self::NATS_DEVICE_USER.to_string(), Self::NATS_DEVICE_PASSWORD.to_string())
            .max_reconnects(1000)
            .retry_on_initial_connect()
            .reconnect_delay_callback(|attempt| {
                println!("\n\nFallback: reconnecting to NATS server, attempt: {}\n\n", attempt);
                std::time::Duration::from_secs(1)
            });

        // Only add TLS config in development mode
        if env::var("OPENFRAME_DEV_MODE").is_ok() {
            let tls_config = self.tls_config_provider.create_tls_config()
                .context("Failed to create development TLS configuration")?;
            connect_options = connect_options.tls_client_config(tls_config);
        }

        let client = connect_options
            .connect(&connection_url)
            .await
            .context("Failed to connect to NATS server")?;

        *self.client.write().await = Some(Arc::new(client));

        Ok(())
    }

    async fn build_nats_connection_url(&self) -> Result<String> {
        let token = self.config_service.get_access_token().await?;
        let host = &self.nats_server_url;
        Ok(format!("{}/ws/nats?authorization={}", host, token))
    }

    pub async fn get_client(&self) -> Result<Arc<Client>> {
        let guard = self.client.read().await;
        guard
            .clone()
            .context("NATS client is not initialized. Call connect() first.")
    }
}