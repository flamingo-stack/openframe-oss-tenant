use anyhow::Result;
use tracing::{info, warn, error};
use sysinfo::{System, Signal};

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
    /// pattern and attempt to terminate them gracefully, falling back to force
    /// kill if necessary.
    async fn stop_processes_by_pattern(&self, pattern: &str, description: &str) -> Result<()> {
        info!("Attempting to stop {}", description);
        info!("Use pattern to stop {}", pattern);
        
        let mut sys = System::new_all();
        sys.refresh_all();

        let mut stopped_count = 0;

        for (pid, process) in sys.processes() {
            let cmd_items = process.cmd();
            let cmdline = cmd_items.join(" ").to_lowercase();

            if cmdline.contains(pattern) {
                info!("Found process for {} with pid {}", description, pid);

                // Try graceful termination first
                if process.kill() {
                    info!("Process terminated gracefully for {} with pid {}", description, pid);
                    stopped_count += 1;
                } else {
                    warn!("Failed to terminate process gracefully for {} with pid {}, attempting force kill", description, pid);
                    
                    // Fall back to force kill
                    if let Some(killed) = process.kill_with(Signal::Kill) {
                        if killed {
                            info!("Process force killed for {} with pid {}", description, pid);
                            stopped_count += 1;
                        } else {
                            error!("Failed to force kill process for {} with pid {}", description, pid);
                        }
                    } else {
                        error!("Failed to send kill signal to process for {} with pid {}", description, pid);
                    }
                }
            }
        }

        if stopped_count > 0 {
            info!("Stopped {} process(es) for {}", stopped_count, description);
        } else {
            info!("No running processes found for {}", description);
        }

        Ok(())
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

