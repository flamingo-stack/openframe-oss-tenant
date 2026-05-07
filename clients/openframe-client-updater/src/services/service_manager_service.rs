use anyhow::{anyhow, Context, Result};
use std::path::PathBuf;
use tracing::info;

use crate::config::updater_config::{SERVICE_STOP_TIMEOUT_SECS, SERVICE_START_VERIFY_WAIT_SECS};

/// Stops and starts `com.openframe.client` using native OS APIs.
/// No PowerShell, no subprocesses on Windows.
pub struct ServiceManagerService;

impl ServiceManagerService {
    /// Stops the given service and waits until it reaches the Stopped state.
    pub fn stop(service_name: &str) -> Result<()> {
        info!("Stopping service: {}", service_name);
        Self::stop_impl(service_name)?;
        info!("Service stopped: {}", service_name);
        Ok(())
    }

    /// Starts the given service.
    pub fn start(service_name: &str) -> Result<()> {
        info!("Starting service: {}", service_name);
        Self::start_impl(service_name)?;
        info!("Service started: {}", service_name);
        Ok(())
    }

    /// Returns true if the service is currently in the Running state.
    pub fn is_running(service_name: &str) -> Result<bool> {
        Self::is_running_impl(service_name)
    }

    /// Returns the standard install path for the openframe-client binary.
    pub fn client_binary_path() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            let program_files = std::env::var("ProgramFiles")
                .unwrap_or_else(|_| "C:\\Program Files".to_string());
            PathBuf::from(program_files)
                .join("OpenFrame")
                .join("bin")
                .join("openframe-client.exe")
        }

        #[cfg(not(target_os = "windows"))]
        {
            PathBuf::from("/usr/local/bin/openframe-client")
        }
    }

    // ── Windows ──────────────────────────────────────────────────────────

    #[cfg(target_os = "windows")]
    fn stop_impl(service_name: &str) -> Result<()> {
        use windows_service::service::ServiceAccess;
        use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

        let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
            .context("Failed to open Service Control Manager")?;

        let service = manager
            .open_service(service_name, ServiceAccess::STOP | ServiceAccess::QUERY_STATUS)
            .with_context(|| format!("Failed to open service '{}'", service_name))?;

        let status = service.query_status()
            .context("Failed to query service status")?;

        if status.current_state == windows_service::service::ServiceState::Stopped {
            info!("Service '{}' is already stopped", service_name);
            return Ok(());
        }

        service.stop().context("Failed to send stop control")?;

        // Poll until stopped or timeout
        let deadline = std::time::Instant::now()
            + std::time::Duration::from_secs(SERVICE_STOP_TIMEOUT_SECS);

        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));

            let status = service.query_status()
                .context("Failed to query service status while waiting for stop")?;

            if status.current_state == windows_service::service::ServiceState::Stopped {
                return Ok(());
            }

            if std::time::Instant::now() >= deadline {
                return Err(anyhow!(
                    "Service '{}' did not stop within {}s",
                    service_name, SERVICE_STOP_TIMEOUT_SECS
                ));
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn start_impl(service_name: &str) -> Result<()> {
        use windows_service::service::ServiceAccess;
        use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

        let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
            .context("Failed to open Service Control Manager")?;

        let service = manager
            .open_service(service_name, ServiceAccess::START)
            .with_context(|| format!("Failed to open service '{}'", service_name))?;

        service.start(&[] as &[&str]).context("Failed to start service")?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn is_running_impl(service_name: &str) -> Result<bool> {
        use windows_service::service::ServiceAccess;
        use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

        let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
            .context("Failed to open Service Control Manager")?;

        let service = manager
            .open_service(service_name, ServiceAccess::QUERY_STATUS)
            .with_context(|| format!("Failed to open service '{}'", service_name))?;

        let status = service.query_status()
            .context("Failed to query service status")?;

        Ok(status.current_state == windows_service::service::ServiceState::Running)
    }

    // ── macOS ─────────────────────────────────────────────────────────────

    #[cfg(target_os = "macos")]
    fn stop_impl(service_name: &str) -> Result<()> {
        let plist = format!("/Library/LaunchDaemons/{}.plist", service_name);
        let status = std::process::Command::new("launchctl")
            .args(["unload", &plist])
            .status()
            .context("Failed to run launchctl unload")?;

        if !status.success() {
            return Err(anyhow!("launchctl unload failed with: {:?}", status.code()));
        }
        Ok(())
    }

    #[cfg(target_os = "macos")]
    fn start_impl(service_name: &str) -> Result<()> {
        let plist = format!("/Library/LaunchDaemons/{}.plist", service_name);
        let status = std::process::Command::new("launchctl")
            .args(["load", &plist])
            .status()
            .context("Failed to run launchctl load")?;

        if !status.success() {
            return Err(anyhow!("launchctl load failed with: {:?}", status.code()));
        }
        Ok(())
    }

    #[cfg(target_os = "macos")]
    fn is_running_impl(service_name: &str) -> Result<bool> {
        let output = std::process::Command::new("launchctl")
            .args(["list", service_name])
            .output()
            .context("Failed to run launchctl list")?;

        // launchctl list returns 0 and prints a PID if the service is running
        Ok(output.status.success()
            && String::from_utf8_lossy(&output.stdout).contains("\"PID\""))
    }

    // ── Linux ─────────────────────────────────────────────────────────────

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    fn stop_impl(service_name: &str) -> Result<()> {
        let status = std::process::Command::new("systemctl")
            .args(["stop", service_name])
            .status()
            .context("Failed to run systemctl stop")?;

        if !status.success() {
            return Err(anyhow!("systemctl stop failed with: {:?}", status.code()));
        }
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    fn start_impl(service_name: &str) -> Result<()> {
        let status = std::process::Command::new("systemctl")
            .args(["start", service_name])
            .status()
            .context("Failed to run systemctl start")?;

        if !status.success() {
            return Err(anyhow!("systemctl start failed with: {:?}", status.code()));
        }
        Ok(())
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    fn is_running_impl(service_name: &str) -> Result<bool> {
        let output = std::process::Command::new("systemctl")
            .args(["is-active", "--quiet", service_name])
            .status()
            .context("Failed to run systemctl is-active")?;

        Ok(output.success())
    }
}
