/// Configuration module for OpenFrame client
/// Contains constants and settings for various subsystems
use serde::{Deserialize, Serialize};

pub mod update_config;

/// Timing and retry budget for stopping tool processes and OS services.
pub mod service_stop {
    /// Poll interval for process/service state (ms).
    pub const PROCESS_CHECK_INTERVAL_MS: u64 = 500;
    /// Grace period before escalating a process to force-kill (s).
    pub const GRACEFUL_SHUTDOWN_TIMEOUT_SECS: u64 = 5;
    /// Wait for a force-killed process to exit (s).
    pub const FORCE_KILL_TIMEOUT_SECS: u64 = 3;
    /// Force-kill attempts per process.
    pub const MAX_KILL_RETRIES: u32 = 3;
    /// Polls awaiting a Windows service state change (~10s; up to ~210s if SCM queries keep timing out non-consecutively).
    pub const SERVICE_STOP_MAX_ATTEMPTS: u32 = 20;
    /// Force-kill rounds for a stuck service (margin over Windows' 3 auto-restarts).
    pub const SERVICE_FORCE_KILL_MAX_ATTEMPTS: u32 = 6;
    /// Cap on a blocking SCM `stop()` before force-killing (else hangs ~4 min).
    pub const SERVICE_STOP_CALL_TIMEOUT_SECS: u64 = 10;
    /// Start attempts for a service before giving up.
    pub const SERVICE_START_MAX_ATTEMPTS: u32 = 3;
    /// Cap on any blocking SCM query (status/config/delete) so a wedged SCM can't hang a task.
    pub const SCM_QUERY_TIMEOUT_SECS: u64 = 10;
    /// Cap on a blocking SCM `start()` call (StartService can stall behind a busy service).
    pub const SERVICE_START_CALL_TIMEOUT_SECS: u64 = 30;
    /// Consecutive SCM query failures before a wait loop stops polling and escalates.
    pub const SCM_QUERY_MAX_CONSECUTIVE_FAILURES: u32 = 2;
    /// Overall cap on a guarded tool restart; guarantees the updating flag and tool lock release.
    pub const TOOL_RESTART_TIMEOUT_SECS: u64 = 600;
    /// In-flight SCM call permits; bounds blocking threads a wedged SCM can park.
    pub const SCM_MAX_IN_FLIGHT: usize = 4;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Configuration {
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub json: bool,
    pub rotation_size_mb: u64,
    pub max_files: u32,
}

impl Default for Configuration {
    fn default() -> Self {
        Self {
            logging: LoggingConfig {
                level: "info".to_string(),
                json: true,
                rotation_size_mb: 10,
                max_files: 5,
            },
        }
    }
}
