/// Configuration module for OpenFrame client
/// Contains constants and settings for various subsystems

use serde::{Deserialize, Serialize};

pub mod update_config;

/// Windows Service Control Manager error codes, as they appear in the
/// stdout/stderr of `sc` commands (e.g. `[SC] ControlService FAILED 1061`).
pub mod windows_service_error {
    /// 1056 — an instance of the service is already running.
    pub const ALREADY_RUNNING: &str = "1056";
    /// 1060 — the specified service does not exist.
    pub const DOES_NOT_EXIST: &str = "1060";
    /// 1061 — `ERROR_SERVICE_CANNOT_ACCEPT_CTRL`: the service is in a
    /// start-pending / stop-pending state and can't accept a control message
    /// right now (commonly the Mesh Agent on Windows Server).
    pub const CANNOT_ACCEPT_CTRL: &str = "1061";
    /// 1062 — the service has not been started.
    pub const NOT_STARTED: &str = "1062";
}

/// Timing and retry budget for stopping tool processes and OS services.
pub mod service_stop {
    /// Interval between process/service state polls, in milliseconds.
    pub const PROCESS_CHECK_INTERVAL_MS: u64 = 500;
    /// Seconds to wait for a graceful termination before escalating to force-kill.
    pub const GRACEFUL_SHUTDOWN_TIMEOUT_SECS: u64 = 5;
    /// Seconds to wait for a force-killed process to disappear.
    pub const FORCE_KILL_TIMEOUT_SECS: u64 = 3;
    /// Number of force-kill attempts for a single process.
    pub const MAX_KILL_RETRIES: u32 = 3;
    /// Max polls while waiting for a Windows service to report STOPPED
    /// (≈10s at `PROCESS_CHECK_INTERVAL_MS`).
    pub const SERVICE_STOP_MAX_ATTEMPTS: u32 = 20;
    /// Max force-kill attempts for a stuck Windows service. Windows restarts a
    /// failed service up to 3 times by default, so allow a margin above that.
    pub const SERVICE_FORCE_KILL_MAX_ATTEMPTS: u32 = 6;
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
