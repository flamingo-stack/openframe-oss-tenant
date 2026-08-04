// Download retry settings
pub const MAX_DOWNLOAD_RETRIES: u32 = 3;
pub const DOWNLOAD_TIMEOUT_SECS: u64 = 300;
/// The download service's own HTTP client budget — must not be lower than
/// DOWNLOAD_TIMEOUT_SECS or the reqwest timeout fires first and shrinks the
/// download window (the general-purpose client keeps its shorter timeout).
pub const DOWNLOAD_CLIENT_TIMEOUT_SECS: u64 = 300;
pub const MIN_BINARY_SIZE_BYTES: u64 = 100 * 1024; // 100 KB

// NATS consumer settings
pub const CLIENT_UPDATE_STREAM: &str = "CLIENT_UPDATE";
pub const CLIENT_UPDATE_FILTER_SUBJECT: &str = "machine.all.client-update";
/// Must comfortably exceed a normal update's time-to-ACK (download + service
/// stop + swap + up to 90s boot wait) — at 120s the same message was
/// redelivered mid-update and killed the observation window right after boot.
pub const CLIENT_UPDATE_ACK_WAIT_SECS: u64 = 600;
pub const CLIENT_UPDATE_MAX_DELIVER: i64 = 10;
pub const RECONNECTION_DELAY_MS: u64 = 5000;

// Consumer creation retry settings
pub const CONSUMER_RETRY_ATTEMPTS_PER_CYCLE: u32 = 5;
pub const CONSUMER_INITIAL_RETRY_DELAY_MS: u64 = 1000;
pub const CONSUMER_MAX_RETRY_DELAY_MS: u64 = 30000;
pub const CONSUMER_CYCLE_PAUSE_MS: u64 = 30000;

// Service stop/start timeouts
pub const SERVICE_STOP_TIMEOUT_SECS: u64 = 30;
pub const SERVICE_START_TIMEOUT_SECS: u64 = 30;

// After starting the client service, wait this long before checking Running state
pub const SERVICE_START_VERIFY_WAIT_SECS: u64 = 5;

// Last-known-good update ratchet — parity with the in-client updater (Hotfix #2169).
/// How long to wait for the new client binary to write its boot marker.
pub const BOOT_MARKER_WAIT_SECS: u64 = 90;
/// Poll interval while waiting for the boot marker.
pub const BOOT_MARKER_POLL_INTERVAL_SECS: u64 = 2;
/// Settle time between service start and the first Running-state check.
pub const SERVICE_START_SETTLE_SECS: u64 = 3;
/// Refuse update messages below the LKG anchor (flip to force a downgrade).
pub const ALLOW_DOWNGRADE: bool = false;
/// Attempts to restore a binary during rollback (file may be briefly locked).
pub const ROLLBACK_RESTORE_ATTEMPTS: u32 = 3;
/// Delay between rollback restore attempts.
pub const ROLLBACK_RESTORE_RETRY_DELAY_SECS: u64 = 2;

// Post-boot observation — automatic rollback when the new client degrades
// after a verified boot (stops running, crash-loops). The anchor is promoted
// only after the window passes, so a backend-pushed downgrade is never blocked
// by a bad version that slipped past the boot check.
/// How long to watch the new client after its boot marker verified.
pub const POST_BOOT_OBSERVATION_SECS: u64 = 600;
/// Poll interval during the observation window.
pub const POST_BOOT_POLL_INTERVAL_SECS: u64 = 10;
/// Client restarts (boot-marker rewrites) tolerated inside the window.
pub const OBSERVATION_MAX_CLIENT_RESTARTS: u32 = 3;

// Atomic binary replace: retries with backoff on Windows file locking
pub const REPLACE_MAX_RETRIES: u32 = 10;
pub const REPLACE_RETRY_DELAY_MS: u64 = 500;

// Subject patterns — format with machine_id at runtime
pub const SUBJECT_UPDATE_PROGRESS: &str = "machine.{machine_id}.client-update-progress";
pub const SUBJECT_INSTALLED_AGENT: &str = "machine.{machine_id}.installed-agent";

// The service name of the main client — used by ServiceManagerService to stop/start it
pub const CLIENT_SERVICE_FULL_NAME: &str = "com.openframe.client";

// The updater's own service name
pub const UPDATER_SERVICE_FULL_NAME: &str = "com.openframe.client-updater";

pub const UPDATER_VERSION: &str = env!("OPENFRAME_UPDATER_VERSION");
