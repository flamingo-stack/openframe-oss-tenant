//! System service management utilities (launchctl, sc)

use anyhow::{Context, Result};
#[cfg(any(target_os = "macos", target_os = "linux"))]
use tokio::process::Command;
use tracing::info;

/// Start a macOS service via launchctl load
#[cfg(target_os = "macos")]
pub async fn start_service(service_name: &str) -> Result<()> {
    let plist_path = format!("/Library/LaunchDaemons/{}.plist", service_name);
    info!("Starting macOS service via launchctl load: {}", plist_path);

    let output = Command::new("sudo")
        .args(["launchctl", "load", &plist_path])
        .output()
        .await
        .with_context(|| format!("Failed to execute launchctl load: {}", plist_path))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("launchctl load failed: {}", stderr);
    }

    info!("Service started: {}", service_name);
    Ok(())
}

/// Start a Windows service via the Service Control Manager.
#[cfg(target_os = "windows")]
pub async fn start_service(service_name: &str) -> Result<()> {
    use winapi::shared::winerror::ERROR_SERVICE_ALREADY_RUNNING;
    use windows_service::service::ServiceAccess;
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    info!("Starting Windows service via SCM: {}", service_name);

    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .context("Failed to connect to the service control manager")?;
    let service = manager
        .open_service(service_name, ServiceAccess::START | ServiceAccess::QUERY_STATUS)
        .with_context(|| format!("Failed to open service: {}", service_name))?;

    match service.start::<&std::ffi::OsStr>(&[]) {
        Ok(()) => {
            info!("Service started: {}", service_name);
            Ok(())
        }
        // Ignore "already running".
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_ALREADY_RUNNING as i32) =>
        {
            info!("Service {} already running", service_name);
            Ok(())
        }
        Err(e) => anyhow::bail!("Failed to start service {}: {}", service_name, e),
    }
}

/// Start a Linux service via systemctl start
#[cfg(target_os = "linux")]
pub async fn start_service(service_name: &str) -> Result<()> {
    info!("Starting Linux service via systemctl start: {}", service_name);

    let output = Command::new("sudo")
        .args(["systemctl", "start", service_name])
        .output()
        .await
        .with_context(|| format!("Failed to execute systemctl start: {}", service_name))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("systemctl start failed: {}", stderr);
    }

    info!("Service started: {}", service_name);
    Ok(())
}
