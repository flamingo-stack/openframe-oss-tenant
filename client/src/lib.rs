use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info};
use uuid;

mod config;
mod metrics;
pub mod platform;

pub mod logging;
pub mod monitoring;
pub mod nats;
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
use crate::nats::NatsService;

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
    nats_service: NatsService,
}

impl Client {
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

        Ok(Self {
            config,
            directory_manager,
            nats_service: NatsService::new(),
        })
    }

    pub async fn start(&self) -> Result<()> {
        info!("Starting OpenFrame Client");

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

        // After registration and auth, connect to NATS
        info!("Connecting to NATS server for device commands");
        if let Err(e) = self.nats_service.connect().await {
            error!("Failed to connect to NATS: {:?}", e);
            error!("Error chain: {:#}", e);
            return Err(e);
        }

        // Subscribe to device commands topic
        let device_id = "123";
        
        let commands_topic = format!("device/{}/commands", device_id);
        info!("Subscribing to device commands topic: {}", commands_topic);

        // if let Err(e) = self.nats_service.subscribe_and_log(&commands_topic).await {
        //     error!("Failed to subscribe to device commands: {}", e);
        //     return Err(e);
        // }

        // info!("Successfully connected to NATS and subscribed to device commands");


        // if let Err(e) = self.nats_service.subscribe_and_log("$SYS.SERVER.*.CLIENT.CONNECT").await {
        //     error!("Failed to subscribe to SYS.SERVER.*.CLIENT.CONNECT: {}", e);
        //     return Err(e);
        // }

        // info!("Successfully subscribed to SYS.SERVER.*.CLIENT.CONNECT");


        // Keep the client running
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        #[allow(unreachable_code)]
        Ok(())
    }
}
