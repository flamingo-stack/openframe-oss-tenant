// Download retry settings
pub const MAX_DOWNLOAD_RETRIES: u32 = 3;
pub const DOWNLOAD_TIMEOUT_SECS: u64 = 300;
pub const MIN_BINARY_SIZE_BYTES: u64 = 100 * 1024; // 100 KB

// NATS consumer settings
pub const CLIENT_UPDATE_STREAM: &str = "CLIENT_UPDATE";
pub const CLIENT_UPDATE_FILTER_SUBJECT: &str = "machine.all.client-update";
pub const CLIENT_UPDATE_ACK_WAIT_SECS: u64 = 120;
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
