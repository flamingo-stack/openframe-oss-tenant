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

// Last-known-good update ratchet
/// How long the updater waits for the new binary's boot marker.
pub const BOOT_MARKER_WAIT_SECS: u64 = 90;
/// Unverified boots tolerated before an update is treated as failed.
pub const CRASH_LOOP_MAX_BOOT_ATTEMPTS: u32 = 3;
/// Refuse update messages below the LKG anchor (flip to force a downgrade).
pub const ALLOW_DOWNGRADE: bool = false;
/// Updater transcripts kept after pruning; one is written per update attempt.
pub const UPDATER_TRANSCRIPTS_KEPT: usize = 5;
/// Minimum age before a temp update leftover is swept (a live updater's files are younger).
pub const TEMP_LEFTOVER_MIN_AGE_SECS: u64 = 3600;

// NATS message settings
pub const CONSUMER_ACK_WAIT_SECS: u64 = 120;
pub const CONSUMER_MAX_DELIVER: i64 = 10; // Maximum delivery attempts
pub const UNINSTALL_CONSUMER_MAX_DELIVER: i64 = 20; // Larger budget: uninstall may defer behind a long install holding the tool lock
pub const RESTART_CONSUMER_MAX_DELIVER: i64 = 20; // Larger budget: restart may defer behind a long install holding the tool lock

// Client-before-tool update ordering
pub const CLIENT_UPDATE_PENDING_TTL_SECS: u64 = 300; // > ack_wait (120s) so the flag survives redelivery gaps of a deferred client update
pub const PROGRESS_ACK_INTERVAL_SECS: u64 = 60; // well inside ack_wait (120s)
