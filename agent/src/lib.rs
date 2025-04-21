use anyhow::Result;
use config::{Config, File};
use directories::ProjectDirs;
use semver;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::time::{sleep, Duration};
use tracing::{error, info};
use uuid::Uuid;

pub mod logging;
pub mod service;
pub mod system;
pub mod updater;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub url: String,
    pub check_interval: u64,
    pub update_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
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
pub struct Configuration {
    pub server: ServerConfig,
    pub agent: AgentConfig,
    pub metrics: MetricsConfig,
    pub security: SecurityConfig,
}

impl Default for Configuration {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                url: "https://api.openframe.org".to_string(),
                check_interval: 3600,
                update_url: None,
            },
            agent: AgentConfig {
                id: Uuid::new_v4().to_string(),
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

pub struct Agent {
    config: Configuration,
    config_path: PathBuf,
    updater: Option<updater::VelopackUpdater>,
    system_info: system::SystemInfo,
}

impl Agent {
    pub async fn new() -> Result<Self> {
        // Initialize logging first
        if let Err(e) = logging::init(None, None) {
            eprintln!("Failed to initialize logging: {}", e);
            return Err(e.into());
        }

        let proj_dirs = ProjectDirs::from("com", "openframe", "agent")
            .expect("Failed to determine project directories");

        let config_dir = proj_dirs.config_dir();
        std::fs::create_dir_all(config_dir)?;

        let config_path = config_dir.join("agent.toml");

        // Load configuration
        let config: Configuration = if config_path.exists() {
            Config::builder()
                .add_source(File::from(config_path.clone()))
                .build()?
                .try_deserialize()?
        } else {
            let default_config = Configuration::default();
            let config_str = toml::to_string_pretty(&default_config)?;
            std::fs::write(&config_path, config_str)?;
            default_config
        };

        // Initialize updater only if update URL is configured
        let updater = if config.server.update_url.is_some() {
            match updater::VelopackUpdater::new(
                semver::Version::parse(env!("CARGO_PKG_VERSION"))?,
                config.agent.update_channel.clone(),
                config.server.update_url.clone(),
            ) {
                Ok(updater) => Some(updater),
                Err(e) => {
                    error!(
                        "Failed to initialize updater: {}. Updates will be disabled.",
                        e
                    );
                    None
                }
            }
        } else {
            info!("No update URL configured, updates will be disabled");
            None
        };

        Ok(Self {
            updater,
            system_info: system::SystemInfo::new()?,
            config,
            config_path,
        })
    }

    pub async fn start(&self) -> Result<()> {
        info!("Starting OpenFrame...");
        info!("Agent ID: {}", self.config.agent.id);
        info!("Configuration loaded from: {}", self.config_path.display());
        info!("Server URL: {}", self.config.server.url);
        info!("Update channel: {}", self.config.agent.update_channel);

        // Initial update check - only if updater is configured
        if let Some(updater) = &self.updater {
            if let Err(e) = self.check_for_updates().await {
                error!("Initial update check failed: {}. Continuing startup...", e);
            }
        }

        // Main agent loop
        loop {
            // Collect and report metrics if enabled
            if self.config.metrics.enabled {
                if let Ok(metrics) = self.system_info.collect_metrics() {
                    info!("System metrics: {:?}", metrics);
                    // TODO: Send metrics to server
                }
            }

            // Check for updates - only if updater is configured
            if let Some(_) = &self.updater {
                if let Err(e) = self.check_for_updates().await {
                    error!("Update check failed: {}. Will retry at next interval.", e);
                }
            }

            // Wait for next interval
            sleep(Duration::from_secs(self.config.server.check_interval)).await;
        }
    }

    async fn check_for_updates(&self) -> Result<()> {
        if let Some(updater) = &self.updater {
            info!("Checking for updates...");
            match updater.check_for_updates() {
                Ok(Some(update)) => {
                    info!("New version available: {}", update.version);
                    if let Err(e) = updater.download_and_apply_update(&update) {
                        error!("Failed to download/apply update: {}", e);
                    }
                }
                Ok(None) => {
                    info!("No updates available");
                }
                Err(e) => {
                    error!("Update check failed: {}. Continuing agent operation...", e);
                }
            }
        }
        Ok(())
    }
}
