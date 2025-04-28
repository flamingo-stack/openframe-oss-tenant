use anyhow::{Context, Result};
use std::path::PathBuf;
use tokio::runtime::Runtime;
use tokio::time::{interval, Duration};
use tracing::{error, info};

use crate::service_adapter::CrossPlatformServiceManager;
use crate::{logging, platform::DirectoryManager, Client};

const SERVICE_NAME: &str = "OpenFrameClient";
const DISPLAY_NAME: &str = "OpenFrame Client";
const DESCRIPTION: &str = "OpenFrame client for remote management and monitoring";

pub struct Service;

impl Service {
    pub fn new() -> Self {
        Self
    }

    /// Install the service on the current platform
    pub async fn install() -> Result<()> {
        // Common code for all platforms
        info!("Installing OpenFrame service");
        let dir_manager = DirectoryManager::new();
        dir_manager
            .perform_health_check()
            .map_err(|e| anyhow::anyhow!("Directory health check failed: {}", e))?;

        // Get the current executable path
        let exec_path = std::env::current_exe().context("Failed to get current executable path")?;

        // Create the service manager
        let service =
            CrossPlatformServiceManager::new(SERVICE_NAME, DISPLAY_NAME, DESCRIPTION, exec_path);

        // Call the cross-platform service manager to install
        service.install().context("Failed to install service")?;

        info!("OpenFrame service installed successfully");
        Ok(())
    }

    /// Uninstall the service on the current platform
    pub async fn uninstall() -> Result<()> {
        // Common code for all platforms
        info!("Uninstalling OpenFrame service");

        // Get the current executable path
        let exec_path = std::env::current_exe().context("Failed to get current executable path")?;

        // Create the service manager
        let service =
            CrossPlatformServiceManager::new(SERVICE_NAME, DISPLAY_NAME, DESCRIPTION, exec_path);

        // Call the cross-platform service manager to uninstall
        service.uninstall().context("Failed to uninstall service")?;

        // Clean up common directories
        let dir_manager = DirectoryManager::new();
        let _ = std::fs::remove_dir_all(dir_manager.app_support_dir());
        let _ = std::fs::remove_dir_all(dir_manager.logs_dir());

        info!("OpenFrame service uninstalled successfully");
        Ok(())
    }

    /// Run the service core logic
    pub async fn run() -> Result<()> {
        // Common code for all platforms
        info!("Starting OpenFrame service core");

        // Initialize directory manager
        let dir_manager = DirectoryManager::new();

        // Perform health check before starting
        if let Err(e) = dir_manager.perform_health_check() {
            error!("Directory health check failed: {}", e);
            return Err(e.into());
        }

        // Initialize the client
        let client = Client::new()?;

        // Start heartbeat logging in background
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(5)); // Log heartbeat every 5 seconds
            loop {
                interval.tick().await;
                let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                info!(
                    "Hello from the other side, this is the OpenFrame service [heartbeat: {}]",
                    timestamp
                );
            }
        });

        // Start the client
        client.start().await
    }

    /// Run as a service on the current platform
    pub async fn run_as_service() -> Result<()> {
        // Get the current executable path for service operations
        let exec_path = std::env::current_exe().context("Failed to get current executable path")?;

        // Create the service manager for service operations if needed
        let service =
            CrossPlatformServiceManager::new(SERVICE_NAME, DISPLAY_NAME, DESCRIPTION, exec_path);

        // Log which platform we're running on
        #[cfg(target_os = "windows")]
        let platform = "Windows Service";
        #[cfg(target_os = "macos")]
        let platform: &str = "macOS LaunchDaemon";
        #[cfg(all(unix, not(target_os = "macos")))]
        let platform = "Linux systemd";

        info!("Running as {} service", platform);

        // For all platforms, just run the main service function
        Self::run().await
    }
}
