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

/// Get PID of a running Windows service via sc queryex
#[cfg(target_os = "windows")]
pub async fn get_service_pid(service_name: &str) -> Option<u32> {
    let output = Command::new("sc")
        .args(["queryex", service_name])
        .output()
        .await
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse PID from "        PID                : 1234"
    for line in stdout.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("PID") {
            if let Some(pid_str) = rest.trim().strip_prefix(':') {
                if let Ok(pid) = pid_str.trim().parse::<u32>() {
                    if pid != 0 {
                        info!("Service {} has PID: {}", service_name, pid);
                        return Some(pid);
                    }
                }
            }
        }
    }
    None
}

/// Force kill a process and all its children via taskkill /F /T /PID
#[cfg(target_os = "windows")]
pub async fn force_kill_process_tree(pid: u32) -> Result<()> {
    use tracing::warn;

    info!("Force killing process tree for PID: {}", pid);

    let output = Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .output()
        .await
        .with_context(|| format!("Failed to execute taskkill for PID: {}", pid))?;

    if output.status.success() {
        info!("Process tree for PID {} killed successfully", pid);
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Ignore "not found" errors - process may have already exited
        if !stderr.contains("not found") {
            warn!("taskkill for PID {} returned: {}", pid, stderr);
        }
    }
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
