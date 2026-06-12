use anyhow::{Context, Result};
use tracing::{info, warn, error};
use sysinfo::{System, Signal, Pid};
use tokio::time::{sleep, Duration};
use tokio::process::Command;
use crate::models::{InstalledTool, Installation};
use crate::config::service_stop::{
    FORCE_KILL_TIMEOUT_SECS, GRACEFUL_SHUTDOWN_TIMEOUT_SECS, MAX_KILL_RETRIES,
    PROCESS_CHECK_INTERVAL_MS,
};
#[cfg(target_os = "windows")]
use crate::config::service_stop::{SERVICE_FORCE_KILL_MAX_ATTEMPTS, SERVICE_STOP_MAX_ATTEMPTS};
#[cfg(target_os = "windows")]
use crate::config::windows_service_error;

/// Service responsible for stopping/killing tool processes
#[derive(Clone)]
pub struct ToolKillService;

impl ToolKillService {
    pub fn new() -> Self {
        Self
    }

    /// Stop a tool process by tool ID
    ///
    /// This method will search for any running processes that match the tool's
    /// command pattern and attempt to terminate them gracefully, falling back
    /// to force kill if necessary.
    pub async fn stop_tool(&self, tool_id: &str) -> Result<()> {
        let pattern = Self::build_tool_cmd_pattern(tool_id);
        self.stop_processes_by_pattern(&pattern, &format!("tool: {}", tool_id)).await
    }

    /// Stop an asset process by asset ID and tool ID
    ///
    /// This method will search for any running processes that match the asset's
    /// command pattern and attempt to terminate them gracefully, falling back
    /// to force kill if necessary.
    pub async fn stop_asset(&self, asset_id: &str, tool_id: &str) -> Result<()> {
        let pattern = Self::build_asset_cmd_pattern(asset_id, tool_id);
        self.stop_processes_by_pattern(&pattern, &format!("asset: {} (tool: {})", asset_id, tool_id)).await
    }

    /// Generic method to stop processes matching a command pattern
    ///
    /// This method will search for any running processes that match the given
    /// pattern and attempt to terminate them gracefully with retries and verification.
    async fn stop_processes_by_pattern(&self, pattern: &str, description: &str) -> Result<()> {
        info!("Attempting to stop {}", description);
        info!("Using pattern to stop: {}", pattern);

        let mut sys = System::new_all();
        sys.refresh_all();

        let mut pids_to_stop = Vec::new();

        // Find all matching processes by cmdline OR executable path
        for (pid, process) in sys.processes() {
            let cmd_items = process.cmd();
            let cmdline = cmd_items.join(" ").to_lowercase();
            let exe_path = process.exe().map(|p| p.to_string_lossy().to_lowercase()).unwrap_or_default();

            if cmdline.contains(pattern) || exe_path.contains(pattern) {
                info!("Found process for {} with pid {} (exe: {})", description, pid, exe_path);
                pids_to_stop.push(*pid);
            }
        }

        if pids_to_stop.is_empty() {
            info!("No running processes found for {}", description);
            return Ok(());
        }

        info!("Found {} process(es) to stop for {}", pids_to_stop.len(), description);

        // Stop each process with retries
        for pid in pids_to_stop {
            self.stop_process_with_retry(pid, description).await?;
        }

        info!("All processes stopped successfully for {}", description);
        Ok(())
    }

    /// Stop a single process with retry logic and verification
    ///
    /// Attempts graceful termination first, waits for process to exit, then falls back
    /// to force kill with retries if necessary.
    async fn stop_process_with_retry(&self, pid: Pid, description: &str) -> Result<()> {
        info!("Stopping process {} for {}", pid, description);

        // Try graceful termination first
        if self.try_graceful_stop(pid, description).await? {
            return Ok(());
        }

        // Graceful stop failed, try force kill with retries
        for attempt in 1..=MAX_KILL_RETRIES {
            info!("Force kill attempt {}/{} for process {} ({})", attempt, MAX_KILL_RETRIES, pid, description);

            if self.try_force_kill(pid, description).await? {
                return Ok(());
            }

            if attempt < MAX_KILL_RETRIES {
                warn!("Force kill attempt {} failed for process {} ({}), retrying...", attempt, pid, description);
                sleep(Duration::from_secs(1)).await;
            }
        }

        error!("Failed to stop process {} ({}) after {} attempts", pid, description, MAX_KILL_RETRIES);
        Err(anyhow::anyhow!(
            "Failed to stop process {} ({}) after {} attempts",
            pid,
            description,
            MAX_KILL_RETRIES
        ))
    }

    /// Try graceful termination and wait for process to exit
    async fn try_graceful_stop(&self, pid: Pid, description: &str) -> Result<bool> {
        let mut sys = System::new_all();
        sys.refresh_all();

        if let Some(process) = sys.process(pid) {
            info!("Sending graceful termination signal to process {} ({})", pid, description);

            if !process.kill() {
                warn!("Failed to send graceful termination signal to process {} ({})", pid, description);
                return Ok(false);
            }

            // Wait for process to exit
            if self.wait_for_process_exit(pid, GRACEFUL_SHUTDOWN_TIMEOUT_SECS).await {
                info!("Process {} ({}) terminated gracefully", pid, description);
                return Ok(true);
            }

            warn!("Process {} ({}) did not exit within {} seconds after graceful signal",
                  pid, description, GRACEFUL_SHUTDOWN_TIMEOUT_SECS);
        }

        Ok(false)
    }

    /// Try force kill and wait for process to exit
    async fn try_force_kill(&self, pid: Pid, description: &str) -> Result<bool> {
        let mut sys = System::new_all();
        sys.refresh_all();

        if let Some(process) = sys.process(pid) {
            info!("Sending force kill signal to process {} ({})", pid, description);

            match process.kill_with(Signal::Kill) {
                Some(true) => {
                    info!("Force kill signal sent to process {} ({})", pid, description);
                }
                Some(false) => {
                    warn!("Force kill signal failed for process {} ({})", pid, description);
                    return Ok(false);
                }
                None => {
                    error!("Failed to send force kill signal to process {} ({})", pid, description);
                    return Ok(false);
                }
            }

            // Wait for process to exit
            if self.wait_for_process_exit(pid, FORCE_KILL_TIMEOUT_SECS).await {
                info!("Process {} ({}) terminated by force kill", pid, description);
                return Ok(true);
            }

            warn!("Process {} ({}) still running after force kill signal", pid, description);
            return Ok(false);
        } else {
            // Process not found - it might have already exited
            info!("Process {} ({}) not found, likely already exited", pid, description);
            return Ok(true);
        }
    }

    /// Wait for a process to exit, checking periodically
    ///
    /// Returns true if process exited, false if timeout reached
    async fn wait_for_process_exit(&self, pid: Pid, timeout_secs: u64) -> bool {
        let max_checks = (timeout_secs * 1000) / PROCESS_CHECK_INTERVAL_MS;

        for check in 1..=max_checks {
            sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;

            let mut sys = System::new_all();
            sys.refresh_all();

            if sys.process(pid).is_none() {
                info!("Process {} exited after {} ms", pid, check * PROCESS_CHECK_INTERVAL_MS);
                return true;
            }
        }

        false
    }

    pub async fn stop_tool_by_path(&self, executable_path: &str) -> Result<()> {
        let pattern = executable_path.to_lowercase();
        self.stop_processes_by_pattern(&pattern, &format!("path: {}", executable_path)).await
    }

    pub async fn stop_installed_tool(&self, tool: &InstalledTool) -> Result<()> {
        self.stop_for_installation(&tool.tool_agent_id, &tool.installation).await
    }

    pub async fn stop_for_installation(&self, tool_agent_id: &str, installation: &Installation) -> Result<()> {
        match installation {
            Installation::GuiApp { executable_path, .. } => {
                info!("Stopping GUI app by executable path: {}", executable_path);
                self.stop_tool_by_path(executable_path).await
            }
            Installation::Standard { executable_path } => {
                if let Some(path) = executable_path {
                    self.stop_tool_by_path(path).await?;
                }
                self.stop_tool(tool_agent_id).await
            }
            Installation::Service { service_name, executable_path } => {
                info!(tool_id = %tool_agent_id, service_name = %service_name,
                      "Stopping Service type tool via system service manager");
                // Non-fatal: even if the service manager can't stop it, fall through
                // to the path-based process kill below so a stuck/pending service
                // (e.g. Mesh Agent returning error 1061) doesn't leave the binary
                // locked and dead-lock the reinstall/update.
                if let Err(e) = self.stop_service(service_name).await {
                    warn!(tool_id = %tool_agent_id,
                          "Failed to stop service {} (continuing with process kill by path): {:#}",
                          service_name, e);
                }

                // Kill any remaining processes by executable path (detached children)
                if let Some(path) = executable_path {
                    info!(tool_id = %tool_agent_id, "Killing remaining processes by path: {}", path);
                    self.stop_tool_by_path(path).await?;
                }
                Ok(())
            }
        }
    }

    /// Build the command pattern to match for a given tool ID
    /// Pattern: {tool}\agent (Windows) or {tool}/agent (Unix)
    fn build_tool_cmd_pattern(tool_id: &str) -> String {
        #[cfg(target_os = "windows")]
        {
            format!("{}\\agent", tool_id).to_lowercase()
        }
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            format!("{}/agent", tool_id).to_lowercase()
        }
    }

    /// Build the command pattern to match for a given asset ID and tool ID
    /// Pattern: \{tool}\{asset} (Windows) or /{tool}/{asset} (Unix)
    fn build_asset_cmd_pattern(asset_id: &str, tool_id: &str) -> String {
        #[cfg(target_os = "windows")]
        {
            format!("\\{}\\{}", tool_id, asset_id).to_lowercase()
        }
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            format!("/{}/{}", tool_id, asset_id).to_lowercase()
        }
    }

    pub async fn stop_service(&self, service_name: &str) -> Result<()> {
        info!("Stopping service: {}", service_name);

        #[cfg(target_os = "windows")]
        {
            self.stop_service_windows(service_name).await
        }

        #[cfg(target_os = "macos")]
        {
            self.stop_service_macos(service_name).await
        }

        #[cfg(target_os = "linux")]
        {
            self.stop_service_linux(service_name).await
        }
    }

    #[cfg(target_os = "windows")]
    async fn stop_service_windows(&self, service_name: &str) -> Result<()> {
        info!("Stopping Windows service via sc stop: {}", service_name);

        let output = Command::new("sc")
            .args(["stop", service_name])
            .output()
            .await
            .with_context(|| format!("Failed to execute sc stop for service: {}", service_name))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        if output.status.success() {
            info!("Service {} stop initiated", service_name);
            // `sc stop` only *initiates* the stop; the SCM may keep reporting the
            // service as running for a while. If it never reaches STOPPED, fall
            // back to force-killing so we don't leave the binary locked.
            if self.wait_for_service_stop_windows(service_name).await? {
                return Ok(());
            }
            warn!("Service {} did not reach STOPPED after sc stop; force-killing", service_name);
            return self.force_stop_service_windows(service_name).await;
        }

        if stderr.contains(windows_service_error::NOT_STARTED)
            || stdout.contains(windows_service_error::NOT_STARTED)
        {
            // The service has not been started.
            info!("Service {} is not running (error {})", service_name, windows_service_error::NOT_STARTED);
            return Ok(());
        }

        if stderr.contains(windows_service_error::DOES_NOT_EXIST)
            || stdout.contains(windows_service_error::DOES_NOT_EXIST)
        {
            // The specified service does not exist.
            warn!("Service {} does not exist (error {})", service_name, windows_service_error::DOES_NOT_EXIST);
            return Ok(());
        }

        // Error 1061 (ERROR_SERVICE_CANNOT_ACCEPT_CTRL): the service is in a
        // pending/transitional state and won't accept a stop right now. This is
        // common with the Mesh Agent on Windows Server and previously caused the
        // reinstall to abort, leaving agent.exe locked (os error 32) in a retry
        // loop. Any other sc failure is treated the same way: force-kill the
        // service process so the reinstall/update can proceed instead of
        // dead-locking.
        if stderr.contains(windows_service_error::CANNOT_ACCEPT_CTRL)
            || stdout.contains(windows_service_error::CANNOT_ACCEPT_CTRL)
        {
            warn!("Service {} cannot accept stop control (error {}); force-killing service process",
                  service_name, windows_service_error::CANNOT_ACCEPT_CTRL);
        } else {
            error!("sc stop failed for service {}: stdout={}, stderr={}; force-killing service process",
                   service_name, stdout.trim(), stderr.trim());
        }
        self.force_stop_service_windows(service_name).await
    }

    /// Force-stop a Windows service by killing its host process tree.
    ///
    /// Used when `sc stop` can't gracefully stop the service (e.g. error 1061,
    /// the service is in a pending state). Resolves the service PID via
    /// `sc queryex` and terminates it with `taskkill /F /T`, retrying to defeat
    /// SCM auto-restart, until the service is no longer running.
    #[cfg(target_os = "windows")]
    async fn force_stop_service_windows(&self, service_name: &str) -> Result<()> {
        for attempt in 1..=SERVICE_FORCE_KILL_MAX_ATTEMPTS {
            match self.query_service_pid_windows(service_name).await {
                // PID 0 or no PID line => service is not running.
                Some(0) | None => {
                    info!("Service {} is no longer running (force-stop attempt {})", service_name, attempt);
                    return Ok(());
                }
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
                        // taskkill returns non-zero if the process already exited
                        // between query and kill; that's fine, the next check confirms.
                        warn!("taskkill for service {} (pid {}) reported: stdout={} stderr={}",
                              service_name, pid, kill_stdout.trim(), kill_stderr.trim());
                    }
                }
            }

            sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;
        }

        // Final verification.
        match self.query_service_pid_windows(service_name).await {
            Some(0) | None => {
                info!("Service {} force-stopped successfully", service_name);
                Ok(())
            }
            Some(pid) => {
                error!("Service {} still running (pid {}) after {} force-kill attempts",
                       service_name, pid, SERVICE_FORCE_KILL_MAX_ATTEMPTS);
                Err(anyhow::anyhow!(
                    "Failed to force-stop service {} (pid {} still running after {} attempts)",
                    service_name, pid, SERVICE_FORCE_KILL_MAX_ATTEMPTS
                ))
            }
        }
    }

    /// Resolve the host process PID of a Windows service via `sc queryex`.
    ///
    /// Returns `Some(0)` when the service reports a zero PID (stopped), and
    /// `None` when the service can't be queried or has no PID line.
    #[cfg(target_os = "windows")]
    async fn query_service_pid_windows(&self, service_name: &str) -> Option<u32> {
        let output = Command::new("sc")
            .args(["queryex", service_name])
            .output()
            .await
            .ok()?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let line = line.trim();
            // The PID line looks like: "PID                : 1234"
            if let Some(rest) = line.strip_prefix("PID") {
                if let Some(value) = rest.split(':').nth(1) {
                    if let Ok(pid) = value.trim().parse::<u32>() {
                        return Some(pid);
                    }
                }
            }
        }
        None
    }

    /// Poll `sc query` until the service reports STOPPED.
    ///
    /// Returns `Ok(true)` if the service reached STOPPED (or no longer exists),
    /// `Ok(false)` if it timed out while still running.
    #[cfg(target_os = "windows")]
    async fn wait_for_service_stop_windows(&self, service_name: &str) -> Result<bool> {
        for attempt in 1..=SERVICE_STOP_MAX_ATTEMPTS {
            sleep(Duration::from_millis(PROCESS_CHECK_INTERVAL_MS)).await;

            let output = Command::new("sc")
                .args(["query", service_name])
                .output()
                .await?;

            let stdout = String::from_utf8_lossy(&output.stdout);

            // A missing service (DOES_NOT_EXIST) is effectively stopped/removed.
            if stdout.contains("STOPPED") || stdout.contains(windows_service_error::DOES_NOT_EXIST) {
                info!("Service {} confirmed stopped after {} attempts", service_name, attempt);
                return Ok(true);
            }
        }

        warn!("Service {} did not confirm stopped after {} attempts", service_name, SERVICE_STOP_MAX_ATTEMPTS);
        Ok(false)
    }

    #[cfg(target_os = "macos")]
    async fn stop_service_macos(&self, service_name: &str) -> Result<()> {
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
    async fn stop_service_linux(&self, service_name: &str) -> Result<()> {
        info!("Stopping Linux service via systemctl stop: {}", service_name);

        let output = Command::new("systemctl")
            .args(["stop", service_name])
            .output()
            .await
            .with_context(|| format!("Failed to execute systemctl stop for service: {}", service_name))?;

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
}

