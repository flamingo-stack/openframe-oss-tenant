use anyhow::{Context, Result};
use std::ffi::OsString;
use std::path::PathBuf;
use tracing::{error, info};

use crate::{logging, Agent};

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
const DISPLAY_NAME: &str = "OpenFrame Service";
const DESCRIPTION: &str = "OpenFrame system management and monitoring agent";
const APP_SUPPORT_DIR: &str = "/Library/Application Support/OpenFrame";

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
        std::fs::create_dir_all(APP_SUPPORT_DIR)?;
        logging::platform::ensure_log_directory()?;

        // Set proper permissions
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;
            Command::new("chown")
                .args(["-R", "root:admin", APP_SUPPORT_DIR])
                .status()?;
            Command::new("chown")
                .args([
                    "-R",
                    "root:admin",
                    logging::platform::get_log_directory().to_str().unwrap(),
                ])
                .status()?;
            Command::new("chmod")
                .args(["-R", "775", APP_SUPPORT_DIR])
                .status()?;
            Command::new("chmod")
                .args([
                    "-R",
                    "775",
                    logging::platform::get_log_directory().to_str().unwrap(),
                ])
                .status()?;
        }

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
        let _ = std::fs::remove_dir_all(APP_SUPPORT_DIR);
        let _ = std::fs::remove_dir_all(logging::platform::get_log_directory());

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

        // Initialize and run the agent
        match tokio::runtime::Runtime::new() {
            Ok(rt) => {
                rt.block_on(async {
                    match Agent::new().await {
                        Ok(agent) => {
                            if let Err(e) = agent.start().await {
                                error!("Agent error: {}", e);
                            }
                        }
                        Err(e) => {
                            error!("Failed to initialize agent: {}", e);
                        }
                    }
                });
            }
            Err(e) => {
                error!("Failed to create Tokio runtime: {}", e);
            }
        }

        Ok(())
    }

    #[cfg(unix)]
    pub fn run_as_service() -> Result<()> {
        // Get current username
        let username = whoami::username();
        info!("Starting service as user: {}", username);

        let mut daemonize = Daemonize::new()
            .pid_file(format!("{}/agent.pid", APP_SUPPORT_DIR))
            .chown_pid_file(true)
            .working_directory(APP_SUPPORT_DIR)
            .user(username.as_str())
            .umask(0o022);

        // Configure group based on OS
        #[cfg(target_os = "macos")]
        {
            info!("Configuring for macOS with admin group");
            daemonize = daemonize.group("admin");
        }
        #[cfg(not(target_os = "macos"))]
        {
            info!("Configuring for Unix with wheel group");
            daemonize = daemonize.group("wheel");
        }

        info!("Starting daemon with configuration");
        match daemonize.start() {
            Ok(_) => {
                info!("Daemon started successfully");
                // Initialize and run the agent
                match tokio::runtime::Runtime::new() {
                    Ok(rt) => {
                        info!("Created Tokio runtime");
                        match rt.block_on(async {
                            info!("Initializing agent");
                            match Agent::new().await {
                                Ok(agent) => {
                                    info!("Agent initialized, starting main loop");
                                    agent.start().await
                                }
                                Err(e) => {
                                    error!("Failed to initialize agent: {}", e);
                                    Err(e)
                                }
                            }
                        }) {
                            Ok(_) => {
                                info!("Agent completed successfully");
                                Ok(())
                            }
                            Err(e) => {
                                error!("Agent error: {}", e);
                                Err(e.into())
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to create Tokio runtime: {}", e);
                        Err(e.into())
                    }
                }
            }
            Err(e) => {
                error!("Failed to start daemon: {}", e);
                Err(e.into())
            }
        }
    }
}
