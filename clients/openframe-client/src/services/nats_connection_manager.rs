use anyhow::{Context, Result};
use async_nats::Client;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::local_tls_config_provider::LocalTlsConfigProvider;
use std::sync::Arc;
use std::env;
use log::error;
use crate::services::{AgentAuthService, InitialConfigurationService};

#[derive(Clone)]
pub struct NatsConnectionManager {
    client: Arc<RwLock<Option<Arc<Client>>>>,
    nats_server_url: String,
    config_service: AgentConfigurationService,
    tls_config_provider: LocalTlsConfigProvider,
    initial_configuration_service: InitialConfigurationService,
    auth_service: AgentAuthService
}

impl NatsConnectionManager {

    const NATS_DEVICE_USER: &'static str = "machine";
    const NATS_DEVICE_PASSWORD: &'static str = "";
    
    pub fn new(
        nats_server_url: String,
        config_service: AgentConfigurationService,
        initial_configuration_service: InitialConfigurationService,
        auth_service: AgentAuthService,
        tls_config_provider: LocalTlsConfigProvider,
    ) -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
            nats_server_url: nats_server_url.to_string(),
            config_service,
            tls_config_provider,
            initial_configuration_service,
            auth_service
        }
    }

    pub async fn connect(&self) -> Result<()> {
        info!("Connecting to NATS server");

        let connection_url = self.build_nats_connection_url().await?;
        let machine_id = self.config_service.get_machine_id().await?;

        // Cloned dependencies for auth callback
        let auth_service = self.auth_service.clone();
        let config_service = self.config_service.clone();
        let nats_server_url = self.nats_server_url.clone();
        
        // TODO: token fallback and connection retry
        let mut connect_options = async_nats::ConnectOptions::new()
            .name(machine_id)
            .user_and_password(Self::NATS_DEVICE_USER.to_string(), Self::NATS_DEVICE_PASSWORD.to_string())
            .retry_on_initial_connect()
            .reconnect_delay_callback(|attempt| {
                std::time::Duration::from_secs(5)
            })
            .ping_interval(std::time::Duration::from_secs(10))
            .event_callback(|event| async move {
                info!("Nats event: {:?}", event);
            })
            .auth_url_callback(
                move |()| {
                    info!("Starting reauthentication");
                    let auth_service = auth_service.clone();
                    let config_service = config_service.clone();
                    let nats_server_url = nats_server_url.clone();

                    async move {
                        Self::perform_reauthentication_and_build_url(auth_service, config_service, nats_server_url).await
                    }
                }
            );

        // Only add TLS config in development mode
        if self.initial_configuration_service.is_local_mode()? {
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

    async fn perform_reauthentication_and_build_url(
        auth_service: AgentAuthService,
        config_service: AgentConfigurationService,
        nats_server_url: String,
    ) -> std::result::Result<String, async_nats::AuthError> {
        info!("Auth URL callback triggered - performing reauthentication");

        match auth_service.reauthenticate().await {
            Ok(_) => {
                info!("Reauthentication successful in auth_url_callback");

                match config_service.get_access_token().await {
                    Ok(token) => {
                        let new_url = format!("{}/ws/nats?authorization={}", nats_server_url, token);
                        info!("Built new NATS URL with fresh token");
                        Ok(new_url)
                    }
                    Err(e) => {
                        error!("Failed to get access token after reauthentication: {}", e);
                        Err(async_nats::AuthError::new(format!("Failed to get token: {}", e)))
                    }
                }
            }
            Err(e) => {
                error!("Reauthentication failed in auth_url_callback: {}", e);
                Err(async_nats::AuthError::new(format!("Reauthentication failed: {}", e)))
            }
        }
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