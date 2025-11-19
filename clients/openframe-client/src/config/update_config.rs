// Download settings
pub const MAX_DOWNLOAD_RETRIES: u32 = 3;
pub const DOWNLOAD_TIMEOUT_SECS: u64 = 300; // 5 minutes
pub const MIN_BINARY_SIZE_BYTES: u64 = 1024 * 100; // 100 KB

// Consumer retry
pub const MAX_CONSUMER_CREATE_RETRIES: u32 = 5;
pub const INITIAL_RETRY_DELAY_MS: u64 = 1000; // 1 second
pub const MAX_RETRY_DELAY_MS: u64 = 30000; // 30 seconds

// Reconnection
pub const RECONNECTION_DELAY_MS: u64 = 5000; // 5 seconds

// NATS message settings
pub const CONSUMER_ACK_WAIT_SECS: u64 = 60; // 1 minute
