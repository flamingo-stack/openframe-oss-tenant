use anyhow::{Context, Result};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tracing::{error, info, warn};

use crate::platform::permissions::{Capability, PermissionUtils};
use crate::service_adapter::{CrossPlatformServiceManager, ServiceConfig};
use crate::{platform::DirectoryManager, Client};
use crate::installation_initial_config_service::{InstallationInitialConfigService, InstallConfigParams};

#[cfg(windows)]
use windows_service::{
    define_windows_service, service_dispatcher,
    service::{ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus, ServiceType},
    service_control_handler::{self, ServiceControlHandlerResult, ServiceStatusHandle},
};

const SERVICE_NAME: &str = "client";
const DISPLAY_NAME: &str = "OpenFrame Client Service";
const DESCRIPTION: &str = "OpenFrame client service for remote management and monitoring";

// Full service identifier used by all platforms
// Format: "com.openframe.{SERVICE_NAME}" -> "com.openframe.client"
pub const FULL_SERVICE_NAME: &str = "com.openframe.client";

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
    let status_handle = match service_control_handler::register(FULL_SERVICE_NAME, {
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

    /// Check if the service is already installed on the system
    pub fn is_installed() -> bool {
        #[cfg(target_os = "windows")]
        {
            use std::process::Command;

            // Check if Windows service exists using sc query
            let output = Command::new("sc")
                .args(&["query", FULL_SERVICE_NAME])
                .output();

            match output {
                Ok(output) => output.status.success(),
                Err(_) => false,
            }
        }

        #[cfg(target_os = "macos")]
        {
            // Check if launchd plist exists
            // Service manager creates plist as: /Library/LaunchDaemons/{service_label}.plist
            let plist_path = std::path::PathBuf::from(format!(
                "/Library/LaunchDaemons/{}.plist",
                FULL_SERVICE_NAME
            ));
            plist_path.exists()
        }

        #[cfg(target_os = "linux")]
        {
            // Check if systemd service exists
            // Service manager creates unit as: /etc/systemd/system/{service_label}.service
            let service_path = std::path::PathBuf::from(format!(
                "/etc/systemd/system/{}.service",
                FULL_SERVICE_NAME
            ));
            service_path.exists()
        }
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

        if Self::is_installed() {
            info!("Existing Installation Detected\n");
            info!("An existing OpenFrame installation was found\n");
            info!("To proceed with the new installation, the old version must be removed\n");
            info!("Uninstalling existing installation...");

            let installed_binary_path = Self::get_install_location();

            if !installed_binary_path.exists() {
                warn!("Installed binary not found at expected location: {}", installed_binary_path.display());
                info!("Proceeding with installation anyway...");
            } else {
                info!("Launching uninstall process: {}", installed_binary_path.display());

                use tokio::process::Command;

                let status = Command::new(&installed_binary_path)
                    .arg("uninstall")
                    .status()
                    .await
                    .context("Failed to launch uninstall process")?;

                if !status.success() {
                    warn!("Uninstall process returned non-zero exit code: {:?}", status.code());
                    info!("Continuing with installation anyway...");
                } else {
                    info!("Uninstall process completed successfully");
                }

                // Wait additional time for cleanup script to complete
                info!("Waiting for cleanup to complete...");
                tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            }

            info!("Continuing with new installation...\n");
        }

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

        info!("Uninstalling OpenFrame service");

        let dir_manager = DirectoryManager::new();
        let install_path = Self::get_install_location();

        // Call platform-specific uninstall implementation
        #[cfg(target_os = "windows")]
        {
            crate::platform::uninstall::uninstall_windows(&dir_manager, &install_path).await
        }

        #[cfg(target_os = "macos")]
        {
            crate::platform::uninstall::uninstall_macos(&dir_manager, &install_path).await
        }
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
            service_dispatcher::start(FULL_SERVICE_NAME, ffi_service_main)
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
