//! System service management utilities (launchctl, systemctl, SCM).

use anyhow::{Context, Result};
use tokio::process::Command;
use tracing::{error, info, warn};
#[cfg(target_os = "windows")]
use tokio::time::{sleep, Duration};
#[cfg(target_os = "windows")]
use crate::config::service_stop::{
    PROCESS_CHECK_INTERVAL_MS, SCM_QUERY_MAX_CONSECUTIVE_FAILURES, SCM_QUERY_TIMEOUT_SECS,
    SERVICE_FORCE_KILL_MAX_ATTEMPTS, SERVICE_START_CALL_TIMEOUT_SECS, SERVICE_START_MAX_ATTEMPTS,
    SERVICE_STOP_CALL_TIMEOUT_SECS, SERVICE_STOP_MAX_ATTEMPTS,
};

/// Permit pool bounding how many blocking threads a wedged SCM can park at once.
#[cfg(target_os = "windows")]
fn scm_permits() -> &'static std::sync::Arc<tokio::sync::Semaphore> {
    static PERMITS: std::sync::OnceLock<std::sync::Arc<tokio::sync::Semaphore>> = std::sync::OnceLock::new();
    PERMITS.get_or_init(|| {
        std::sync::Arc::new(tokio::sync::Semaphore::new(crate::config::service_stop::SCM_MAX_IN_FLIGHT))
    })
}

/// Run a blocking SCM call off-runtime with a timeout, so a wedged SCM can never hang an async task.
#[cfg(target_os = "windows")]
async fn scm_call_timed<T, F>(service_name: &str, what: &str, timeout_secs: u64, f: F) -> Result<T>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    let permit = match tokio::time::timeout(
        Duration::from_secs(timeout_secs),
        scm_permits().clone().acquire_owned(),
    )
    .await
    {
        Err(_elapsed) => {
            return Err(anyhow::anyhow!(
                "SCM {} for service {} not attempted: all {} SCM call slots busy (SCM likely wedged)",
                what, service_name, crate::config::service_stop::SCM_MAX_IN_FLIGHT
            ))
        }
        Ok(Err(closed)) => {
            return Err(anyhow::anyhow!(
                "SCM {} for service {} not attempted: permit pool closed: {}",
                what, service_name, closed
            ))
        }
        Ok(Ok(permit)) => permit,
    };
    // The permit rides inside the closure so it frees only when the blocking call actually returns.
    match tokio::time::timeout(
        Duration::from_secs(timeout_secs),
        tokio::task::spawn_blocking(move || {
            let _permit = permit;
            f()
        }),
    )
    .await
    {
        Err(_elapsed) => Err(anyhow::anyhow!(
            "SCM {} for service {} timed out after {}s",
            what, service_name, timeout_secs
        )),
        Ok(Err(join_err)) => Err(anyhow::anyhow!(
            "SCM {} task for service {} failed: {}",
            what, service_name, join_err
        )),
        Ok(Ok(v)) => Ok(v),
    }
}

/// `query_service_status_windows` off-runtime with a timeout; the outer Err is an unresponsive SCM.
#[cfg(target_os = "windows")]
async fn query_service_status_timed(
    service_name: &str,
) -> Result<windows_service::Result<windows_service::service::ServiceStatus>> {
    let name = service_name.to_string();
    scm_call_timed(service_name, "status query", SCM_QUERY_TIMEOUT_SECS, move || {
        query_service_status_windows(&name)
    })
    .await
}

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
        let name = service_name.to_string();
        let start_result = scm_call_timed(service_name, "start call", SERVICE_START_CALL_TIMEOUT_SECS, move || {
            try_start_service_windows(&name)
        })
        .await
        .map_err(|e| format!("{e:#}"))
        .and_then(|r| r);
        match start_result {
            Ok(()) => match wait_for_service_running_windows(service_name).await {
                Some(true) => {
                    info!("Service {} confirmed running", service_name);
                    return Ok(());
                }
                Some(false) => {
                    last_err = "service did not reach RUNNING after start".to_string();
                    warn!("Start attempt {}/{} for service {}: {}",
                          attempt, SERVICE_START_MAX_ATTEMPTS, service_name, last_err);
                }
                None => {
                    last_err = "could not confirm RUNNING (SCM unresponsive)".to_string();
                    warn!("Start attempt {}/{} for service {}: {}",
                          attempt, SERVICE_START_MAX_ATTEMPTS, service_name, last_err);
                }
            },
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

/// Some(true) = RUNNING, Some(false) = polls exhausted without RUNNING, None = SCM unresponsive.
#[cfg(target_os = "windows")]
async fn wait_for_service_running_windows(service_name: &str) -> Option<bool> {
    use windows_service::service::ServiceState;
    let mut query_failures = 0u32;
    for _ in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
        match query_service_status_timed(service_name).await {
            Ok(Ok(status)) if status.current_state == ServiceState::Running => return Some(true),
            Ok(_) => query_failures = 0,
            Err(e) => {
                query_failures += 1;
                warn!("Status query for service {} failed while awaiting RUNNING: {e:#}", service_name);
                if query_failures >= SCM_QUERY_MAX_CONSECUTIVE_FAILURES {
                    return None;
                }
            }
        }
    }
    Some(false)
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
        if let Ok(Ok(status)) = query_service_status_timed(service_name).await {
            if status.current_state == ServiceState::Running {
                return Ok(());
            }
        }
        start_service(service_name)
            .await
            .with_context(|| format!("service {} did not reach RUNNING after install", service_name))
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
        match query_service_status_timed(service_name).await {
            Ok(status) => service_stopped_or_missing(&status),
            Err(e) => {
                warn!("Status query for service {} failed during install check: {e:#}", service_name);
                false
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = service_name;
        true
    }
}

#[cfg(target_os = "windows")]
async fn stop_service_windows(service_name: &str, allow_delete: bool) -> Result<()> {
    use windows_service::service::ServiceAccess;
    use winapi::shared::winerror::{
        ERROR_SERVICE_CANNOT_ACCEPT_CTRL, ERROR_SERVICE_DOES_NOT_EXIST, ERROR_SERVICE_NOT_ACTIVE,
    };

    info!("Stopping Windows service via SCM: {}", service_name);

    let svc = service_name.to_string();
    let stop_result = match scm_call_timed(service_name, "stop call", SERVICE_STOP_CALL_TIMEOUT_SECS, move || {
        let service = open_service_windows(&svc, ServiceAccess::QUERY_STATUS | ServiceAccess::STOP)?;
        service.stop()
    })
    .await
    {
        Err(e) => {
            warn!("service.stop() for {} did not complete ({e:#}); force-killing service process", service_name);
            return force_stop_service_windows(service_name, allow_delete).await;
        }
        Ok(result) => result,
    };

    match stop_result {
        Ok(_) => {
            info!("Service {} stop initiated", service_name);
            if wait_for_service_stop_windows(service_name).await? {
                return Ok(());
            }
            warn!("Service {} did not reach STOPPED after stop request; force-killing", service_name);
            force_stop_service_windows(service_name, allow_delete).await
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
            force_stop_service_windows(service_name, allow_delete).await
        }
        Err(e) => {
            error!("Failed to stop service {} via SCM: {}; force-killing service process", service_name, e);
            force_stop_service_windows(service_name, allow_delete).await
        }
    }
}

#[cfg(target_os = "windows")]
async fn force_stop_service_windows(service_name: &str, allow_delete: bool) -> Result<()> {
    for attempt in 1..=SERVICE_FORCE_KILL_MAX_ATTEMPTS {
        let status = match query_service_status_timed(service_name).await {
            Ok(status) => Some(status),
            Err(e) => {
                warn!("Status query for service {} failed during force-stop (attempt {}/{}): {e:#}",
                      service_name, attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
                None
            }
        };
        if status.as_ref().is_some_and(service_stopped_or_missing) {
            info!("Service {} is no longer running (force-stop attempt {})", service_name, attempt);
            return Ok(());
        }

        match status.as_ref().and_then(|s| s.as_ref().ok()).and_then(|s| s.process_id) {
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
                // SCM only reports a PID while the service is Running; in StopPending (and
                // other transitional states) the PID is hidden, so the SCM-PID path can never
                // act on a wedged service. Fall back to the service's configured image path
                // and kill any live process running from it directly.
                let name = service_name.to_string();
                let image_path = scm_call_timed(service_name, "config query", SCM_QUERY_TIMEOUT_SECS, move || {
                    service_image_exe_path_windows(&name)
                })
                .await
                .unwrap_or_else(|e| {
                    warn!("Config query for service {} failed during force-stop: {e:#}", service_name);
                    None
                });
                match image_path {
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
                        let state = service_state_label(status.as_ref());
                        info!("Service {} has no reportable PID and no resolvable image path (state {}, attempt {}/{}); waiting",
                              service_name, state, attempt, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
                    }
                }
            }
        }

        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
    }

    let status = query_service_status_timed(service_name).await.ok();
    if status.as_ref().is_some_and(service_stopped_or_missing) {
        info!("Service {} force-stopped successfully", service_name);
        return Ok(());
    }

    let state = service_state_label(status.as_ref());

    // Only delete when the caller will recreate the service (install/reinstall/uninstall). The
    // update/restore paths pass allow_delete=false: deleting there would brick the tool because
    // nothing re-registers the service, so report failure and let the caller retry/repair.
    if !allow_delete {
        return Err(anyhow::anyhow!(
            "Failed to force-stop service {} (state {} after {} attempts)",
            service_name, state, SERVICE_FORCE_KILL_MAX_ATTEMPTS
        ));
    }

    // Last resort: the service is wedged (typically StopPending that SCM won't reap, with no
    // killable process). Mark it for deletion via the SCM so the follow-up reinstall recreates
    // it cleanly. This is what lets a reinstall recover the agent without a machine reboot.
    warn!("Service {} still not stopped (state {}) after {} force-kill attempts; deleting it via SCM to clear the wedged state",
          service_name, state, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
    match delete_service_windows(service_name).await {
        Ok(()) => {
            info!("Service {} deleted; a fresh install will recreate it", service_name);
            Ok(())
        }
        Err(e) => {
            error!("Service {} could not be stopped or deleted: {:#}", service_name, e);
            Err(anyhow::anyhow!(
                "Failed to force-stop or delete service {} (state {} after {} attempts): {:#}",
                service_name, state, SERVICE_FORCE_KILL_MAX_ATTEMPTS, e
            ))
        }
    }
}

#[cfg(target_os = "windows")]
async fn wait_for_service_stop_windows(service_name: &str) -> Result<bool> {
    let mut query_failures = 0u32;
    for attempt in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;

        match query_service_status_timed(service_name).await {
            Ok(status) => {
                query_failures = 0;
                if service_stopped_or_missing(&status) {
                    info!("Service {} confirmed stopped after {} attempts", service_name, attempt);
                    return Ok(true);
                }
            }
            Err(e) => {
                query_failures += 1;
                warn!("Status query for service {} failed while awaiting stop: {e:#}", service_name);
                if query_failures >= SCM_QUERY_MAX_CONSECUTIVE_FAILURES {
                    warn!("SCM unresponsive for service {}; escalating to force-stop", service_name);
                    return Ok(false);
                }
            }
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

/// Human-readable state for logs; None or an SCM-level error reads as "unqueryable".
#[cfg(target_os = "windows")]
fn service_state_label(
    status: Option<&windows_service::Result<windows_service::service::ServiceStatus>>,
) -> String {
    status
        .and_then(|s| s.as_ref().ok())
        .map(|s| format!("{:?}", s.current_state))
        .unwrap_or_else(|| "unqueryable".to_string())
}

// Sync SCM call on the caller's thread; not timeboxed (callers are off the restart path).
#[cfg(target_os = "windows")]
pub fn service_exists(service_name: &str) -> bool {
    query_service_status_windows(service_name).is_ok()
}

// Sync SCM call on the caller's thread; not timeboxed (callers are off the restart path).
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

    if service_missing_timed(service_name).await.unwrap_or_else(|e| {
        warn!("Existence query for service {} failed before delete: {e:#}", service_name);
        false
    }) {
        return Ok(());
    }

    // The handle is opened, used, and dropped inside the closure — SCM only finalizes removal
    // once the last open handle is released.
    let name = service_name.to_string();
    scm_call_timed(service_name, "delete call", SCM_QUERY_TIMEOUT_SECS, move || {
        open_service_windows(&name, ServiceAccess::DELETE)?.delete()
    })
    .await?
    .with_context(|| format!("open/DeleteService failed for {}", service_name))?;

    let mut query_failures = 0u32;
    for _ in 1..=SERVICE_STOP_MAX_ATTEMPTS {
        match service_missing_timed(service_name).await {
            Ok(true) => return Ok(()),
            Ok(false) => query_failures = 0,
            Err(e) => {
                query_failures += 1;
                warn!("Existence query for service {} failed while confirming deletion: {e:#}", service_name);
                if query_failures >= SCM_QUERY_MAX_CONSECUTIVE_FAILURES {
                    return Err(anyhow::anyhow!(
                        "SCM unresponsive while confirming deletion of service {}",
                        service_name
                    ));
                }
            }
        }
        sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
    }

    if service_missing_timed(service_name).await.unwrap_or(false) {
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "service {} still present after delete request",
            service_name
        ))
    }
}

/// `service_missing_windows` off-runtime with a timeout; the outer Err is an unresponsive SCM.
#[cfg(target_os = "windows")]
async fn service_missing_timed(service_name: &str) -> Result<bool> {
    let name = service_name.to_string();
    scm_call_timed(service_name, "existence query", SCM_QUERY_TIMEOUT_SECS, move || {
        service_missing_windows(&name)
    })
    .await
}
