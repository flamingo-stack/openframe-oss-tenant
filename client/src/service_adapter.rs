use anyhow::{Context, Result};
use service_manager::{
    ServiceInstallCtx, ServiceLabel, ServiceManager, ServiceStartCtx, ServiceStopCtx,
    ServiceUninstallCtx,
};
use std::ffi::OsString;
use std::path::PathBuf;
use std::str::FromStr;

pub struct CrossPlatformServiceManager {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub exec_path: PathBuf,
}

impl CrossPlatformServiceManager {
    pub fn new(name: &str, display_name: &str, description: &str, exec_path: PathBuf) -> Self {
        Self {
            name: name.to_string(),
            display_name: display_name.to_string(),
            description: description.to_string(),
            exec_path,
        }
    }

    pub fn install(&self) -> Result<()> {
        // Create a service label - this is what the service manager uses to identify the service
        let label = ServiceLabel::from_str(&format!("com.openframe.{}", self.name.to_lowercase()))
            .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Create the installation context
        let ctx = ServiceInstallCtx {
            label: label.clone(),
            program: self.exec_path.clone(),
            args: vec![],
            contents: None,
            username: None,
            working_directory: None,
            environment: None,
            autostart: true,
            disable_restart_on_failure: false,
        };

        // Install the service using the platform's native service manager
        manager.install(ctx).context("Failed to install service")?;

        Ok(())
    }

    pub fn uninstall(&self) -> Result<()> {
        // Create a service label
        let label = ServiceLabel::from_str(&format!("com.openframe.{}", self.name.to_lowercase()))
            .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Create the uninstallation context
        let ctx = ServiceUninstallCtx { label };

        // Uninstall the service
        manager
            .uninstall(ctx)
            .context("Failed to uninstall service")?;

        Ok(())
    }

    pub fn start(&self) -> Result<()> {
        // Create a service label
        let label = ServiceLabel::from_str(&format!("com.openframe.{}", self.name.to_lowercase()))
            .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Create the start context
        let ctx = ServiceStartCtx { label };

        // Start the service
        manager.start(ctx).context("Failed to start service")?;

        Ok(())
    }

    pub fn stop(&self) -> Result<()> {
        // Create a service label
        let label = ServiceLabel::from_str(&format!("com.openframe.{}", self.name.to_lowercase()))
            .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Create the stop context
        let ctx = ServiceStopCtx { label };

        // Stop the service
        manager.stop(ctx).context("Failed to stop service")?;

        Ok(())
    }
}
