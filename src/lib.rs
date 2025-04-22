use crate::platform::DirectoryManager;
use config::Config;
use tokio::sync::RwLock;
use tracing::{error, info};
use anyhow::Result;
use std::sync::Arc;

pub struct Agent {
    config: Arc<RwLock<Configuration>>,
    directory_manager: DirectoryManager,
}

impl Agent {
    pub fn new() -> Result<Self> {
        let config = Arc::new(RwLock::new(Configuration::default()));
        let directory_manager = DirectoryManager::new();

        // Perform initial health check
        directory_manager.perform_health_check()?;

        Ok(Self {
            config,
            directory_manager,
        })
    }

    pub async fn start(&self) -> Result<()> {
        info!("Starting OpenFrame Agent");

        // Initialize logging
        let config_guard = self.config.read().await;
        info!(
            "Initializing logging with level: {}",
            config_guard.agent.log_level
        );
        drop(config_guard); // Release the lock

        // Initialize metrics collection
        metrics::init()?;

        // Start periodic health checks
        self.directory_manager.perform_health_check()?;

        // Start background tasks
        let config = self.config.clone();
        
        // Spawn metrics collection task if enabled
        let config_guard = config.read().await;
        if config_guard.metrics.enabled {
            let interval = config_guard.metrics.collection_interval;
            tokio::spawn(async move {
                loop {
                    // Collect and report metrics
                    if let Err(e) = metrics::collect_and_report().await {
                        error!("Failed to collect metrics: {}", e);
                    }
                    tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;
                }
            });
        }
        drop(config_guard); // Release the lock

        // Keep the agent running
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        #[allow(unreachable_code)]
        Ok(())
    }
}
