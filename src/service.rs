use anyhow::{Context, Result};
use std::ffi::OsString;
use std::path::PathBuf;
use tracing::{error, info};
use tokio::runtime::Runtime;

use crate::{logging, platform::DirectoryManager, Agent};

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

const SERVICE_NAME: &str = "OpenFrameAgent";
const DISPLAY_NAME: &str = "OpenFrame Service";
const DESCRIPTION: &str = "OpenFrame system management and monitoring agent";

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
    pub async fn run(&self) -> Result<()> {
        info!("Starting OpenFrame agent service");
        
        // Initialize and start the agent
        let agent = Agent::new().await?;
        agent.start().await?;

        Ok(())
    }
} 