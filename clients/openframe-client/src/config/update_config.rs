// Download settings
pub const MAX_DOWNLOAD_RETRIES: u32 = 3;
pub const DOWNLOAD_TIMEOUT_SECS: u64 = 300; // 5 minutes
pub const MIN_BINARY_SIZE_BYTES: u64 = 1024 * 100; // 100 KB

// HTTP client timeouts
pub const HTTP_CLIENT_TIMEOUT_SECS: u64 = 120; // control-plane (auth, registration, heartbeat, key fetch)
pub const DOWNLOAD_CLIENT_TIMEOUT_SECS: u64 = 300; // binary downloads (GitHub, Artifactory, tool API)

// Consumer retry
pub const CONSUMER_RETRY_ATTEMPTS_PER_CYCLE: u32 = 5;
pub const INITIAL_RETRY_DELAY_MS: u64 = 1000; // 1 second
pub const MAX_RETRY_DELAY_MS: u64 = 30000; // 30 seconds
pub const CONSUMER_CYCLE_PAUSE_MS: u64 = 30000; // 30 seconds pause between retry cycles

// Reconnection
pub const RECONNECTION_DELAY_MS: u64 = 5000; // 5 seconds

// Execution concurrency
pub const EXECUTION_MIN_CONCURRENCY: usize = 4;

// NATS message settings
pub const CONSUMER_ACK_WAIT_SECS: u64 = 120;
pub const CONSUMER_MAX_DELIVER: i64 = 10; // Maximum delivery attempts
pub const UNINSTALL_CONSUMER_MAX_DELIVER: i64 = 20; // Larger budget: uninstall may defer behind a long install holding the tool lock
