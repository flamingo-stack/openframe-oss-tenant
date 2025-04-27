use anyhow::{Context, Result};
use std::ffi::OsString;
use std::path::PathBuf;
use tokio::runtime::Runtime;
use tokio::time::{interval, Duration};
use tracing::{error, info};

use crate::{logging, platform::DirectoryManager, Client};

#[cfg(windows)]
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};

#[cfg(unix)]
use daemonize::Daemonize;

const SERVICE_NAME: &str = "OpenFrameClient";
const DISPLAY_NAME: &str = "OpenFrame Client";
const DESCRIPTION: &str = "OpenFrame client for remote management and monitoring";

pub struct Service;

impl Service {
    pub fn new() -> Self {
        Self
    }

    #[cfg(windows)]
    pub async fn install() -> Result<()> {
        // Windows-specific installation code
        Ok(())
    }

    #[cfg(unix)]
    pub async fn install() -> Result<()> {
        // Initialize directory manager
        let dir_manager = DirectoryManager::new();

        // Perform health check which will create directories and set permissions
        dir_manager
            .perform_health_check()
            .map_err(|e| anyhow::anyhow!("Directory health check failed: {}", e))?;

        info!("Unix daemon installation completed");
        Ok(())
    }

    #[cfg(windows)]
    pub async fn uninstall() -> Result<()> {
        // Windows-specific uninstallation code
        Ok(())
    }

    #[cfg(unix)]
    pub async fn uninstall() -> Result<()> {
        // Initialize directory manager to get paths
        let dir_manager = DirectoryManager::new();

        // Remove service files
        let _ = std::fs::remove_dir_all(dir_manager.app_support_dir());
        let _ = std::fs::remove_dir_all(dir_manager.logs_dir());

        info!("Unix daemon uninstalled successfully");
        Ok(())
    }

    #[cfg(windows)]
    pub async fn run() -> Result<()> {
        // Windows-specific run code
        Ok(())
    }

    #[cfg(unix)]
    pub async fn run() -> Result<()> {
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
            let mut interval = interval(Duration::from_secs(5)); // Log every 5 minutes
            loop {
                interval.tick().await;
                let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                info!("OpenFrame service is running [heartbeat: {}]", timestamp);
            }
        });

        // Start the client
        client.start().await
    }

    #[cfg(target_os = "macos")]
    pub async fn run_as_service() -> Result<()> {
        info!("Running as macOS LaunchDaemon service");

        // For macOS, we don't need to daemonize as the LaunchDaemon system handles it
        // Just run the main service function directly
        Self::run().await
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    pub async fn run_as_service() -> Result<()> {
        // Get current username
        let username = whoami::username();
        info!("Starting service as user: {}", username);

        // Initialize directory manager
        let dir_manager = DirectoryManager::new();

        // Perform health check before daemonizing
        if let Err(e) = dir_manager.perform_health_check() {
            error!("Directory health check failed: {}", e);
            return Err(e.into());
        }

        // For other Unix systems, create a temporary pid file in the app support directory
        let pid_file_path = format!("/tmp/openframe_{}.pid", std::process::id());

        let daemonize = Daemonize::new()
            .pid_file(&pid_file_path)
            .chown_pid_file(true)
            .working_directory(dir_manager.app_support_dir())
            .user(username.as_str())
            .group("wheel")
            .umask(0o022);

        info!("Starting daemon with configuration");
        match daemonize.start() {
            Ok(_) => {
                info!("Daemon started successfully");
                Self::run().await
            }
            Err(e) => {
                error!("Failed to start daemon: {}", e);
                Err(e.into())
            }
        }
    }
}
