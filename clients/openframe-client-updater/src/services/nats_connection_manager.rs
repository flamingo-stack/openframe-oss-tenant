use anyhow::{Context, Result};
use async_nats::Client;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info, warn};

use crate::services::agent_auth_service::AgentAuthService;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::initial_configuration_service::InitialConfigurationService;
use crate::services::local_tls_config_provider::LocalTlsConfigProvider;

#[derive(Clone)]
pub struct NatsConnectionManager {
    client: Arc<RwLock<Option<Arc<Client>>>>,
    nats_server_url: String,
    config_service: AgentConfigurationService,
    initial_configuration_service: InitialConfigurationService,
    auth_service: AgentAuthService,
    tls_config_provider: LocalTlsConfigProvider,
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
            nats_server_url,
            config_service,
            initial_configuration_service,
            auth_service,
            tls_config_provider,
        }
    }

    pub async fn connect(&self) -> Result<()> {
        let machine_id = self.config_service.get_machine_id().await?;

        info!(hostname = %self.nats_server_url, "Connecting to NATS server");

        let connection_url = self.build_nats_connection_url().await?;

        let auth_service = self.auth_service.clone();
        let config_service = self.config_service.clone();
        let nats_server_url = self.nats_server_url.clone();
        let nats_server_url_for_reconnect = self.nats_server_url.clone();

        let mut connect_options = async_nats::ConnectOptions::new()
            .name(machine_id.clone())
            .user_and_password(
                Self::NATS_DEVICE_USER.to_string(),
                Self::NATS_DEVICE_PASSWORD.to_string(),
            )
            .retry_on_initial_connect()
            .reconnect_delay_callback(move |attempt| {
                warn!(
                    attempt = attempt,
                    hostname = %nats_server_url_for_reconnect,
                    "NATS reconnect attempt"
                );
                std::time::Duration::from_secs(5)
            })
            .ping_interval(std::time::Duration::from_secs(10))
            .event_callback(|event| async move {
                info!("NATS event: {:?}", event);
            })
            .auth_url_callback(move |()| {
                info!("Auth URL callback triggered — reauthenticating");
                let auth_service = auth_service.clone();
                let config_service = config_service.clone();
                let nats_server_url = nats_server_url.clone();

                async move {
                    Self::reauthenticate_and_build_url(auth_service, config_service, nats_server_url).await
                }
            });

        if self.initial_configuration_service.is_local_mode()? {
            let tls_config = self.tls_config_provider
                .create_tls_config()
                .context("Failed to create local-mode TLS configuration")?;
            connect_options = connect_options.tls_client_config(tls_config);
        }

        let client: Client = connect_options
            .connect(&connection_url)
            .await
            .context("Failed to connect to NATS server")?;

        *self.client.write().await = Some(Arc::new(client));

        info!("Connected to NATS server");
        Ok(())
    }

    async fn reauthenticate_and_build_url(
        auth_service: AgentAuthService,
        config_service: AgentConfigurationService,
        nats_server_url: String,
    ) -> std::result::Result<String, async_nats::AuthError> {
        match auth_service.reauthenticate().await {
            Ok(_) => match config_service.get_access_token().await {
                Ok(token) => {
                    let url = format!("{}/ws/nats?authorization={}", nats_server_url, token);
                    info!("Built new NATS URL after reauthentication");
                    Ok(url)
                }
                Err(e) => {
                    error!("Failed to get access token after reauthentication: {}", e);
                    Err(async_nats::AuthError::new(format!("Failed to get token: {}", e)))
                }
            },
            Err(e) => {
                error!("Reauthentication failed: {}", e);
                Err(async_nats::AuthError::new(format!("Reauthentication failed: {}", e)))
            }
        }
    }

    async fn build_nats_connection_url(&self) -> Result<String> {
        let token = self.config_service.get_access_token().await?;
        Ok(format!("{}/ws/nats?authorization={}", self.nats_server_url, token))
    }

    pub async fn get_client(&self) -> Result<Arc<Client>> {
        self.client
            .read()
            .await
            .clone()
            .context("NATS client not initialized — call connect() first")
    }
}
