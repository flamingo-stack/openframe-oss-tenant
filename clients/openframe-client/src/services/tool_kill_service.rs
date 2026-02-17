use anyhow::{Context, Result};
use tracing::{info, warn, error};
use sysinfo::{System, Signal, Pid};
use tokio::time::{sleep, Duration};
use crate::models::InstalledTool;
use crate::models::download_configuration::InstallationType;

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

        // Find all matching processes
        for (pid, process) in sys.processes() {
            let cmd_items = process.cmd();
            let cmdline = cmd_items.join(" ").to_lowercase();

            if cmdline.contains(pattern) {
                info!("Found process for {} with pid {}", description, pid);
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
        match tool.installation_type {
            InstallationType::GuiApp => {
                let exec_path = tool.executable_path.as_deref()
                    .context("GUI app has no executable path")?;
                info!("Stopping GUI app by executable path: {}", exec_path);
                self.stop_tool_by_path(exec_path).await
            }
            InstallationType::Standard => {
                self.stop_tool(&tool.tool_agent_id).await
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
}

