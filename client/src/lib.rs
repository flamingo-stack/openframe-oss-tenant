use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::info;
use uuid;
use reqwest;

mod config;
mod metrics;
pub mod models;
pub mod platform;
pub mod clients;
pub mod services;

pub mod logging;
pub mod monitoring;
pub mod service;
/// Cross-platform service manager adapters
///
/// This module provides a unified interface to manage services across different
/// operating systems (Windows, macOS, Linux) using the `service-manager` crate.
/// It implements the adapter pattern to abstract platform-specific service
/// management details behind a common API.
pub mod service_adapter;
pub mod system;
pub mod updater;

use crate::platform::DirectoryManager;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::{AgentAuthService, AgentRegistrationService, InitialAuthenticationProcessor};
use crate::services::registration_processor::RegistrationProcessor;
use crate::clients::{RegistrationClient, AuthClient};
use crate::services::DeviceDataFetcher;
use crate::services::shared_token_service::SharedTokenService;
use crate::services::encryption_service::EncryptionService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub url: String,
    pub check_interval: u64,
    pub update_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfig {
    pub id: String,
    pub log_level: String,
    pub update_channel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsConfig {
    pub enabled: bool,
    pub collection_interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub tls_verify: bool,
    pub certificate_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfiguration {
    pub server: ServerConfig,
    pub client: ClientConfig,
    pub metrics: MetricsConfig,
    pub security: SecurityConfig,
}

impl Default for ClientConfiguration {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                url: "https://api.openframe.org".to_string(),
                check_interval: 3600,
                update_url: None,
            },
            client: ClientConfig {
                id: uuid::Uuid::new_v4().to_string(),
                log_level: "info".to_string(),
                update_channel: "stable".to_string(),
            },
            metrics: MetricsConfig {
                enabled: true,
                collection_interval: 60,
            },
            security: SecurityConfig {
                tls_verify: true,
                certificate_path: String::new(),
            },
        }
    }
}

pub struct Client {
    config: Arc<RwLock<ClientConfiguration>>,
    directory_manager: DirectoryManager,
    registration_processor: RegistrationProcessor,
    auth_processor: InitialAuthenticationProcessor,
}

impl Client {
    // TODO: get from args during installation and save to file during installation
    const GATEWAY_URL: &'static str = "https://openframe-gateway.192.168.100.100.nip.io";

    pub fn new() -> Result<Self> {
        let config = Arc::new(RwLock::new(ClientConfiguration::default()));

        // Check if in development mode
        let directory_manager = if std::env::var("OPENFRAME_DEV_MODE").is_ok() {
            info!("Client running in development mode, using user directories");
            DirectoryManager::for_development()
        } else {
            DirectoryManager::new()
        };

        // Perform initial health check
        directory_manager.perform_health_check()?;

        // Initialize configuration service
        let config_service = AgentConfigurationService::new(directory_manager.clone())
            .context("Failed to initialize device configuration service")?;

        // Initialize HTTP client
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .context("Failed to create HTTP client")?;

        // Initialize registration client
        let registration_client = RegistrationClient::new(
            Self::GATEWAY_URL.to_string(),
            http_client.clone()
        ).context("Failed to create registration client")?;
        
        // Initialize device data fetcher
        let device_data_fetcher = DeviceDataFetcher::new();
        
        // Initialize registration service
        let registration_service = AgentRegistrationService::new(
            registration_client,
            device_data_fetcher,
            config_service.clone()
        );
        
        // Initialize registration processor
        let registration_processor = RegistrationProcessor::new(
            registration_service,
            config_service.clone()
        );

        // Initialize authentication client
        let auth_client = AuthClient::new(
            Self::GATEWAY_URL.to_string(),
            http_client
        );
        
        // Initialize encryption service
        let encryption_service = EncryptionService::new();
        
        // Initialize shared token service
        let shared_token_service = SharedTokenService::new(
            directory_manager.clone(),
            encryption_service
        );
        
        // Initialize authentication service
        let auth_service = AgentAuthService::new(
            auth_client,
            config_service.clone(),
            shared_token_service
        );
        
        // Initialize authentication processor
        let auth_processor = InitialAuthenticationProcessor::new(
            auth_service,
            config_service
        );

        Ok(Self {
            config,
            directory_manager,
            registration_processor,
            auth_processor,
        })
    }

    pub async fn start(&self) -> Result<()> {
        info!("Starting OpenFrame Client");

        // Proccess initial registration and authentication 
        // if it haven't been done yet
        // Processors retry it till success
        self.registration_processor.process().await?;
        self.auth_processor.process().await?;

        // Initialize logging
        let config_guard = self.config.read().await;
        info!(
            "Initializing logging with level: {}",
            config_guard.client.log_level
        );
        drop(config_guard); // Release the lock

        // Initialize metrics collection
        metrics::init()?;

        // Start periodic health checks
        self.directory_manager.perform_health_check()?;

        // Keep the client running
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        #[allow(unreachable_code)]
        Ok(())
    }
}
