//! System service management utilities (launchctl, systemctl, SCM).

use anyhow::{Context, Result};
use tokio::process::Command;
use tracing::{error, info, warn};
#[cfg(target_os = "windows")]
use tokio::time::{sleep, Duration};
#[cfg(target_os = "windows")]
use crate::config::service_stop::{
    PROCESS_CHECK_INTERVAL_MS, SERVICE_FORCE_KILL_MAX_ATTEMPTS, SERVICE_START_MAX_ATTEMPTS,
    SERVICE_STOP_CALL_TIMEOUT_SECS, SERVICE_STOP_MAX_ATTEMPTS,
};

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

/// Start a Windows service via the Service Control Manager, retrying transient failures.
#[cfg(target_os = "windows")]
pub async fn start_service(service_name: &str) -> Result<()> {
    info!("Starting Windows service via SCM: {}", service_name);

    let mut last_err = String::new();
    for attempt in 1..=SERVICE_START_MAX_ATTEMPTS {
        match try_start_service_windows(service_name) {
            Ok(()) if wait_for_service_running_windows(service_name).await => {
                info!("Service {} confirmed running", service_name);
                return Ok(());
            }
            Ok(()) => {
                last_err = "service did not reach RUNNING after start".to_string();
                warn!("Start attempt {}/{} for service {}: {}",
                      attempt, SERVICE_START_MAX_ATTEMPTS, service_name, last_err);
            }
            Err(e) => {
                last_err = e;
                warn!("Start attempt {}/{} for service {} failed: {}",
                      attempt, SERVICE_START_MAX_ATTEMPTS, service_name, last_err);
            }
        }
        if attempt < SERVICE_START_MAX_ATTEMPTS {
            sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
        }
    }

    anyhow::bail!("Failed to start service {} after {} attempts: {}",
                  service_name, SERVICE_START_MAX_ATTEMPTS, last_err)
}

#[cfg(target_os = "windows")]
async fn wait_for_service_running_windows(service_name: &str) -> bool {
    use windows_service::service::ServiceState;
    for _ in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
        if let Ok(status) = query_service_status_windows(service_name) {
            if status.current_state == ServiceState::Running {
                return true;
            }
        }
    }
    false
}

#[cfg(target_os = "windows")]
fn try_start_service_windows(service_name: &str) -> std::result::Result<(), String> {
    use winapi::shared::winerror::ERROR_SERVICE_ALREADY_RUNNING;
    use windows_service::service::ServiceAccess;
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};

    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .map_err(|e| format!("connect to SCM: {}", e))?;
    let service = manager
        .open_service(service_name, ServiceAccess::START | ServiceAccess::QUERY_STATUS)
        .map_err(|e| format!("open service: {}", e))?;

    match service.start::<&std::ffi::OsStr>(&[]) {
        Ok(()) => Ok(()),
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_ALREADY_RUNNING as i32) =>
        {
            Ok(())
        }
        Err(e) => Err(format!("{}", e)),
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

/// Stop an OS service via the platform service manager.
pub async fn stop_service(service_name: &str) -> Result<()> {
    info!("Stopping service: {}", service_name);

    #[cfg(target_os = "windows")]
    {
        stop_service_windows(service_name).await
    }

    #[cfg(target_os = "macos")]
    {
        stop_service_macos(service_name).await
    }

    #[cfg(target_os = "linux")]
    {
        stop_service_linux(service_name).await
    }
}

#[cfg(target_os = "windows")]
async fn stop_service_windows(service_name: &str) -> Result<()> {
    use windows_service::service::ServiceAccess;
    use winapi::shared::winerror::{
        ERROR_SERVICE_CANNOT_ACCEPT_CTRL, ERROR_SERVICE_DOES_NOT_EXIST, ERROR_SERVICE_NOT_ACTIVE,
    };

    info!("Stopping Windows service via SCM: {}", service_name);

    let svc = service_name.to_string();
    let stop_call = tokio::task::spawn_blocking(move || {
        let service = open_service_windows(&svc, ServiceAccess::QUERY_STATUS | ServiceAccess::STOP)?;
        service.stop()
    });

    let stop_result = match tokio::time::timeout(
        Duration::from_secs(SERVICE_STOP_CALL_TIMEOUT_SECS),
        stop_call,
    )
    .await
    {
        Err(_elapsed) => {
            warn!("service.stop() for {} timed out after {}s; force-killing service process",
                  service_name, SERVICE_STOP_CALL_TIMEOUT_SECS);
            return force_stop_service_windows(service_name).await;
        }
        Ok(Err(join_err)) => {
            error!("service.stop() task for {} failed: {}; force-killing service process",
                   service_name, join_err);
            return force_stop_service_windows(service_name).await;
        }
        Ok(Ok(result)) => result,
    };

    match stop_result {
        Ok(_) => {
            info!("Service {} stop initiated", service_name);
            if wait_for_service_stop_windows(service_name).await? {
                return Ok(());
            }
            warn!("Service {} did not reach STOPPED after stop request; force-killing", service_name);
            force_stop_service_windows(service_name).await
        }
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_DOES_NOT_EXIST as i32) =>
        {
            warn!("Service {} does not exist (error {})", service_name, ERROR_SERVICE_DOES_NOT_EXIST);
            Ok(())
        }
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_NOT_ACTIVE as i32) =>
        {
            info!("Service {} is not running (error {})", service_name, ERROR_SERVICE_NOT_ACTIVE);
            Ok(())
        }
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_CANNOT_ACCEPT_CTRL as i32) =>
        {
            warn!("Service {} cannot accept stop control (error {}); force-killing service process",
                  service_name, ERROR_SERVICE_CANNOT_ACCEPT_CTRL);
            force_stop_service_windows(service_name).await
        }
        Err(e) => {
            error!("Failed to stop service {} via SCM: {}; force-killing service process", service_name, e);
            force_stop_service_windows(service_name).await
        }
    }
}

#[cfg(target_os = "windows")]
async fn force_stop_service_windows(service_name: &str) -> Result<()> {
    for attempt in 1..=SERVICE_FORCE_KILL_MAX_ATTEMPTS {
        let status = query_service_status_windows(service_name);
        if service_stopped_or_missing(&status) {
            info!("Service {} is no longer running (force-stop attempt {})", service_name, attempt);
            return Ok(());
        }

        match status.as_ref().ok().and_then(|s| s.process_id) {
            Some(pid) => {
                info!("Force-killing service {} process tree (pid {}, attempt {}/{})",
                      service_name, pid, attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);

                let output = Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &pid.to_string()])
                    .output()
                    .await
                    .with_context(|| format!("Failed to execute taskkill for service {} (pid {})", service_name, pid))?;

                if !output.status.success() {
                    let kill_stdout = String::from_utf8_lossy(&output.stdout);
                    let kill_stderr = String::from_utf8_lossy(&output.stderr);
                    warn!("taskkill for service {} (pid {}) reported: stdout={} stderr={}",
                          service_name, pid, kill_stdout.trim(), kill_stderr.trim());
                }
            }
            None => {
                let state = status.as_ref().map(|s| format!("{:?}", s.current_state))
                    .unwrap_or_else(|_| "unqueryable".to_string());
                info!("Service {} has no reportable PID (state {}, attempt {}/{}); waiting",
                      service_name, state, attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
            }
        }

        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
    }

    let status = query_service_status_windows(service_name);
    if service_stopped_or_missing(&status) {
        info!("Service {} force-stopped successfully", service_name);
        Ok(())
    } else {
        let state = status.as_ref().map(|s| format!("{:?}", s.current_state))
            .unwrap_or_else(|_| "unqueryable".to_string());
        error!("Service {} still not stopped (state {}) after {} force-kill attempts",
               service_name, state, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
        Err(anyhow::anyhow!(
            "Failed to force-stop service {} (state {} after {} attempts)",
            service_name, state, SERVICE_FORCE_KILL_MAX_ATTEMPTS
        ))
    }
}

#[cfg(target_os = "windows")]
async fn wait_for_service_stop_windows(service_name: &str) -> Result<bool> {
    for attempt in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;

        if service_stopped_or_missing(&query_service_status_windows(service_name)) {
            info!("Service {} confirmed stopped after {} attempts", service_name, attempt);
            return Ok(true);
        }
    }

    warn!("Service {} did not confirm stopped after {} attempts", service_name, SERVICE_STOP_MAX_ATTEMPTS);
    Ok(false)
}

#[cfg(target_os = "macos")]
async fn stop_service_macos(service_name: &str) -> Result<()> {
    let plist_path = format!("/Library/LaunchDaemons/{}.plist", service_name);
    info!("Stopping macOS service via sudo launchctl unload: {}", plist_path);

    // Check if plist exists
    if !std::path::Path::new(&plist_path).exists() {
        warn!("Plist not found at {}, service may not be installed", plist_path);
        return Ok(());
    }

    let output = Command::new("sudo")
        .args(["launchctl", "unload", &plist_path])
        .output()
        .await
        .with_context(|| format!("Failed to execute sudo launchctl unload for: {}", plist_path))?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        info!("Service unloaded successfully: {}", plist_path);
        Ok(())
    } else if stderr.contains("Could not find specified service") {
        info!("Service not loaded (already stopped): {}", plist_path);
        Ok(())
    } else if stderr.contains("No such file or directory") {
        warn!("Plist not found: {}", plist_path);
        Ok(())
    } else {
        error!("Failed to unload service {}: {}", plist_path, stderr);
        Err(anyhow::anyhow!(
            "Failed to unload service {}: {}",
            plist_path,
            stderr
        ))
    }
}

#[cfg(target_os = "linux")]
async fn stop_service_linux(service_name: &str) -> Result<()> {
    info!("Stopping Linux service via sudo systemctl stop: {}", service_name);

    let output = Command::new("sudo")
        .args(["systemctl", "stop", service_name])
        .output()
        .await
        .with_context(|| format!("Failed to execute sudo systemctl stop for service: {}", service_name))?;

    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        info!("Service {} stopped successfully", service_name);
        Ok(())
    } else if stderr.contains("not loaded") || stderr.contains("not found") {
        warn!("Service {} not found or not loaded", service_name);
        Ok(())
    } else {
        error!("Failed to stop service {}: {}", service_name, stderr);
        Err(anyhow::anyhow!(
            "Failed to stop service {}: {}",
            service_name,
            stderr
        ))
    }
}

#[cfg(target_os = "windows")]
fn open_service_windows(
    service_name: &str,
    access: windows_service::service::ServiceAccess,
) -> windows_service::Result<windows_service::service::Service> {
    use windows_service::service_manager::{ServiceManager, ServiceManagerAccess};
    let manager = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)?;
    manager.open_service(service_name, access)
}

#[cfg(target_os = "windows")]
fn query_service_status_windows(
    service_name: &str,
) -> windows_service::Result<windows_service::service::ServiceStatus> {
    use windows_service::service::ServiceAccess;
    let service = open_service_windows(service_name, ServiceAccess::QUERY_STATUS)?;
    service.query_status()
}

#[cfg(target_os = "windows")]
fn service_stopped_or_missing(
    status: &windows_service::Result<windows_service::service::ServiceStatus>,
) -> bool {
    use winapi::shared::winerror::ERROR_SERVICE_DOES_NOT_EXIST;
    use windows_service::service::ServiceState;
    match status {
        Ok(s) => s.current_state == ServiceState::Stopped,
        Err(windows_service::Error::Winapi(e)) => {
            e.raw_os_error() == Some(ERROR_SERVICE_DOES_NOT_EXIST as i32)
        }
        Err(_) => false,
    }
}
