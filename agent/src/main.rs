use anyhow::Result;
use config::{Config, File};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::time::{sleep, Duration};
use tracing::{error, info, Level};
use tracing_subscriber::FmtSubscriber;
use uuid::Uuid;

mod service;
mod system;
mod updater;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ServerConfig {
    url: String,
    check_interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AgentConfig {
    id: String,
    log_level: String,
    update_channel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MetricsConfig {
    enabled: bool,
    collection_interval: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SecurityConfig {
    tls_verify: bool,
    certificate_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Configuration {
    server: ServerConfig,
    agent: AgentConfig,
    metrics: MetricsConfig,
    security: SecurityConfig,
}

impl Default for Configuration {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                url: "https://api.openframe.org".to_string(),
                check_interval: 3600,
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

struct Agent {
    config: Configuration,
    config_path: PathBuf,
    updater: updater::VelopackUpdater,
    system_info: system::SystemInfo,
}

impl Agent {
    async fn new() -> Result<Self> {
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

        // Clone config for updater initialization
        let update_channel = config.agent.update_channel.clone();

        Ok(Self {
            updater: updater::VelopackUpdater::new(&update_channel)?,
            system_info: system::SystemInfo::new()?,
            config,
            config_path,
        })
    }

    async fn start(&self) -> Result<()> {
        info!("Starting OpenFrame Agent...");
        info!("Agent ID: {}", self.config.agent.id);
        info!("Configuration loaded from: {}", self.config_path.display());
        info!("Server URL: {}", self.config.server.url);
        info!("Update channel: {}", self.config.agent.update_channel);

        // Initial update check
        self.check_for_updates().await?;

        // Main agent loop
        loop {
            // Collect and report metrics if enabled
            if self.config.metrics.enabled {
                if let Ok(metrics) = self.system_info.collect_metrics() {
                    info!("System metrics: {:?}", metrics);
                    // TODO: Send metrics to server
                }
            }

            // Check for updates
            self.check_for_updates().await?;

            // Wait for next interval
            sleep(Duration::from_secs(self.config.server.check_interval)).await;
        }
    }

    async fn check_for_updates(&self) -> Result<()> {
        info!("Checking for updates...");
        if let Some(update) = self.updater.check_for_updates().await? {
            info!("New version available: {}", update.version);
            self.updater.download_and_apply_update(update).await?;
        }
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    FmtSubscriber::builder()
        .with_max_level(Level::DEBUG)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_thread_names(true)
        .with_env_filter("info")
        .pretty()
        .init();

    // Initialize the agent
    match Agent::new().await {
        Ok(agent) => {
            if let Err(e) = agent.start().await {
                error!("Agent error: {}", e);
                std::process::exit(1);
            }
        }
        Err(e) => {
            error!("Failed to initialize agent: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}
