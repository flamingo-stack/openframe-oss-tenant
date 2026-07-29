//! System service management utilities (launchctl, systemctl, SCM).

#[cfg(target_os = "windows")]
use crate::config::service_stop::{
    PROCESS_CHECK_INTERVAL_MS, SERVICE_FORCE_KILL_MAX_ATTEMPTS, SERVICE_START_MAX_ATTEMPTS,
    SERVICE_STOP_CALL_TIMEOUT_SECS, SERVICE_STOP_MAX_ATTEMPTS,
};
use anyhow::{Context, Result};
use tokio::process::Command;
#[cfg(target_os = "windows")]
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

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
                warn!(
                    "Start attempt {}/{} for service {}: {}",
                    attempt, SERVICE_START_MAX_ATTEMPTS, service_name, last_err
                );
            }
            Err(e) => {
                last_err = e;
                warn!(
                    "Start attempt {}/{} for service {} failed: {}",
                    attempt, SERVICE_START_MAX_ATTEMPTS, service_name, last_err
                );
            }
        }
        if attempt < SERVICE_START_MAX_ATTEMPTS {
            sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
        }
    }

    anyhow::bail!(
        "Failed to start service {} after {} attempts: {}",
        service_name,
        SERVICE_START_MAX_ATTEMPTS,
        last_err
    )
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
        .open_service(
            service_name,
            ServiceAccess::START | ServiceAccess::QUERY_STATUS,
        )
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
    info!(
        "Starting Linux service via systemctl start: {}",
        service_name
    );

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

/// Stop an OS service via the platform service manager. `allow_delete` permits the last-resort
/// SCM delete of a wedged service; pass it only from install/reinstall/uninstall, which recreate
/// the service. The update/restore paths must pass false (they don't re-register, so a delete bricks the tool).
pub async fn stop_service(service_name: &str, allow_delete: bool) -> Result<()> {
    info!("Stopping service: {}", service_name);

    #[cfg(target_os = "windows")]
    {
        stop_service_windows(service_name, allow_delete).await
    }

    #[cfg(target_os = "macos")]
    {
        let _ = allow_delete;
        stop_service_macos(service_name).await
    }

    #[cfg(target_os = "linux")]
    {
        let _ = allow_delete;
        stop_service_linux(service_name).await
    }
}

/// Confirm a freshly (re)installed service actually reached RUNNING, starting it if the
/// installer left it stopped; errors if it cannot be confirmed RUNNING. On non-Windows this is
/// a no-op — the `StopPending` wedge that motivates it is Windows-specific, and blindly
/// re-issuing a start on launchd/systemd risks failing an already-loaded unit.
pub async fn verify_service_running(service_name: &str) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        use windows_service::service::ServiceState;
        if let Ok(status) = query_service_status_windows(service_name) {
            if status.current_state == ServiceState::Running {
                return Ok(());
            }
        }
        start_service(service_name).await.with_context(|| {
            format!(
                "service {} did not reach RUNNING after install",
                service_name
            )
        })
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = service_name;
        Ok(())
    }
}

/// True if the service is absent or Stopped — i.e. safe to (re)install over. On non-Windows
/// always true. Used to abort a reinstall rather than overwrite/register on top of a service
/// we could not stop or clear (e.g. a wedged `StopPending` or a still-live old agent).
pub async fn service_clear_for_install(service_name: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        service_stopped_or_missing(&query_service_status_windows(service_name))
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = service_name;
        true
    }
}

#[cfg(target_os = "windows")]
async fn stop_service_windows(service_name: &str, allow_delete: bool) -> Result<()> {
    use winapi::shared::winerror::{
        ERROR_SERVICE_CANNOT_ACCEPT_CTRL, ERROR_SERVICE_DOES_NOT_EXIST, ERROR_SERVICE_NOT_ACTIVE,
    };
    use windows_service::service::ServiceAccess;

    info!("Stopping Windows service via SCM: {}", service_name);

    let svc = service_name.to_string();
    let stop_call = tokio::task::spawn_blocking(move || {
        let service =
            open_service_windows(&svc, ServiceAccess::QUERY_STATUS | ServiceAccess::STOP)?;
        service.stop()
    });

    let stop_result = match tokio::time::timeout(
        Duration::from_secs(SERVICE_STOP_CALL_TIMEOUT_SECS),
        stop_call,
    )
    .await
    {
        Err(_elapsed) => {
            warn!(
                "service.stop() for {} timed out after {}s; force-killing service process",
                service_name, SERVICE_STOP_CALL_TIMEOUT_SECS
            );
            return force_stop_service_windows(service_name, allow_delete).await;
        }
        Ok(Err(join_err)) => {
            error!(
                "service.stop() task for {} failed: {}; force-killing service process",
                service_name, join_err
            );
            return force_stop_service_windows(service_name, allow_delete).await;
        }
        Ok(Ok(result)) => result,
    };

    match stop_result {
        Ok(_) => {
            info!("Service {} stop initiated", service_name);
            if wait_for_service_stop_windows(service_name).await? {
                return Ok(());
            }
            warn!(
                "Service {} did not reach STOPPED after stop request; force-killing",
                service_name
            );
            force_stop_service_windows(service_name, allow_delete).await
        }
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_DOES_NOT_EXIST as i32) =>
        {
            warn!(
                "Service {} does not exist (error {})",
                service_name, ERROR_SERVICE_DOES_NOT_EXIST
            );
            Ok(())
        }
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_NOT_ACTIVE as i32) =>
        {
            info!(
                "Service {} is not running (error {})",
                service_name, ERROR_SERVICE_NOT_ACTIVE
            );
            Ok(())
        }
        Err(windows_service::Error::Winapi(e))
            if e.raw_os_error() == Some(ERROR_SERVICE_CANNOT_ACCEPT_CTRL as i32) =>
        {
            warn!(
                "Service {} cannot accept stop control (error {}); force-killing service process",
                service_name, ERROR_SERVICE_CANNOT_ACCEPT_CTRL
            );
            force_stop_service_windows(service_name, allow_delete).await
        }
        Err(e) => {
            error!(
                "Failed to stop service {} via SCM: {}; force-killing service process",
                service_name, e
            );
            force_stop_service_windows(service_name, allow_delete).await
        }
    }
}

#[cfg(target_os = "windows")]
async fn force_stop_service_windows(service_name: &str, allow_delete: bool) -> Result<()> {
    for attempt in 1..=SERVICE_FORCE_KILL_MAX_ATTEMPTS {
        let status = query_service_status_windows(service_name);
        if service_stopped_or_missing(&status) {
            info!(
                "Service {} is no longer running (force-stop attempt {})",
                service_name, attempt
            );
            return Ok(());
        }

        match status.as_ref().ok().and_then(|s| s.process_id) {
            Some(pid) => {
                info!(
                    "Force-killing service {} process tree (pid {}, attempt {}/{})",
                    service_name, pid, attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS
                );

                let output = Command::new("taskkill")
                    .args(["/F", "/T", "/PID", &pid.to_string()])
                    .output()
                    .await
                    .with_context(|| {
                        format!(
                            "Failed to execute taskkill for service {} (pid {})",
                            service_name, pid
                        )
                    })?;

                if !output.status.success() {
                    let kill_stdout = String::from_utf8_lossy(&output.stdout);
                    let kill_stderr = String::from_utf8_lossy(&output.stderr);
                    warn!(
                        "taskkill for service {} (pid {}) reported: stdout={} stderr={}",
                        service_name,
                        pid,
                        kill_stdout.trim(),
                        kill_stderr.trim()
                    );
                }
            }
            None => {
                // SCM only reports a PID while the service is Running; in StopPending (and
                // other transitional states) the PID is hidden, so the SCM-PID path can never
                // act on a wedged service. Fall back to the service's configured image path
                // and kill any live process running from it directly.
                match service_image_exe_path_windows(service_name) {
                    Some(exe) => {
                        let killed = kill_processes_by_exe_path_windows(&exe).await;
                        if killed > 0 {
                            info!("Force-killed {} process(es) for service {} by image path {} (attempt {}/{})",
                                  killed, service_name, exe.display(), attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
                        } else {
                            info!("Service {} has no reportable PID and no live process at {} (attempt {}/{}); waiting for SCM to settle",
                                  service_name, exe.display(), attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
                        }
                    }
                    None => {
                        let state = status
                            .as_ref()
                            .map(|s| format!("{:?}", s.current_state))
                            .unwrap_or_else(|_| "unqueryable".to_string());
                        info!("Service {} has no reportable PID and no resolvable image path (state {}, attempt {}/{}); waiting",
                              service_name, state, attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
                    }
                }
            }
        }

        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
    }

    let status = query_service_status_windows(service_name);
    if service_stopped_or_missing(&status) {
        info!("Service {} force-stopped successfully", service_name);
        return Ok(());
    }

    let state = status
        .as_ref()
        .map(|s| format!("{:?}", s.current_state))
        .unwrap_or_else(|_| "unqueryable".to_string());

    // Only delete when the caller will recreate the service (install/reinstall/uninstall). The
    // update/restore paths pass allow_delete=false: deleting there would brick the tool because
    // nothing re-registers the service, so report failure and let the caller retry/repair.
    if !allow_delete {
        return Err(anyhow::anyhow!(
            "Failed to force-stop service {} (state {} after {} attempts)",
            service_name,
            state,
            SERVICE_FORCE_KILL_MAX_ATTEMPTS
        ));
    }

    // Last resort: the service is wedged (typically StopPending that SCM won't reap, with no
    // killable process). Mark it for deletion via the SCM so the follow-up reinstall recreates
    // it cleanly. This is what lets a reinstall recover the agent without a machine reboot.
    warn!("Service {} still not stopped (state {}) after {} force-kill attempts; deleting it via SCM to clear the wedged state",
          service_name, state, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
    match delete_service_windows(service_name).await {
        Ok(()) => {
            info!(
                "Service {} deleted; a fresh install will recreate it",
                service_name
            );
            Ok(())
        }
        Err(e) => {
            error!(
                "Service {} could not be stopped or deleted: {:#}",
                service_name, e
            );
            Err(anyhow::anyhow!(
                "Failed to force-stop or delete service {} (state {} after {} attempts): {:#}",
                service_name,
                state,
                SERVICE_FORCE_KILL_MAX_ATTEMPTS,
                e
            ))
        }
    }
}

#[cfg(target_os = "windows")]
async fn wait_for_service_stop_windows(service_name: &str) -> Result<bool> {
    for attempt in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;

        if service_stopped_or_missing(&query_service_status_windows(service_name)) {
            info!(
                "Service {} confirmed stopped after {} attempts",
                service_name, attempt
            );
            return Ok(true);
        }
    }

    warn!(
        "Service {} did not confirm stopped after {} attempts",
        service_name, SERVICE_STOP_MAX_ATTEMPTS
    );
    Ok(false)
}

#[cfg(target_os = "macos")]
async fn stop_service_macos(service_name: &str) -> Result<()> {
    let plist_path = format!("/Library/LaunchDaemons/{}.plist", service_name);
    info!(
        "Stopping macOS service via sudo launchctl unload: {}",
        plist_path
    );

    // Check if plist exists
    if !std::path::Path::new(&plist_path).exists() {
        warn!(
            "Plist not found at {}, service may not be installed",
            plist_path
        );
        return Ok(());
    }

    let output = Command::new("sudo")
        .args(["launchctl", "unload", &plist_path])
        .output()
        .await
        .with_context(|| {
            format!(
                "Failed to execute sudo launchctl unload for: {}",
                plist_path
            )
        })?;

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
    info!(
        "Stopping Linux service via sudo systemctl stop: {}",
        service_name
    );

    let output = Command::new("sudo")
        .args(["systemctl", "stop", service_name])
        .output()
        .await
        .with_context(|| {
            format!(
                "Failed to execute sudo systemctl stop for service: {}",
                service_name
            )
        })?;

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

#[cfg(target_os = "windows")]
pub fn service_exists(service_name: &str) -> bool {
    query_service_status_windows(service_name).is_ok()
}

#[cfg(target_os = "windows")]
pub fn service_not_stopped(service_name: &str) -> bool {
    use windows_service::service::ServiceState;
    match query_service_status_windows(service_name) {
        Ok(status) => status.current_state != ServiceState::Stopped,
        Err(_) => false,
    }
}

/// True only if SCM reports the service does not exist.
#[cfg(target_os = "windows")]
fn service_missing_windows(service_name: &str) -> bool {
    use winapi::shared::winerror::ERROR_SERVICE_DOES_NOT_EXIST;
    match query_service_status_windows(service_name) {
        Err(windows_service::Error::Winapi(e)) => {
            e.raw_os_error() == Some(ERROR_SERVICE_DOES_NOT_EXIST as i32)
        }
        _ => false,
    }
}

/// The on-disk executable path from the service's SCM image path (`lpBinaryPathName`),
/// stripped of surrounding quotes and any trailing arguments.
#[cfg(target_os = "windows")]
fn service_image_exe_path_windows(service_name: &str) -> Option<std::path::PathBuf> {
    use windows_service::service::ServiceAccess;
    let service = open_service_windows(service_name, ServiceAccess::QUERY_CONFIG).ok()?;
    let config = service.query_config().ok()?;
    parse_exe_from_image_path(&config.executable_path.to_string_lossy())
}

/// Extract the executable path from a raw SCM image-path string, e.g.
/// `"C:\\path\\agent.exe" -arg` or `C:\\path\\agent.exe -arg`.
#[cfg(target_os = "windows")]
fn parse_exe_from_image_path(image_path: &str) -> Option<std::path::PathBuf> {
    let trimmed = image_path.trim();
    if trimmed.is_empty() {
        return None;
    }
    // Quoted form: take the contents of the first quoted span.
    if let Some(rest) = trimmed.strip_prefix('"') {
        if let Some(end) = rest.find('"') {
            return Some(std::path::PathBuf::from(&rest[..end]));
        }
    }
    // Unquoted: cut after the first ".exe" (case-insensitive) to drop trailing args.
    let lower = trimmed.to_lowercase();
    if let Some(idx) = lower.find(".exe") {
        return Some(std::path::PathBuf::from(&trimmed[..idx + 4]));
    }
    Some(std::path::PathBuf::from(trimmed))
}

/// Force-kill every running process whose executable is exactly `exe_path`. Matching on the
/// full path (not the image name) avoids killing sibling tools that share an `agent.exe` name.
/// Returns the number of processes a kill was issued for.
#[cfg(target_os = "windows")]
async fn kill_processes_by_exe_path_windows(exe_path: &std::path::Path) -> usize {
    use sysinfo::System;
    let target = exe_path.to_string_lossy().to_lowercase();
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut killed = 0usize;
    for (pid, process) in sys.processes() {
        let proc_exe = process
            .exe()
            .map(|p| p.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        if !proc_exe.is_empty() && proc_exe == target {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .output()
                .await;
            killed += 1;
        }
    }
    killed
}

/// Mark a wedged service for deletion via the SCM and wait for it to disappear, so a follow-up
/// reinstall can recreate it under the same name without hitting `ERROR_SERVICE_MARKED_FOR_DELETE`.
#[cfg(target_os = "windows")]
async fn delete_service_windows(service_name: &str) -> Result<()> {
    use windows_service::service::ServiceAccess;

    if service_missing_windows(service_name) {
        return Ok(());
    }

    // Scope the handle so it is closed before we poll — SCM only finalizes removal once the
    // last open handle is released.
    {
        let service = open_service_windows(service_name, ServiceAccess::DELETE)
            .with_context(|| format!("open service {} for deletion", service_name))?;
        service
            .delete()
            .with_context(|| format!("DeleteService failed for {}", service_name))?;
    }

    for _ in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        if service_missing_windows(service_name) {
            return Ok(());
        }
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
    }

    if service_missing_windows(service_name) {
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "service {} still present after delete request",
            service_name
        ))
    }
}
