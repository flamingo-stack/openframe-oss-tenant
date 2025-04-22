use anyhow::Result;
use directories::ProjectDirs;
use semver;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};
use tracing::{error, info};
use uuid;

mod config;
mod metrics;
mod platform;

pub mod logging;
pub mod monitoring;
pub mod service;
pub mod system;
pub mod updater;

use crate::platform::DirectoryManager;

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
}

impl Client {
    pub fn new() -> Result<Self> {
        let config = Arc::new(RwLock::new(ClientConfiguration::default()));
        let directory_manager = DirectoryManager::new();

        // Perform initial health check
        directory_manager.perform_health_check()?;

        Ok(Self {
            config,
            directory_manager,
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

        // Keep the client running
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        #[allow(unreachable_code)]
        Ok(())
    }
}
