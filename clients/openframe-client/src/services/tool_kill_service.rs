use anyhow::Result;
use tracing::{info, warn, error};
use sysinfo::{System, Signal, Pid, ProcessRefreshKind, UpdateKind};
use tokio::time::{sleep, Duration};
use crate::models::{InstalledTool, Installation};
use crate::platform::system_service;
use crate::config::service_stop::{
    FORCE_KILL_TIMEOUT_SECS, GRACEFUL_SHUTDOWN_TIMEOUT_SECS, MAX_KILL_RETRIES,
    PROCESS_CHECK_INTERVAL_MS,
};

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

    /// Collect (pid, exe) of processes whose cmdline or exe path contains any of the patterns.
    fn collect_matching_processes(patterns: &[String]) -> Vec<(Pid, String)> {
        let mut sys = System::new();
        sys.refresh_processes_specifics(ProcessRefreshKind::new().with_cmd(UpdateKind::Always).with_exe(UpdateKind::Always));
        sys.processes()
            .iter()
            .filter_map(|(pid, process)| {
                let cmdline = process.cmd().join(" ").to_lowercase();
                let exe_path = process.exe().map(|p| p.to_string_lossy().to_lowercase()).unwrap_or_default();
                patterns
                    .iter()
                    .any(|p| cmdline.contains(p.as_str()) || exe_path.contains(p.as_str()))
                    .then(|| (*pid, exe_path.clone()))
            })
            .collect()
    }

    /// Check whether the installed tool's process is running; the pattern set mirrors stop_for_installation's kill targets.
    pub async fn is_installed_tool_running(&self, tool: &InstalledTool) -> bool {
        let mut patterns: Vec<String> = Vec::new();
        match &tool.installation {
            Installation::GuiApp { executable_path, .. } => patterns.push(executable_path.to_lowercase()),
            Installation::Standard { executable_path } => {
                if let Some(path) = executable_path {
                    patterns.push(path.to_lowercase());
                }
                patterns.push(Self::build_tool_cmd_pattern(&tool.tool_agent_id));
            }
            Installation::Service { executable_path, .. } => match executable_path {
                Some(path) => patterns.push(path.to_lowercase()),
                // No registered path to mirror: fall back to the tool pattern rather than reporting a blind false.
                None => patterns.push(Self::build_tool_cmd_pattern(&tool.tool_agent_id)),
            },
        }
        tokio::task::spawn_blocking(move || !Self::collect_matching_processes(&patterns).is_empty())
            .await
            .unwrap_or(false)
    }

    /// Generic method to stop processes matching a command pattern
    ///
    /// This method will search for any running processes that match the given
    /// pattern and attempt to terminate them gracefully with retries and verification.
    async fn stop_processes_by_pattern(&self, pattern: &str, description: &str) -> Result<()> {
        info!("Attempting to stop {}", description);
        info!("Using pattern to stop: {}", pattern);

        let pattern_string = pattern.to_string();
        let matches = tokio::task::spawn_blocking(move || Self::collect_matching_processes(&[pattern_string]))
            .await
            .unwrap_or_default();

        let mut pids_to_stop = Vec::new();
        for (pid, exe_path) in matches {
            info!("Found process for {} with pid {} (exe: {})", description, pid, exe_path);
            pids_to_stop.push(pid);
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

    pub async fn stop_installed_tool(&self, tool: &InstalledTool, allow_delete: bool) -> Result<()> {
        self.stop_for_installation(&tool.tool_agent_id, &tool.installation, allow_delete).await
    }

    pub async fn stop_for_installation(&self, tool_agent_id: &str, installation: &Installation, allow_delete: bool) -> Result<()> {
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
                info!(service_name = %service_name,
                      "Stopping Service type tool via system service manager");
                if let Err(e) = system_service::stop_service(service_name, allow_delete).await {
                    warn!("Failed to stop service {} (continuing with process kill by path): {:#}",
                          service_name, e);
                }

                // Kill any remaining processes by executable path (detached children)
                if let Some(path) = executable_path {
                    info!("Killing remaining processes by path: {}", path);
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
}
