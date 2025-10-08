use anyhow::{Context, Result};
use std::path::PathBuf;
use tokio::runtime::Runtime;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

use crate::platform::permissions::{Capability, PermissionUtils};
use crate::service_adapter::{CrossPlatformServiceManager, ServiceConfig};
use crate::{logging, platform::DirectoryManager, Client};
use crate::installation_initial_config_service::{InstallationInitialConfigService, InstallConfigParams};
use crate::services::{InstalledToolsService, ToolCommandParamsResolver, ToolKillService, ToolUninstallService, InitialConfigurationService};

#[cfg(windows)]
use windows_service::{
    define_windows_service, service_dispatcher,
    service::{ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType},
    service_control_handler::{self, ServiceControlHandlerResult},
};

const SERVICE_NAME: &str = "client";
const DISPLAY_NAME: &str = "OpenFrame Client Service";
const DESCRIPTION: &str = "OpenFrame client service for remote management and monitoring";

// Define the Windows service entry point
#[cfg(windows)]
define_windows_service!(ffi_service_main, windows_service_main);

/// Windows service main function - called by SCM
#[cfg(windows)]
fn windows_service_main(_args: Vec<std::ffi::OsString>) {
    // Register the service with SCM
    let status_handle = match service_control_handler::register("com.openframe.client", |_| {
        ServiceControlHandlerResult::NoError
    }) {
        Ok(handle) => handle,
        Err(e) => {
            eprintln!("Failed to register service control handler: {:?}", e);
            return;
        }
    };

    // Report that the service is running
    let status = ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: std::time::Duration::default(),
        process_id: None,
    };

    if let Err(e) = status_handle.set_service_status(status) {
        eprintln!("Failed to set service status: {:?}", e);
        return;
    }

    // Create a Tokio runtime and run the service core
    let rt = match Runtime::new() {
        Ok(runtime) => runtime,
        Err(e) => {
            eprintln!("Failed to create Tokio runtime: {:?}", e);
            return;
        }
    };

    if let Err(e) = rt.block_on(Service::run()) {
        eprintln!("Service core failed: {:?}", e);
        
        // Report stopped status on error
        let stopped_status = ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Stopped,
            controls_accepted: ServiceControlAccept::empty(),
            exit_code: ServiceExitCode::Win32(1),
            checkpoint: 0,
            wait_hint: std::time::Duration::default(),
            process_id: None,
        };
        let _ = status_handle.set_service_status(stopped_status);
    }
}

pub struct Service;

impl Service {
    pub fn new() -> Self {
        Self
    }

    /// Install the service on the current platform
    pub async fn install(params: InstallConfigParams) -> Result<()> {
        // Check if we have admin privileges
        if !PermissionUtils::is_admin() {
            error!("Service installation requires admin/root privileges");
            return Err(anyhow::anyhow!(
                "Admin/root privileges required for service installation"
            ));
        }

        // Common code for all platforms
        info!("Installing OpenFrame service");
        let dir_manager = DirectoryManager::new();
        dir_manager
            .perform_health_check()
            .map_err(|e| anyhow::anyhow!("Directory health check failed: {}", e))?;

        // Build and persist initial configuration before registering OS service
        let installation_initial_config_service = InstallationInitialConfigService::new(dir_manager.clone())
            .context("Failed to initialize InstallationInitialConfigService")?;
        
        installation_initial_config_service
            .build_and_save(params)
            .context("Failed to process initial configuration during service installation")?;

        // Get the current executable path
        let current_exe_path = std::env::current_exe().context("Failed to get current executable path")?;

        // Determine the standard installation location for the binary
        let install_path = Self::get_install_location();
        
        // Copy the binary to the installation location if it's not already there
        if current_exe_path != install_path {
            info!("Installing OpenFrame binary to: {}", install_path.display());
            
            // On Windows, create the OpenFrame application directory
            // On Unix, /usr/local/bin should already exist (system directory)
            #[cfg(target_os = "windows")]
            {
                if let Some(parent) = install_path.parent() {
                    std::fs::create_dir_all(parent)
                        .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
                }
            }
            
            // Copy the binary
            std::fs::copy(&current_exe_path, &install_path)
                .with_context(|| format!("Failed to copy binary to {}", install_path.display()))?;
            
            // Set executable permissions on Unix
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&install_path)?.permissions();
                perms.set_mode(0o755); // rwxr-xr-x
                std::fs::set_permissions(&install_path, perms)
                    .with_context(|| format!("Failed to set executable permissions on {}", install_path.display()))?;
            }
            
            info!("Binary installed successfully. You can now use 'openframe' command from anywhere.");
        } else {
            info!("Binary is already in the standard location: {}", install_path.display());
        }
        
        // Use the installation path for the service registration
        let exec_path = install_path;

        // Determine platform-specific user and group values
        let (user_name, group_name) = match std::env::consts::OS {
            "windows" => (Some("LocalSystem".to_string()), None),
            "macos" => (Some("root".to_string()), Some("wheel".to_string())),
            "linux" => (Some("root".to_string()), Some("root".to_string())),
            _ => (None, None),
        };

        // Create a full configuration for the service with all enhanced options
        let config = ServiceConfig {
            name: SERVICE_NAME.to_string(),
            display_name: DISPLAY_NAME.to_string(),
            description: DESCRIPTION.to_string(),
            exec_path,
            run_at_load: true,
            keep_alive: true,
            restart_on_crash: true,
            restart_throttle_seconds: 10,
            working_directory: Some(dir_manager.app_support_dir().to_path_buf()),
            stdout_path: Some(dir_manager.logs_dir().join("daemon_output.log")),
            stderr_path: Some(dir_manager.logs_dir().join("daemon_error.log")),
            user_name,
            group_name,
            file_limit: Some(4096),
            exit_timeout_seconds: Some(10),
            is_interactive: true,
            ..ServiceConfig::default()
        };

        // Create the service manager with our enhanced configuration
        let service = CrossPlatformServiceManager::with_config(config);

        // Call the cross-platform service manager to install
        service.install().context("Failed to install service")?;

        info!("OpenFrame service installed successfully");
        Ok(())
    }

    /// Uninstall the service on the current platform
    pub async fn uninstall() -> Result<()> {
        // Check if we have admin privileges
        if !PermissionUtils::is_admin() {
            error!("Service uninstallation requires admin/root privileges");
            return Err(anyhow::anyhow!(
                "Admin/root privileges required for service uninstallation"
            ));
        }

        // Common code for all platforms
        info!("Uninstalling OpenFrame service");

        // Initialize directory manager
        let dir_manager = DirectoryManager::new();

        // Uninstall all integrated tools first - fail immediately if this fails
        info!("Uninstalling integrated tools...");
        Self::uninstall_integrated_tools(&dir_manager).await
            .context("Failed to uninstall integrated tools")?;
        info!("Integrated tools uninstallation completed");

        // Get the current executable path
        let exec_path = std::env::current_exe().context("Failed to get current executable path")?;

        // Create the service manager
        let config = ServiceConfig {
            name: SERVICE_NAME.to_string(),
            display_name: DISPLAY_NAME.to_string(),
            description: DESCRIPTION.to_string(),
            exec_path,
            ..ServiceConfig::default()
        };

        let service = CrossPlatformServiceManager::with_config(config);

        // Call the cross-platform service manager to uninstall - fail immediately if this fails
        service.uninstall().context("Failed to uninstall service")?;

        // Clean up common directories - fail immediately if this fails
        info!("Cleaning up app support directory...");
        std::fs::remove_dir_all(dir_manager.app_support_dir())
            .with_context(|| format!("Failed to remove app support directory: {}", dir_manager.app_support_dir().display()))?;
        
        info!("Cleaning up logs directory...");
        std::fs::remove_dir_all(dir_manager.logs_dir())
            .with_context(|| format!("Failed to remove logs directory: {}", dir_manager.logs_dir().display()))?;

        // Remove the installed binary from the system PATH location - fail immediately if this fails
        let install_path = Self::get_install_location();
        if install_path.exists() {
            info!("Removing installed binary: {}", install_path.display());
            std::fs::remove_file(&install_path)
                .with_context(|| format!("Failed to remove installed binary: {}", install_path.display()))?;
            
            // On Windows, also remove the parent directory if empty
            #[cfg(target_os = "windows")]
            {
                if let Some(parent) = install_path.parent() {
                    if parent.read_dir().map(|mut d| d.next().is_none()).unwrap_or(false) {
                        std::fs::remove_dir(parent)
                            .with_context(|| format!("Failed to remove parent directory: {}", parent.display()))?;
                    }
                }
            }
        }

        info!("OpenFrame service uninstalled successfully");
        Ok(())
    }

    /// Uninstall all integrated tools
    async fn uninstall_integrated_tools(dir_manager: &DirectoryManager) -> Result<()> {
        // Initialize services needed for tool uninstallation
        let installed_tools_service = InstalledToolsService::new(dir_manager.clone())
            .context("Failed to initialize InstalledToolsService")?;

        let initial_config_service = InitialConfigurationService::new(dir_manager.clone())
            .context("Failed to initialize InitialConfigurationService")?;

        let command_params_resolver = ToolCommandParamsResolver::new(
            dir_manager.clone(),
            initial_config_service,
        );

        let tool_kill_service = ToolKillService::new();

        let tool_uninstall_service = ToolUninstallService::new(
            installed_tools_service,
            command_params_resolver,
            tool_kill_service,
            dir_manager.clone(),
        );

        // Run tool uninstallation
        tool_uninstall_service.uninstall_all().await
            .context("Failed to uninstall integrated tools")?;

        Ok(())
    }

    /// Run the service core logic
    pub async fn run() -> Result<()> {
        // Common code for all platforms
        info!("Starting OpenFrame service core");

        // Initialize directory manager based on environment
        let dir_manager = if std::env::var("OPENFRAME_DEV_MODE").is_ok() {
            info!("Service running in development mode, using user directories");
            DirectoryManager::for_development()
        } else {
            DirectoryManager::new()
        };

        // Check if we have capability to access required resources
        let _can_read_logs = PermissionUtils::has_capability(Capability::ReadSystemLogs);
        let can_write_logs = PermissionUtils::has_capability(Capability::WriteSystemLogs);

        if !can_write_logs {
            warn!("Process doesn't have privileges to write to system logs");
        }

        // Perform health check before starting
        if let Err(e) = dir_manager.perform_health_check() {
            error!("Directory health check failed: {:#}", e);
            return Err(e.into());
        }

        // Initialize the client
        let client = Client::new()?;


        // Start the client
        client.start().await
    }

    /// Get the standard installation location for the OpenFrame binary
    /// This is a location in the system PATH where the binary will be accessible globally
    fn get_install_location() -> PathBuf {
        #[cfg(target_os = "macos")]
        {
            PathBuf::from("/usr/local/bin/openframe-client")
        }
        
        #[cfg(target_os = "linux")]
        {
            PathBuf::from("/usr/local/bin/openframe-client")
        }
        
        #[cfg(target_os = "windows")]
        {
            let program_files = std::env::var("ProgramFiles")
                .unwrap_or_else(|_| "C:\\Program Files".to_string());
            PathBuf::from(program_files).join("OpenFrame").join("openframe-client.exe")
        }
    }

    /// Run as a service on the current platform
    pub fn run_as_service() -> Result<()> {
        // Check if we have necessary capabilities for running as a service
        if !PermissionUtils::has_capability(Capability::ManageServices)
            && !PermissionUtils::has_capability(Capability::WriteSystemDirectories)
        {
            // Log warning but continue - we might be running as a specialized service account
            warn!("Process doesn't have full administrative privileges");
        }

        // Log which platform we're running on
        let platform = match std::env::consts::OS {
            "windows" => "Windows Service",
            "macos" => "macOS LaunchDaemon",
            "linux" => "Linux systemd",
            _ => "Unknown platform",
        };

        info!("Running as {} service", platform);

        // Windows: use service dispatcher to properly initialize as a service
        #[cfg(windows)]
        {
            info!("Starting Windows service dispatcher");
            // This call blocks and never returns while the service is running
            // The actual service logic runs in windows_service_main()
            service_dispatcher::start("com.openframe.client", ffi_service_main)
                .context("Failed to start service dispatcher")?;
            return Ok(());
        }

        // For Unix-like platforms (macOS, Linux), run directly with async runtime
        #[cfg(not(windows))]
        {
            let rt = Runtime::new().context("Failed to create Tokio runtime")?;
            rt.block_on(Self::run())
        }
    }
}
