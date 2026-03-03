//! System service management utilities (launchctl, sc)

use anyhow::{Context, Result};
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

/// Start a Windows service via sc start
#[cfg(target_os = "windows")]
pub async fn start_service(service_name: &str) -> Result<()> {
    info!("Starting Windows service via sc start: {}", service_name);

    let output = Command::new("sc")
        .args(["start", service_name])
        .output()
        .await
        .with_context(|| format!("Failed to execute sc start: {}", service_name))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Ignore "already running" error
        if !stderr.contains("1056") {
            anyhow::bail!("sc start failed: {}", stderr);
        }
    }

    info!("Service started: {}", service_name);
    Ok(())
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
