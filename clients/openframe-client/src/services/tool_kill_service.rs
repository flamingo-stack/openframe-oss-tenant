use anyhow::{Context, Result};
use tracing::{info, warn, error};
use sysinfo::{System, Signal, Pid};
use tokio::time::{sleep, Duration};
use tokio::process::Command;
use crate::models::{InstalledTool, Installation};

/// Service responsible for stopping/killing tool processes
#[derive(Clone)]
pub struct ToolKillService;

/// Configuration for process termination
const GRACEFUL_SHUTDOWN_TIMEOUT_SECS: u64 = 5;
const FORCE_KILL_TIMEOUT_SECS: u64 = 3;
const MAX_KILL_RETRIES: u32 = 3;
const PROCESS_CHECK_INTERVAL_MS: u64 = 500;

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
        match &tool.installation {
            Installation::GuiApp { executable_path, .. } => {
                info!("Stopping GUI app by executable path: {}", executable_path);
                self.stop_tool_by_path(executable_path).await
            }
            Installation::Standard { .. } => {
                self.stop_tool(&tool.tool_agent_id).await
            }
            Installation::Service { service_name, executable_path } => {
                info!(tool_id = %tool.tool_agent_id, service_name = %service_name,
                      "Stopping Service type tool via system service manager");
                self.stop_service(service_name).await?;

                // Kill any remaining processes by executable path (detached children)
                if let Some(path) = executable_path {
                    info!(tool_id = %tool.tool_agent_id, "Killing remaining processes by path: {}", path);
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
            self.wait_for_service_stop_windows(service_name).await
        } else if stderr.contains("1062") || stdout.contains("1062") {
            // Error 1062: The service has not been started
            info!("Service {} is not running (error 1062)", service_name);
            Ok(())
        } else if stderr.contains("1060") || stdout.contains("1060") {
            // Error 1060: The specified service does not exist
            warn!("Service {} does not exist (error 1060)", service_name);
            Ok(())
        } else {
            error!("Failed to stop service {}: stdout={}, stderr={}", service_name, stdout, stderr);
            Err(anyhow::anyhow!(
                "Failed to stop service {}: {}",
                service_name,
                stderr
            ))
        }
    }

    #[cfg(target_os = "windows")]
    async fn wait_for_service_stop_windows(&self, service_name: &str) -> Result<()> {
        const MAX_ATTEMPTS: u32 = 20; // 10 seconds total

        for attempt in 1..=MAX_ATTEMPTS {
            sleep(Duration::from_millis(500)).await;

            let output = Command::new("sc")
                .args(["query", service_name])
                .output()
                .await?;

            let stdout = String::from_utf8_lossy(&output.stdout);

            if stdout.contains("STOPPED") {
                info!("Service {} confirmed stopped after {} attempts", service_name, attempt);
                return Ok(());
            }
        }

        warn!("Service {} did not confirm stopped after {} attempts", service_name, MAX_ATTEMPTS);
        Ok(())
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

