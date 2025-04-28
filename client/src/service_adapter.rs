use anyhow::{Context, Result};
use service_manager::{
    ServiceInstallCtx, ServiceLabel, ServiceManager, ServiceStartCtx, ServiceStopCtx,
    ServiceUninstallCtx,
};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use tracing::{debug, info, warn};

#[derive(Debug, Clone)]
pub struct ServiceConfig {
    // Basic service information
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub exec_path: PathBuf,

    // Process control
    pub run_at_load: bool,
    pub keep_alive: bool,
    pub restart_on_crash: bool,
    pub restart_throttle_seconds: u32,

    // Environment
    pub working_directory: Option<PathBuf>,
    pub environment_vars: Vec<(String, String)>,

    // Logging
    pub stdout_path: Option<PathBuf>,
    pub stderr_path: Option<PathBuf>,

    // Identity
    pub user_name: Option<String>,
    pub group_name: Option<String>,

    // Resource control
    pub file_limit: Option<u32>,
    pub exit_timeout_seconds: Option<u32>,

    // Process type - maps to Interactive on macOS
    pub is_interactive: bool,
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            name: "".to_string(),
            display_name: "".to_string(),
            description: "".to_string(),
            exec_path: PathBuf::new(),
            run_at_load: true,
            keep_alive: true,
            restart_on_crash: true,
            restart_throttle_seconds: 10,
            working_directory: None,
            environment_vars: vec![],
            stdout_path: None,
            stderr_path: None,
            user_name: None,
            group_name: None,
            file_limit: None,
            exit_timeout_seconds: None,
            is_interactive: true,
        }
    }
}

pub struct CrossPlatformServiceManager {
    pub config: ServiceConfig,
}

impl CrossPlatformServiceManager {
    pub fn new(name: &str, display_name: &str, description: &str, exec_path: PathBuf) -> Self {
        Self {
            config: ServiceConfig {
                name: name.to_string(),
                display_name: display_name.to_string(),
                description: description.to_string(),
                exec_path,
                ..ServiceConfig::default()
            },
        }
    }

    pub fn with_config(config: ServiceConfig) -> Self {
        Self { config }
    }

    pub fn set_stdout_path(&mut self, path: PathBuf) -> &mut Self {
        self.config.stdout_path = Some(path);
        self
    }

    pub fn set_stderr_path(&mut self, path: PathBuf) -> &mut Self {
        self.config.stderr_path = Some(path);
        self
    }

    pub fn set_working_directory(&mut self, path: PathBuf) -> &mut Self {
        self.config.working_directory = Some(path);
        self
    }

    pub fn set_user(&mut self, user: &str) -> &mut Self {
        self.config.user_name = Some(user.to_string());
        self
    }

    pub fn set_group(&mut self, group: &str) -> &mut Self {
        self.config.group_name = Some(group.to_string());
        self
    }

    pub fn set_restart_throttle(&mut self, seconds: u32) -> &mut Self {
        self.config.restart_throttle_seconds = seconds;
        self
    }

    pub fn set_file_limit(&mut self, limit: u32) -> &mut Self {
        self.config.file_limit = Some(limit);
        self
    }

    pub fn set_exit_timeout(&mut self, timeout: u32) -> &mut Self {
        self.config.exit_timeout_seconds = Some(timeout);
        self
    }

    pub fn install(&self) -> Result<()> {
        // Create a service label - this is what the service manager uses to identify the service
        let label = ServiceLabel::from_str(&format!(
            "com.openframe.{}",
            self.config.name.to_lowercase()
        ))
        .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Set working directory to specified one or default
        let working_dir = self
            .config
            .working_directory
            .clone()
            .unwrap_or_else(|| self.get_app_support_dir());

        debug!(
            "Setting service working directory to: {}",
            working_dir.display()
        );

        // Get environment variables to pass to the service
        let mut environment = self.config.environment_vars.clone();

        // Add platform-specific environment variables
        self.add_platform_specific_env(&mut environment);

        // Create the installation context with full configuration
        let mut ctx = ServiceInstallCtx {
            label: label.clone(),
            program: self.config.exec_path.clone(),
            args: vec![OsString::from("run-as-service")],
            contents: None,
            username: self.get_service_username(),
            working_directory: Some(working_dir),
            environment: Some(environment),
            autostart: self.config.run_at_load,
            disable_restart_on_failure: !self.config.restart_on_crash,
        };

        // Apply platform-specific configuration
        self.apply_platform_specific_config(&mut ctx);

        // Install the service using the platform's native service manager
        info!("Installing service with full configuration via CrossPlatformServiceManager");
        manager.install(ctx).context("Failed to install service")?;

        // After installation, create platform-specific configurations
        self.create_platform_specific_files()?;

        // After installation, start the service to ensure it's running
        self.start()?;

        Ok(())
    }

    pub fn uninstall(&self) -> Result<()> {
        // Create a service label
        let label = ServiceLabel::from_str(&format!(
            "com.openframe.{}",
            self.config.name.to_lowercase()
        ))
        .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // First try to stop the service if it's running
        let _ = self.stop();

        // Create the uninstallation context
        let ctx = ServiceUninstallCtx { label };

        // Remove platform-specific files
        self.remove_platform_specific_files();

        // Uninstall the service
        info!("Uninstalling service via CrossPlatformServiceManager");
        manager
            .uninstall(ctx)
            .context("Failed to uninstall service")?;

        Ok(())
    }

    pub fn start(&self) -> Result<()> {
        // Create a service label
        let label = ServiceLabel::from_str(&format!(
            "com.openframe.{}",
            self.config.name.to_lowercase()
        ))
        .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Create the start context
        let ctx = ServiceStartCtx { label };

        // Start the service
        info!("Starting service via CrossPlatformServiceManager");
        manager.start(ctx).context("Failed to start service")?;

        Ok(())
    }

    pub fn stop(&self) -> Result<()> {
        // Create a service label
        let label = ServiceLabel::from_str(&format!(
            "com.openframe.{}",
            self.config.name.to_lowercase()
        ))
        .context("Failed to create service label")?;

        // Get the native service manager for this platform
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service management platform")?;

        // Create the stop context
        let ctx = ServiceStopCtx { label };

        // Stop the service
        info!("Stopping service via CrossPlatformServiceManager");
        manager.stop(ctx).context("Failed to stop service")?;

        Ok(())
    }

    // Platform-specific helpers

    fn add_platform_specific_env(&self, environment: &mut Vec<(String, String)>) {
        #[cfg(target_os = "macos")]
        {
            // Add any macOS-specific environment variables
        }

        #[cfg(target_os = "windows")]
        {
            // Add any Windows-specific environment variables
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            // Add any Linux-specific environment variables
        }
    }

    fn apply_platform_specific_config(&self, ctx: &mut ServiceInstallCtx) {
        #[cfg(target_os = "macos")]
        {
            // macOS-specific settings are primarily handled via plist file
        }

        #[cfg(target_os = "windows")]
        {
            // Windows-specific settings would be applied here
            // Windows service manager doesn't support all the same options
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            // Linux-specific settings would be applied here
            // For systemd, many settings require a custom .service file
        }
    }

    fn create_platform_specific_files(&self) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            // Create a launchd plist file with extended options
            if let Some(stdout_path) = &self.config.stdout_path {
                if let Some(parent) = stdout_path.parent() {
                    std::fs::create_dir_all(parent).ok();
                }
            }

            if let Some(stderr_path) = &self.config.stderr_path {
                if let Some(parent) = stderr_path.parent() {
                    std::fs::create_dir_all(parent).ok();
                }
            }

            // Could create a custom plist with additional settings if needed
            // But not strictly necessary since launchd service is already registered
        }

        #[cfg(target_os = "windows")]
        {
            // Windows services don't typically need additional files
            // Could potentially configure extended options via registry
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            // Create systemd service file with extended options
            let service_name = format!("com.openframe.{}.service", self.config.name.to_lowercase());
            let service_path = PathBuf::from("/etc/systemd/system").join(&service_name);

            let mut service_content = String::new();
            service_content.push_str("[Unit]\n");
            service_content.push_str(&format!("Description={}\n", self.config.description));
            service_content.push_str("After=network.target\n\n");

            service_content.push_str("[Service]\n");
            service_content.push_str(&format!(
                "ExecStart={} run-as-service\n",
                self.config.exec_path.display()
            ));

            if let Some(ref working_dir) = self.config.working_directory {
                service_content.push_str(&format!("WorkingDirectory={}\n", working_dir.display()));
            }

            if let Some(ref user) = self.config.user_name {
                service_content.push_str(&format!("User={}\n", user));
            }

            if let Some(ref group) = self.config.group_name {
                service_content.push_str(&format!("Group={}\n", group));
            }

            // Handle restart settings
            if self.config.restart_on_crash {
                service_content.push_str("Restart=on-failure\n");
                service_content.push_str(&format!(
                    "RestartSec={}\n",
                    self.config.restart_throttle_seconds
                ));
            }

            // Handle stdout/stderr redirection
            if let Some(ref stdout_path) = self.config.stdout_path {
                service_content
                    .push_str(&format!("StandardOutput=file:{}\n", stdout_path.display()));
            }

            if let Some(ref stderr_path) = self.config.stderr_path {
                service_content
                    .push_str(&format!("StandardError=file:{}\n", stderr_path.display()));
            }

            // LimitNOFILE corresponds to NumberOfFiles in macOS
            if let Some(file_limit) = self.config.file_limit {
                service_content.push_str(&format!("LimitNOFILE={}\n", file_limit));
            }

            // Add timeout settings
            if let Some(timeout) = self.config.exit_timeout_seconds {
                service_content.push_str(&format!("TimeoutStopSec={}\n", timeout));
            }

            service_content.push_str("\n[Install]\nWantedBy=multi-user.target\n");

            // Only attempt to write if we have permission (running as root)
            // Otherwise service-manager will handle the basic installation
            if let Ok(metadata) = std::fs::metadata("/etc/systemd/system") {
                if metadata.permissions().readonly() {
                    warn!("Cannot write systemd service file - not running as root");
                } else {
                    if let Err(e) = std::fs::write(&service_path, service_content) {
                        warn!("Failed to write systemd service file: {}", e);
                    } else {
                        // Reload systemd to pick up the new service file
                        let _ = std::process::Command::new("systemctl")
                            .arg("daemon-reload")
                            .output();
                    }
                }
            }
        }

        Ok(())
    }

    fn remove_platform_specific_files(&self) {
        #[cfg(all(unix, not(target_os = "macos")))]
        {
            // Remove systemd service file if it exists
            let service_name = format!("com.openframe.{}.service", self.config.name.to_lowercase());
            let service_path = PathBuf::from("/etc/systemd/system").join(&service_name);

            if let Err(e) = std::fs::remove_file(&service_path) {
                if e.kind() != std::io::ErrorKind::NotFound {
                    warn!("Failed to remove systemd service file: {}", e);
                }
            } else {
                // Reload systemd to recognize the removed service file
                let _ = std::process::Command::new("systemctl")
                    .arg("daemon-reload")
                    .output();
            }
        }
    }

    fn get_app_support_dir(&self) -> PathBuf {
        #[cfg(target_os = "macos")]
        {
            PathBuf::from("/Library/Application Support/OpenFrame")
        }

        #[cfg(target_os = "windows")]
        {
            let programdata =
                std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string());
            PathBuf::from(programdata).join("OpenFrame")
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            PathBuf::from("/var/lib/openframe")
        }
    }

    fn get_service_username(&self) -> Option<String> {
        if let Some(username) = &self.config.user_name {
            return Some(username.clone());
        }

        #[cfg(target_os = "macos")]
        {
            Some("root".to_string())
        }

        #[cfg(target_os = "windows")]
        {
            Some("LocalSystem".to_string())
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            Some("root".to_string())
        }
    }
}
