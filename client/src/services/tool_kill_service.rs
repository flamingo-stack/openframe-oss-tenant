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
        info!("Attempting to stop tool: {}", tool_id);
        
        let mut sys = System::new_all();
        sys.refresh_all();

        // Match processes whose command contains "/{tool_id}/agent"
        let pattern = Self::build_cmd_pattern(tool_id);
        let mut stopped_count = 0;

        for (pid, process) in sys.processes() {
            let cmd_items = process.cmd();
            let cmdline = cmd_items.join(" ").to_lowercase();

            if cmdline.contains(&pattern) {
                info!("Found tool process for {} with pid {}", tool_id, pid);

                // Try graceful termination first
                if process.kill() {
                    info!("Tool process terminated gracefully for {} with pid {}", tool_id, pid);
                    stopped_count += 1;
                } else {
                    warn!("Failed to terminate tool process gracefully for {} with pid {}, attempting force kill", tool_id, pid);
                    
                    // Fall back to force kill
                    if let Some(killed) = process.kill_with(Signal::Kill) {
                        if killed {
                            info!("Tool process force killed for {} with pid {}", tool_id, pid);
                            stopped_count += 1;
                        } else {
                            error!("Failed to force kill tool process for {} with pid {}", tool_id, pid);
                        }
                    } else {
                        error!("Failed to send kill signal to tool process for {} with pid {}", tool_id, pid);
                    }
                }
            }
        }

        if stopped_count > 0 {
            info!("Stopped {} process(es) for tool: {}", stopped_count, tool_id);
        } else {
            info!("No running processes found for tool: {}", tool_id);
        }

        Ok(())
    }

    /// Build the command pattern to match for a given tool ID
    fn build_cmd_pattern(tool_id: &str) -> String {
        #[cfg(target_os = "windows")]
        {
            format!("\\{}\\agent", tool_id).to_lowercase()
        }
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            format!("/{}/agent", tool_id).to_lowercase()
        }
    }
}

