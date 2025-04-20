use anyhow::{Context, Result};
use std::ffi::OsString;
use tracing::{error, info};

#[cfg(windows)]
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandler},
    service_dispatcher,
    service_manager::{ServiceManager as WinServiceManager, ServiceManagerAccess},
};

#[cfg(unix)]
use daemonize::Daemonize;

const SERVICE_NAME: &str = "OpenFrameAgent";
const DISPLAY_NAME: &str = "OpenFrame Agent Service";
const DESCRIPTION: &str = "OpenFrame system management and monitoring agent";

pub struct ServiceManager;

impl ServiceManager {
    #[cfg(windows)]
    pub fn install() -> Result<()> {
        let manager =
            WinServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CREATE)?;

        let service_binary_path =
            std::env::current_exe().context("Failed to get current executable path")?;

        let service_info = windows_service::service::ServiceInfo {
            name: OsString::from(SERVICE_NAME),
            display_name: OsString::from(DISPLAY_NAME),
            service_type: ServiceType::OWN_PROCESS,
            start_type: windows_service::service::ServiceStartType::AutoStart,
            error_control: windows_service::service::ServiceErrorControl::Normal,
            executable_path: service_binary_path,
            launch_arguments: vec![],
            dependencies: vec![],
            account_name: None,
            account_password: None,
        };

        manager.create_service(&service_info, ServiceManagerAccess::CREATE)?;
        info!("Windows service installed successfully");
        Ok(())
    }

    #[cfg(unix)]
    pub fn install() -> Result<()> {
        // Create necessary directories and files
        std::fs::create_dir_all("/var/lib/openframe-agent")?;
        std::fs::create_dir_all("/var/log/openframe-agent")?;

        // Create service user and group if they don't exist
        // Note: This would typically be done by the package installer
        info!("Unix daemon installation completed");
        Ok(())
    }

    #[cfg(windows)]
    pub fn uninstall() -> Result<()> {
        let manager =
            WinServiceManager::local_computer(None::<&str>, ServiceManagerAccess::DELETE)?;
        let service = manager.open_service(SERVICE_NAME, ServiceManagerAccess::DELETE)?;
        service.delete()?;
        info!("Windows service uninstalled successfully");
        Ok(())
    }

    #[cfg(unix)]
    pub fn uninstall() -> Result<()> {
        // Remove service files
        let _ = std::fs::remove_file("/var/run/openframe-agent.pid");
        let _ = std::fs::remove_dir_all("/var/lib/openframe-agent");
        let _ = std::fs::remove_dir_all("/var/log/openframe-agent");

        info!("Unix daemon uninstalled successfully");
        Ok(())
    }

    #[cfg(windows)]
    pub fn run_as_service() -> Result<()> {
        define_windows_service!(ffi_service_main, service_main);

        service_dispatcher::start(SERVICE_NAME, ffi_service_main)
            .context("Failed to start service dispatcher")?;

        Ok(())
    }

    #[cfg(windows)]
    fn service_main(_arguments: Vec<OsString>) {
        if let Err(e) = run_service_main() {
            error!("Service main error: {}", e);
        }
    }

    #[cfg(windows)]
    fn run_service_main() -> Result<()> {
        let event_handler =
            move |control_event| -> ServiceControlHandler::ServiceControlHandlerResult {
                match control_event {
                    ServiceControl::Stop | ServiceControl::Shutdown => {
                        info!("Service stop requested");
                        ServiceControlHandler::ServiceControlHandlerResult::NoError
                    }
                    _ => ServiceControlHandler::ServiceControlHandlerResult::NoError,
                }
            };

        let status_handle = service_control_handler::register(SERVICE_NAME, event_handler)?;

        status_handle.set_service_status(ServiceStatus {
            service_type: ServiceType::OWN_PROCESS,
            current_state: ServiceState::Running,
            controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
            exit_code: ServiceExitCode::Win32(0),
            checkpoint: 0,
            wait_hint: std::time::Duration::default(),
            process_id: None,
        })?;

        info!("Service started successfully");

        // Main service loop would go here
        // We'll implement this later when we integrate with the Agent struct

        Ok(())
    }

    #[cfg(unix)]
    pub fn run_as_service() -> Result<()> {
        let daemonize: Daemonize<Result<(), std::io::Error>> = Daemonize::new()
            .pid_file("/var/run/openframe-agent.pid")
            .chown_pid_file(true)
            .working_directory("/var/lib/openframe-agent")
            .user("openframe")
            .group("openframe")
            .stdout(std::fs::File::create(
                "/var/log/openframe-agent/stdout.log",
            )?)
            .stderr(std::fs::File::create(
                "/var/log/openframe-agent/stderr.log",
            )?)
            .privileged_action(|| {
                info!("Preparing to start daemon");
                Ok(())
            });

        match daemonize.start() {
            Ok(_) => {
                info!("Daemon started successfully");
                // Main daemon loop would go here
                // We'll implement this later when we integrate with the Agent struct
                Ok(())
            }
            Err(e) => {
                error!("Failed to start daemon: {}", e);
                Err(e.into())
            }
        }
    }
}
