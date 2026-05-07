use anyhow::{Context, Result};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::runtime::Runtime;
use tracing::{info, warn};

use crate::platform::permissions::PermissionUtils;
use crate::platform::DirectoryManager;

#[cfg(windows)]
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult, ServiceStatusHandle},
    service_dispatcher,
};

const SERVICE_NAME: &str = "client-updater";
const DISPLAY_NAME: &str = "OpenFrame Client Updater Service";
const DESCRIPTION: &str = "Manages self-update of the OpenFrame client binary";

pub const FULL_SERVICE_NAME: &str = crate::config::updater_config::UPDATER_SERVICE_FULL_NAME;

const FIRST_RESTART_SERVICE_SECS: u64 = 10;
const SECOND_RESTART_SERVICE_SECS: u64 = 60;
const SUBSEQUENT_RESTART_SERVICE_SECS: u64 = 300;
const RECOVERY_RESET_PERIOD_DAYS: u32 = 1;

#[cfg(windows)]
define_windows_service!(ffi_service_main, windows_service_main);

#[cfg(windows)]
fn windows_service_main(_args: Vec<std::ffi::OsString>) {
    let (shutdown_tx, shutdown_rx) = std::sync::mpsc::channel::<()>();
    let shutdown_tx = Arc::new(std::sync::Mutex::new(Some(shutdown_tx)));

    let status_handle = match service_control_handler::register(FULL_SERVICE_NAME, {
        let shutdown_tx = Arc::clone(&shutdown_tx);
        move |control_event| match control_event {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                info!("Received stop/shutdown signal from Windows SCM");
                if let Some(tx) = shutdown_tx.lock().unwrap().take() {
                    let _ = tx.send(());
                }
                ServiceControlHandlerResult::NoError
            }
            ServiceControl::Interrogate => ServiceControlHandlerResult::NoError,
            _ => ServiceControlHandlerResult::NotImplemented,
        }
    }) {
        Ok(handle) => handle,
        Err(e) => {
            eprintln!("Failed to register service control handler: {:?}", e);
            return;
        }
    };

    let _ = set_service_status(&status_handle, ServiceState::Running);

    let rt = match Runtime::new() {
        Ok(runtime) => runtime,
        Err(e) => {
            eprintln!("Failed to create Tokio runtime: {:?}", e);
            let _ = set_service_status(&status_handle, ServiceState::Stopped);
            return;
        }
    };

    let result = rt.block_on(async {
        let service_handle = tokio::spawn(UpdaterService::run());
        tokio::select! {
            result = service_handle => {
                result.unwrap_or_else(|e| Err(anyhow::anyhow!("Updater panicked: {}", e)))
            }
            _ = tokio::task::spawn_blocking(move || shutdown_rx.recv()) => {
                info!("Shutdown signal received");
                Ok(())
            }
        }
    });

    if let Err(e) = result {
        eprintln!("Updater service failed: {:?}", e);
    }
    let _ = set_service_status(&status_handle, ServiceState::Stopped);
}

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
    status_handle
        .set_service_status(status)
        .context("Failed to set service status")
}

pub struct UpdaterService;

impl UpdaterService {
    pub fn is_installed() -> bool {
        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("sc")
                .args(["query", FULL_SERVICE_NAME])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        }

        #[cfg(target_os = "macos")]
        {
            PathBuf::from(format!("/Library/LaunchDaemons/{}.plist", FULL_SERVICE_NAME)).exists()
        }

        #[cfg(target_os = "linux")]
        {
            PathBuf::from(format!("/etc/systemd/system/{}.service", FULL_SERVICE_NAME)).exists()
        }
    }

    /// Install the updater as an OS service.
    /// Requires agent_config.json to already exist (populated by main client install).
    pub async fn install() -> Result<()> {
        if !PermissionUtils::is_admin() {
            return Err(anyhow::anyhow!("Admin privileges required for service installation"));
        }

        let dir_manager = DirectoryManager::new();
        dir_manager
            .perform_health_check()
            .map_err(|e| anyhow::anyhow!("Directory health check failed: {}", e))?;

        // Validate that the main client has already been registered
        let agent_config_path = dir_manager.secured_dir().join("agent_config.json");
        if !agent_config_path.exists() {
            return Err(anyhow::anyhow!(
                "agent_config.json not found at {}. Install the main client first.",
                agent_config_path.display()
            ));
        }

        let config_str = std::fs::read_to_string(&agent_config_path)
            .context("Failed to read agent_config.json")?;
        let config: serde_json::Value =
            serde_json::from_str(&config_str).context("Failed to parse agent_config.json")?;

        let machine_id = config
            .get("machine_id")
            .and_then(|v| v.as_str())
            .unwrap_or("");
        if machine_id.is_empty() {
            return Err(anyhow::anyhow!(
                "machine_id is empty in agent_config.json. Ensure the main client is registered."
            ));
        }

        info!("Installing OpenFrame Client Updater service (machine_id: {})", machine_id);

        let current_exe = std::env::current_exe().context("Failed to get current exe path")?;
        let install_path = Self::get_install_location();

        if current_exe != install_path {
            if let Some(parent) = install_path.parent() {
                std::fs::create_dir_all(parent)
                    .with_context(|| format!("Failed to create dir {}", parent.display()))?;
            }
            std::fs::copy(&current_exe, &install_path)
                .with_context(|| format!("Failed to copy binary to {}", install_path.display()))?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&install_path)?.permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&install_path, perms)?;
            }

            info!("Binary installed to: {}", install_path.display());
        }

        // Phase 6 will wire in CrossPlatformServiceManager here.
        // For now, emit a clear message that the binary is placed correctly.
        info!(
            "Updater binary ready at {}. OS service registration will be completed in Phase 6.",
            install_path.display()
        );

        Ok(())
    }

    pub async fn uninstall() -> Result<()> {
        if !PermissionUtils::is_admin() {
            return Err(anyhow::anyhow!("Admin privileges required for uninstallation"));
        }
        info!("Uninstalling OpenFrame Client Updater service");
        // Phase 6: call CrossPlatformServiceManager::uninstall()
        warn!("Full OS service unregistration will be implemented in Phase 6");
        Ok(())
    }

    pub async fn run() -> Result<()> {
        info!("Starting OpenFrame Client Updater");

        let dir_manager = if std::env::var("OPENFRAME_DEV_MODE").is_ok() {
            DirectoryManager::for_development()
        } else {
            DirectoryManager::new()
        };

        dir_manager
            .perform_health_check()
            .map_err(|e| anyhow::anyhow!("Directory health check: {}", e))?;

        crate::UpdaterOrchestrator::new(dir_manager).start().await
    }

    pub fn run_as_service() -> Result<()> {
        info!("Running as OS service");

        #[cfg(windows)]
        {
            service_dispatcher::start(FULL_SERVICE_NAME, ffi_service_main)
                .context("Failed to start service dispatcher")?;
            return Ok(());
        }

        #[cfg(not(windows))]
        {
            let rt = Runtime::new().context("Failed to create Tokio runtime")?;
            rt.block_on(Self::run())
        }
    }

    pub fn get_install_location() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            let program_files =
                std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
            PathBuf::from(program_files)
                .join("OpenFrame")
                .join("bin")
                .join("openframe-client-updater.exe")
        }

        #[cfg(not(target_os = "windows"))]
        {
            PathBuf::from("/usr/local/bin/openframe-client-updater")
        }
    }
}
