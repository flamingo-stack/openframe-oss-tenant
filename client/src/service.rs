use anyhow::{Context, Result};
use std::path::PathBuf;
use std::sync::Arc;
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
    service::{ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType},
    service_control_handler::{self, ServiceControlHandlerResult, ServiceStatusHandle},
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
    // Create shutdown signal channel
    let (shutdown_tx, shutdown_rx) = std::sync::mpsc::channel::<()>();
    let shutdown_tx = Arc::new(std::sync::Mutex::new(Some(shutdown_tx)));

    // Register service control handler with PROPER stop handling
    let status_handle = match service_control_handler::register("com.openframe.client", {
        let shutdown_tx = Arc::clone(&shutdown_tx);
        move |control_event| {
            match control_event {
                ServiceControl::Stop | ServiceControl::Shutdown => {
                    info!("Received stop/shutdown signal from Windows SCM");
                    
                    // Send shutdown signal
                    if let Some(tx) = shutdown_tx.lock().unwrap().take() {
                        let _ = tx.send(());
                    }
                    
                    ServiceControlHandlerResult::NoError
                }
                ServiceControl::Interrogate => {
                    ServiceControlHandlerResult::NoError
                }
                _ => ServiceControlHandlerResult::NotImplemented
            }
        }
    }) {
        Ok(handle) => handle,
        Err(e) => {
            eprintln!("Failed to register service control handler: {:?}", e);
            return;
        }
    };

    // Report that the service is running
    let _ = set_service_status(&status_handle, ServiceState::Running);

    // Create a Tokio runtime and run the service core
    let rt = match Runtime::new() {
        Ok(runtime) => runtime,
        Err(e) => {
            eprintln!("Failed to create Tokio runtime: {:?}", e);
            let _ = set_service_status(&status_handle, ServiceState::Stopped);
            return;
        }
    };

    // Run service with shutdown signal
    let result = rt.block_on(async {
        // Spawn service core
        let service_handle = tokio::spawn(Service::run());
        
        // Wait for either service completion or shutdown signal
        tokio::select! {
            result = service_handle => {
                info!("Service core completed");
                result.unwrap_or_else(|e| Err(anyhow::anyhow!("Service panicked: {}", e)))
            }
            _ = tokio::task::spawn_blocking(move || shutdown_rx.recv()) => {
                info!("Shutdown signal received, stopping service...");
                Ok(())
            }
        }
    });

    if let Err(e) = result {
        eprintln!("Service core failed: {:?}", e);
        let _ = set_service_status(&status_handle, ServiceState::Stopped);
    } else {
        info!("Service stopped gracefully");
        let _ = set_service_status(&status_handle, ServiceState::Stopped);
    }
}

/// Helper function to set service status
#[cfg(windows)]
fn set_service_status(status_handle: &ServiceStatusHandle, state: ServiceState) -> Result<()> {
    let status = ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: state,
        controls_accepted: if state == ServiceState::Running {
            ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN
        } else {
            ServiceControlAccept::empty()
        },
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: std::time::Duration::from_secs(5),
        process_id: None,
    };

    status_handle.set_service_status(status)
        .context("Failed to set service status")
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
            
            // Windows: добавляем bin директорию в PATH
            #[cfg(target_os = "windows")]
            {
                if let Some(bin_dir) = install_path.parent() {
                    info!("Adding {} to system PATH", bin_dir.display());
                    Self::add_to_windows_path(bin_dir)
                        .context("Failed to add to PATH")?;
                    
                    info!("⚠️  Please restart your terminal to use 'openframe-client' command");
                }
            }
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
        // Note: On Windows, logs_dir is typically inside app_support_dir, so we need to be careful about order
        
        // First, remove logs directory if it exists as a separate directory
        if dir_manager.logs_dir().exists() && dir_manager.logs_dir() != dir_manager.app_support_dir() {
            info!("Cleaning up logs directory: {}", dir_manager.logs_dir().display());
            if let Err(e) = std::fs::remove_dir_all(dir_manager.logs_dir()) {
                warn!("Failed to remove logs directory (may already be removed): {}", e);
            }
        }
        
        // Then remove app support directory (this will remove logs if it's a subdirectory)
        if dir_manager.app_support_dir().exists() {
            info!("Cleaning up app support directory: {}", dir_manager.app_support_dir().display());
            std::fs::remove_dir_all(dir_manager.app_support_dir())
                .with_context(|| format!("Failed to remove app support directory: {}", dir_manager.app_support_dir().display()))?;
        }

        // Remove the installed binary from the system PATH location - fail immediately if this fails
        let install_path = Self::get_install_location();
        if install_path.exists() {
            // Windows: удаляем bin директорию из PATH перед удалением файла
            #[cfg(target_os = "windows")]
            {
                if let Some(bin_dir) = install_path.parent() {
                    info!("Removing {} from system PATH", bin_dir.display());
                    if let Err(e) = Self::remove_from_windows_path(bin_dir) {
                        warn!("Failed to remove from PATH: {}", e);
                    }
                }
            }
            
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
            PathBuf::from(program_files)
                .join("OpenFrame")
                .join("bin")
                .join("openframe-client.exe")
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

    /// Add a directory to the Windows system PATH
    #[cfg(target_os = "windows")]
    fn add_to_windows_path(dir: &std::path::Path) -> Result<()> {
        use winreg::enums::*;
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let env = hklm.open_subkey_with_flags(
            "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
            KEY_READ | KEY_WRITE,
        ).context("Failed to open registry key - admin rights required")?;

        let current_path: String = env.get_value("Path")
            .context("Failed to read PATH from registry")?;
        
        let dir_str = dir.to_string_lossy();

        // Проверяем, не добавлена ли уже
        if current_path.split(';').any(|p| p.trim().eq_ignore_ascii_case(dir_str.trim())) {
            info!("Directory already in PATH: {}", dir_str);
            return Ok(());
        }

        // Добавляем в PATH
        let new_path = if current_path.ends_with(';') {
            format!("{}{}", current_path, dir_str)
        } else {
            format!("{};{}", current_path, dir_str)
        };

        env.set_value("Path", &new_path)
            .context("Failed to write PATH to registry")?;

        // Уведомляем систему об изменении переменных окружения
        Self::broadcast_environment_change()?;

        info!("✓ Added {} to system PATH", dir_str);
        Ok(())
    }

    /// Remove a directory from the Windows system PATH
    #[cfg(target_os = "windows")]
    fn remove_from_windows_path(dir: &std::path::Path) -> Result<()> {
        use winreg::enums::*;
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let env = hklm.open_subkey_with_flags(
            "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
            KEY_READ | KEY_WRITE,
        ).context("Failed to open registry key - admin rights required")?;

        let current_path: String = env.get_value("Path")
            .context("Failed to read PATH from registry")?;
        
        let dir_str = dir.to_string_lossy();

        // Удаляем директорию из PATH
        let new_path: Vec<&str> = current_path
            .split(';')
            .filter(|p| !p.trim().eq_ignore_ascii_case(dir_str.trim()))
            .collect();

        let new_path = new_path.join(";");

        env.set_value("Path", &new_path)
            .context("Failed to write PATH to registry")?;

        Self::broadcast_environment_change()?;

        info!("✓ Removed {} from system PATH", dir_str);
        Ok(())
    }

    /// Broadcast environment change notification to Windows
    #[cfg(target_os = "windows")]
    fn broadcast_environment_change() -> Result<()> {
        use windows::Win32::UI::WindowsAndMessaging::*;
        use windows::Win32::Foundation::*;
        use windows::core::PCWSTR;

        unsafe {
            let env_str: Vec<u16> = "Environment\0".encode_utf16().collect();
            SendMessageTimeoutW(
                HWND_BROADCAST,
                WM_SETTINGCHANGE,
                WPARAM(0),
                LPARAM(env_str.as_ptr() as isize),
                SMTO_ABORTIFHUNG,
                5000,
                None,
            );
        }

        Ok(())
    }
}
