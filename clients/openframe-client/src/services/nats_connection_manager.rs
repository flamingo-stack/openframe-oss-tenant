use anyhow::{Context, Result};
use async_nats::{Client, Event};
use tokio::sync::broadcast;
use tokio::sync::RwLock;
use tracing::{info, warn};
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::local_tls_config_provider::LocalTlsConfigProvider;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use log::error;
use crate::services::deactivation_service::DeactivationService;
use crate::services::{AgentAuthService, InitialConfigurationService};

/// Reconnect delay while the tenant is gone (suspended): backs the 5s storm off ~60x so a
/// deleted-tenant client barely touches the gateway. Auto-reverts to 5s on recovery.
const SUSPENDED_RECONNECT_DELAY: std::time::Duration = std::time::Duration::from_secs(5 * 60);

#[derive(Clone)]
pub struct NatsConnectionManager {
    client: Arc<RwLock<Option<Arc<Client>>>>,
    reconnect_tx: broadcast::Sender<()>,
    nats_server_url: String,
    config_service: AgentConfigurationService,
    tls_config_provider: LocalTlsConfigProvider,
    initial_configuration_service: InitialConfigurationService,
    auth_service: AgentAuthService,
    deactivation: Arc<DeactivationService>,
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
        deactivation: Arc<DeactivationService>,
    ) -> Self {
        let (reconnect_tx, _) = broadcast::channel(16);
        Self {
            client: Arc::new(RwLock::new(None)),
            reconnect_tx,
            nats_server_url: nats_server_url.to_string(),
            config_service,
            tls_config_provider,
            initial_configuration_service,
            auth_service,
            deactivation,
        }
    }

    pub fn subscribe_reconnect(&self) -> broadcast::Receiver<()> {
        self.reconnect_tx.subscribe()
    }

    pub async fn connect(&self) -> Result<()> {
        let machine_id = self.config_service.get_machine_id()?;

        info!(
            hostname = %self.nats_server_url,
            "Connecting to NATS server"
        );

        let connection_url = self.build_nats_connection_url().await?;

        // Cloned dependencies for auth callback
        let auth_service = self.auth_service.clone();
        let config_service = self.config_service.clone();
        let deactivation = self.deactivation.clone();
        let deactivation_for_delay = self.deactivation.clone();
        let nats_server_url = self.nats_server_url.clone();
        let nats_server_url_for_reconnect = self.nats_server_url.clone();
        let reconnect_tx = self.reconnect_tx.clone();
        let connected_once = Arc::new(AtomicBool::new(false));

        // TODO: token fallback and connection retry
        let mut connect_options = async_nats::ConnectOptions::new()
            .name(machine_id.clone())
            .user_and_password(Self::NATS_DEVICE_USER.to_string(), Self::NATS_DEVICE_PASSWORD.to_string())
            .retry_on_initial_connect()
            .max_reconnects(None)
            .reconnect_delay_callback(move |attempt| {
                // Tenant gone: async-nats can't be stopped from here (its reconnect loop never
                // polls Drain), but this callback IS called per attempt — so back off hard to
                // turn the 5s WS-upgrade storm into a rare probe against the gone gateway.
                if deactivation_for_delay.is_suspended() {
                    return SUSPENDED_RECONNECT_DELAY;
                }
                warn!(
                    attempt = attempt,
                    hostname = %nats_server_url_for_reconnect,
                    "NATS reconnect attempt"
                );
                std::time::Duration::from_secs(5)
            })
            .ping_interval(std::time::Duration::from_secs(10))
            .event_callback(move |event| {
                let reconnect_tx = reconnect_tx.clone();
                let connected_once = connected_once.clone();
                async move {
                    info!("Nats event: {:?}", event);
                    if matches!(event, Event::Connected)
                        && connected_once.swap(true, Ordering::SeqCst)
                    {
                        let _ = reconnect_tx.send(());
                    }
                }
            })
            .auth_url_callback(
                move |()| {
                    info!("Starting reauthentication");
                    let auth_service = auth_service.clone();
                    let config_service = config_service.clone();
                    let deactivation = deactivation.clone();
                    let nats_server_url = nats_server_url.clone();

                    async move {
                        Self::perform_reauthentication_and_build_url(auth_service, config_service, deactivation, nats_server_url).await
                    }
                }
            )
            .custom_header("X-MACHINE-ID", &machine_id);

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
        deactivation: Arc<DeactivationService>,
        nats_server_url: String,
    ) -> std::result::Result<String, async_nats::AuthError> {
        // Tenant gone: skip reauth so NATS reconnects fail locally instead of hammering the gateway.
        if deactivation.is_suspended() {
            return Err(async_nats::AuthError::new(
                "client suspended (tenant gone); skipping NATS reauthentication".to_string(),
            ));
        }

        info!(
            hostname = %nats_server_url,
            "Auth URL callback triggered - performing reauthentication"
        );

        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            auth_service.reauthenticate(),
        )
        .await
        {
            Ok(Ok(_)) => {
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
            Ok(Err(e)) => {
                error!("Reauthentication failed in auth_url_callback: {}", e);
                Err(async_nats::AuthError::new(format!("Reauthentication failed: {}", e)))
            }
            Err(_) => {
                error!("Reauthentication timed out in auth_url_callback after 10s");
                Err(async_nats::AuthError::new(
                    "Reauthentication timed out after 10s".to_string(),
                ))
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