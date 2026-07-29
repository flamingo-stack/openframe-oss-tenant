use anyhow::{anyhow, Context, Result};
use std::path::PathBuf;
use tracing::info;

use crate::config::updater_config::SERVICE_STOP_TIMEOUT_SECS;

/// Stops and starts `com.openframe.client` using native OS APIs.
/// No PowerShell, no subprocesses on Windows.
pub struct ServiceManagerService;

impl ServiceManagerService {
    /// Stops the specified service.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// ServiceManagerService::stop("openframe-client")?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    pub fn stop(service_name: &str) -> Result<()> {
        info!("Stopping service: {}", service_name);
        Self::stop_impl(service_name)?;
        info!("Service stopped: {}", service_name);
        Ok(())
    }

    /// Starts the specified service.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// ServiceManagerService::start("openframe-client")?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Parameters
    ///
    /// * `service_name` - The name of the service to start.
    pub fn start(service_name: &str) -> Result<()> {
        info!("Starting service: {}", service_name);
        Self::start_impl(service_name)?;
        info!("Service started: {}", service_name);
        Ok(())
    }

    /// Determines whether a service is currently running.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let running = ServiceManagerService::is_running("example-service")?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Returns
    ///
    /// `true` if the service is running, `false` otherwise.
    pub fn is_running(service_name: &str) -> Result<bool> {
        Self::is_running_impl(service_name)
    }

    /// Stops a service without blocking the Tokio worker thread.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// #[tokio::main]
    /// async fn main() -> anyhow::Result<()> {
    ///     ServiceManagerService::stop_async("openframe-client").await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn stop_async(service_name: &'static str) -> Result<()> {
        tokio::task::spawn_blocking(move || Self::stop(service_name))
            .await
            .context("Service stop task failed to join")?
    }

    /// Starts a service without blocking the async runtime.
    ///
    /// # Errors
    ///
    /// Returns an error if the service cannot be started or the blocking task fails to join.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example() -> anyhow::Result<()> {
    /// ServiceManagerService::start_async("my-service").await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn start_async(service_name: &'static str) -> Result<()> {
        tokio::task::spawn_blocking(move || Self::start(service_name))
            .await
            .context("Service start task failed to join")?
    }

    /// Checks whether a named service is running.
    ///
    /// # Errors
    ///
    /// Returns an error if the service status cannot be determined or the status task fails to join.
    ///
    /// # Examples
    ///
    /// ```
    /// # async fn example() -> anyhow::Result<()> {
    /// let running = ServiceManagerService::is_running_async("example-service").await?;
    /// println!("Service running: {running}");
    /// # Ok(())
    /// # }
    /// ```
    pub async fn is_running_async(service_name: &'static str) -> Result<bool> {
        tokio::task::spawn_blocking(move || Self::is_running(service_name))
            .await
            .context("Service status task failed to join")?
    }

    /// Determines the standard installation path for the `openframe-client` binary.
    ///
    /// # Returns
    ///
    /// The platform-specific path to the `openframe-client` executable.
    ///
    /// # Examples
    ///
    /// ```
    /// let path = ServiceManagerService::client_binary_path();
    /// assert!(path.ends_with("openframe-client") || path.ends_with("openframe-client.exe"));
    /// ```
    pub fn client_binary_path() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            let program_files =
                std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
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

    /// Stops the specified Windows service and waits for it to reach the stopped state.
    ///
    /// # Errors
    ///
    /// Returns an error if the service cannot be opened or queried, the stop command
    /// fails, or the service does not stop within the configured timeout.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # #[cfg(target_os = "windows")]
    /// # fn example() -> anyhow::Result<()> {
    /// stop_impl("OpenFrameClient")?;
    /// # Ok(())
    /// # }
    /// ```
    #[cfg(target_os = "windows")]
    fn stop_impl(service_name: &str) -> Result<()> {
        use windows_service::service::ServiceAccess;
        use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

        let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
            .context("Failed to open Service Control Manager")?;

        let service = manager
            .open_service(
                service_name,
                ServiceAccess::STOP | ServiceAccess::QUERY_STATUS,
            )
            .with_context(|| format!("Failed to open service '{}'", service_name))?;

        let status = service
            .query_status()
            .context("Failed to query service status")?;

        if status.current_state == windows_service::service::ServiceState::Stopped {
            info!("Service '{}' is already stopped", service_name);
            return Ok(());
        }

        service.stop().context("Failed to send stop control")?;

        // Poll until stopped or timeout
        let deadline =
            std::time::Instant::now() + std::time::Duration::from_secs(SERVICE_STOP_TIMEOUT_SECS);

        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));

            let status = service
                .query_status()
                .context("Failed to query service status while waiting for stop")?;

            if status.current_state == windows_service::service::ServiceState::Stopped {
                return Ok(());
            }

            if std::time::Instant::now() >= deadline {
                return Err(anyhow!(
                    "Service '{}' did not stop within {}s",
                    service_name,
                    SERVICE_STOP_TIMEOUT_SECS
                ));
            }
        }
    }

    /// Starts the specified Windows service.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// start_impl("my-service")?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Errors
    ///
    /// Returns an error if the Service Control Manager or service cannot be opened,
    /// or if the service fails to start.
    fn start_impl(service_name: &str) -> Result<()> {
        use windows_service::service::ServiceAccess;
        use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

        let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
            .context("Failed to open Service Control Manager")?;

        let service = manager
            .open_service(service_name, ServiceAccess::START)
            .with_context(|| format!("Failed to open service '{}'", service_name))?;

        service
            .start(&[] as &[&str])
            .context("Failed to start service")?;
        Ok(())
    }

    /// Determines whether a Windows service is currently running.
    ///
    /// # Arguments
    ///
    /// * `service_name` - The name of the Windows service to query.
    ///
    /// # Returns
    ///
    /// `true` when the service is running, `false` when it is in another state.
    ///
    /// # Errors
    ///
    /// Returns an error if the Service Control Manager, service, or service status cannot be queried.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let running = is_running_impl("MyService")?;
    /// println!("Service running: {running}");
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    fn is_running_impl(service_name: &str) -> Result<bool> {
        use windows_service::service::ServiceAccess;
        use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

        let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
            .context("Failed to open Service Control Manager")?;

        let service = manager
            .open_service(service_name, ServiceAccess::QUERY_STATUS)
            .with_context(|| format!("Failed to open service '{}'", service_name))?;

        let status = service
            .query_status()
            .context("Failed to query service status")?;

        Ok(status.current_state == windows_service::service::ServiceState::Running)
    }

    // ── macOS ─────────────────────────────────────────────────────────────

    /// Stops a macOS launch daemon identified by its service name.
    ///
    /// # Errors
    ///
    /// Returns an error if `launchctl unload` cannot be executed or reports failure.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// ServiceManagerService::stop("com.example.service")?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
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

    /// Starts the specified macOS launch daemon.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// start_impl("com.example.service").expect("failed to start service");
    /// ```
    ///
    /// # Errors
    ///
    /// Returns an error if `launchctl load` cannot be executed or reports failure.
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

    /// Determines whether a macOS launchd service is running.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let running = is_running_impl("com.example.service")?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Returns
    ///
    /// `true` if `launchctl` reports the service successfully and its output contains
    /// a process ID, `false` otherwise.
    fn is_running_impl(service_name: &str) -> Result<bool> {
        let output = std::process::Command::new("launchctl")
            .args(["list", service_name])
            .output()
            .context("Failed to run launchctl list")?;

        // launchctl list returns 0 and prints a PID if the service is running
        Ok(output.status.success() && String::from_utf8_lossy(&output.stdout).contains("\"PID\""))
    }

    // ── Linux ─────────────────────────────────────────────────────────────

    /// Stops a system service using `systemctl`.
    ///
    /// # Errors
    ///
    /// Returns an error if `systemctl` cannot be executed or reports failure.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # fn example() -> anyhow::Result<()> {
    /// stop_impl("example-service")?;
    /// # Ok(())
    /// # }
    /// ```
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

    /// Starts a service using the system service manager.
    ///
    /// # Arguments
    ///
    /// * `service_name` - The name of the service to start.
    ///
    /// # Returns
    ///
    /// `Ok(())` when the service manager starts the service successfully; otherwise, an error.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// start_impl("openframe-client").expect("service should start");
    /// ```
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

    /// Determines whether a system service is active.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let running = is_running_impl("openframe-client")?;
    /// # anyhow::Result::<()>::Ok(())
    /// ```
    ///
    /// The result is `true` when `systemctl is-active --quiet` reports success, and
    /// `false` when the service is inactive.
    ///
    /// # Errors
    ///
    /// Returns an error if `systemctl` cannot be executed.
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    fn is_running_impl(service_name: &str) -> Result<bool> {
        let output = std::process::Command::new("systemctl")
            .args(["is-active", "--quiet", service_name])
            .status()
            .context("Failed to run systemctl is-active")?;

        Ok(output.success())
    }
}
