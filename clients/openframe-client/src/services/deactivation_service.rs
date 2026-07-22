use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use chrono::{DateTime, Utc};
use reqwest::StatusCode;
use tokio::sync::mpsc;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{error, info, warn};

use crate::platform::DirectoryManager;
use crate::services::tool_run_manager::ToolRunManager;

/// Consecutive `410 Gone` responses before we stop tools and gate outbound calls.
const STOP_TOOLS_AFTER_CONSECUTIVE_GONE: u32 = 5;
/// First delay between probes once suspended.
const PROBE_BACKOFF_INITIAL: Duration = Duration::from_secs(60);
/// Cap on the exponential probe backoff.
const PROBE_BACKOFF_MAX: Duration = Duration::from_secs(30 * 60);
/// Total time the tenant must stay gone (since the first 410) before self-uninstall.
const UNINSTALL_AFTER: Duration = Duration::from_secs(2 * 60 * 60);
/// After any (re)start, require this much fresh confirmation before uninstalling, so a
/// reboot near the deadline can't let a single 410 wipe the device.
const POST_RESTART_GRACE: Duration = Duration::from_secs(60 * 60);
/// Persisted marker (in the secured dir) holding the first-410 timestamp across restarts.
const GONE_MARKER_FILE: &str = "tenant_gone_since";

/// Feature is macOS + Windows only (Linux client self-uninstall is unsupported).
const ENABLED: bool = cfg!(any(target_os = "macos", target_os = "windows"));

/// Self-uninstall is terminal — retry the detached spawn before giving up.
const UNINSTALL_SPAWN_ATTEMPTS: u32 = 3;
const UNINSTALL_SPAWN_RETRY_DELAY: Duration = Duration::from_secs(30);

/// Action the internal supervisor executes, kept off the detection path.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DeactivationCommand {
    StopTools,
    RestartTools,
    Uninstall,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Phase {
    Healthy,
    Suspended,
}

struct State {
    phase: Phase,
    consecutive_gone: u32,
    /// First 410 of the current gone episode (persisted, reset on recovery).
    gone_since: Option<DateTime<Utc>>,
    probe_backoff: Duration,
    uninstall_triggered: bool,
    /// Monotonic start of this run. The 24h deadline itself is wall-clock ([`State::gone_since`])
    /// because it must track real time across restarts; this monotonic grace floor bounds it so a
    /// wrong or fast-forwarded system clock can't shortcut the uninstall. `Instant` pauses during
    /// OS suspend on macOS/Linux (not Windows), which here can only ever delay uninstall.
    process_started: Instant,
}

/// Detects the gateway's `410 Gone` (tenant deleted), backs off, stops tools, and — after
/// the tenant has stayed gone for [`UNINSTALL_AFTER`] — triggers client self-uninstall.
pub struct DeactivationService {
    suspended: AtomicBool,
    state: AsyncMutex<State>,
    commands_tx: mpsc::UnboundedSender<DeactivationCommand>,
    commands_rx: std::sync::Mutex<Option<mpsc::UnboundedReceiver<DeactivationCommand>>>,
    secured_dir: PathBuf,
}

impl DeactivationService {
    pub fn new(directory_manager: &DirectoryManager) -> Arc<Self> {
        let (commands_tx, commands_rx) = mpsc::unbounded_channel();
        let secured_dir = directory_manager.secured_dir().to_path_buf();
        let gone_since = if ENABLED { load_marker(&secured_dir) } else { None };

        if let Some(ts) = gone_since {
            warn!(
                target: "deactivation",
                reason = "marker_loaded",
                gone_since = %ts,
                "Loaded persisted tenant-gone marker; a live 410 must re-confirm before any uninstall"
            );
        }

        Arc::new(Self {
            suspended: AtomicBool::new(false),
            state: AsyncMutex::new(State {
                phase: Phase::Healthy,
                consecutive_gone: 0,
                gone_since,
                probe_backoff: PROBE_BACKOFF_INITIAL,
                uninstall_triggered: false,
                process_started: Instant::now(),
            }),
            commands_tx,
            commands_rx: std::sync::Mutex::new(Some(commands_rx)),
            secured_dir,
        })
    }

    /// True while outbound calls are gated (tenant presumed gone). Always false when disabled.
    pub fn is_suspended(&self) -> bool {
        self.suspended.load(Ordering::Acquire)
    }

    /// Feed a gateway HTTP status: `410` confirms gone, `2xx` confirms healthy, everything
    /// else (5xx / timeouts / auth errors) is transient and leaves the state unchanged.
    pub async fn on_gateway_status(&self, status: StatusCode) {
        if !ENABLED {
            return;
        }
        if status == StatusCode::GONE {
            self.record_gone().await;
        } else if status.is_success() {
            self.record_healthy().await;
        }
    }

    /// Delay before the next suspension probe, doubling up to [`PROBE_BACKOFF_MAX`].
    pub async fn next_probe_delay(&self) -> Duration {
        let mut st = self.state.lock().await;
        let delay = st.probe_backoff;
        st.probe_backoff = (st.probe_backoff * 2).min(PROBE_BACKOFF_MAX);
        delay
    }

    /// Spawn the supervisor that executes deactivation decisions off the detection path: stop /
    /// restart the managed tools and launch the detached self-uninstall. Call once, after the
    /// tool run manager exists. No-op if already started.
    pub fn start(&self, tool_run_manager: ToolRunManager) {
        let Some(mut commands) = self.commands_rx.lock().ok().and_then(|mut g| g.take()) else {
            return;
        };
        tokio::spawn(async move {
            while let Some(cmd) = commands.recv().await {
                match cmd {
                    DeactivationCommand::StopTools => {
                        if let Err(e) = tool_run_manager.stop_all().await {
                            error!(target: "deactivation", "failed to stop tools: {e:#}");
                        }
                    }
                    DeactivationCommand::RestartTools => {
                        if let Err(e) = tool_run_manager.restart_all().await {
                            error!(target: "deactivation", "failed to restart tools: {e:#}");
                        }
                    }
                    DeactivationCommand::Uninstall => Self::launch_self_uninstall().await,
                }
            }
        });
    }

    /// Spawn the detached `openframe-client uninstall`, retrying since this is terminal.
    async fn launch_self_uninstall() {
        let install_path = crate::service::Service::get_install_location();
        info!(target: "deactivation", "launching client self-uninstall");
        for attempt in 1..=UNINSTALL_SPAWN_ATTEMPTS {
            match crate::platform::uninstall::spawn_detached_uninstall(&install_path) {
                Ok(()) => return,
                Err(e) => {
                    error!(target: "deactivation", "self-uninstall launch attempt {attempt}/{UNINSTALL_SPAWN_ATTEMPTS} failed: {e:#}");
                    tokio::time::sleep(UNINSTALL_SPAWN_RETRY_DELAY).await;
                }
            }
        }
        error!(target: "deactivation", "self-uninstall could not be launched after {UNINSTALL_SPAWN_ATTEMPTS} attempts");
    }

    async fn record_gone(&self) {
        let now = Utc::now();
        let due = {
            let mut st = self.state.lock().await;
            if st.uninstall_triggered {
                return;
            }

            if st.gone_since.is_none() {
                st.gone_since = Some(now);
                save_marker(&self.secured_dir, now);
                warn!(
                    target: "deactivation",
                    reason = "backoff_started",
                    "First 410 Gone from gateway (tenant may be deleted); will stop tools after {} consecutive",
                    STOP_TOOLS_AFTER_CONSECUTIVE_GONE
                );
            }
            st.consecutive_gone = st.consecutive_gone.saturating_add(1);

            if st.phase == Phase::Healthy && st.consecutive_gone >= STOP_TOOLS_AFTER_CONSECUTIVE_GONE {
                st.phase = Phase::Suspended;
                st.probe_backoff = PROBE_BACKOFF_INITIAL;
                self.suspended.store(true, Ordering::Release);
                warn!(
                    target: "deactivation",
                    reason = "calls_stopped",
                    consecutive = st.consecutive_gone,
                    "Tenant gone confirmed; stopping all tools and gating outbound calls to a single backoff probe"
                );
                let _ = self.commands_tx.send(DeactivationCommand::StopTools);
            }

            Self::uninstall_due(&st, now)
        };

        // Deadline reached — funnel through the shared entry point (after dropping the lock).
        if due {
            self.request_uninstall().await;
        }
    }

    async fn record_healthy(&self) {
        let mut st = self.state.lock().await;
        if st.uninstall_triggered {
            return;
        }

        let was_suspended = st.phase == Phase::Suspended;
        let had_marker = st.gone_since.is_some();

        st.consecutive_gone = 0;
        st.gone_since = None;
        st.probe_backoff = PROBE_BACKOFF_INITIAL;
        if had_marker {
            remove_marker(&self.secured_dir);
        }

        if was_suspended {
            st.phase = Phase::Healthy;
            self.suspended.store(false, Ordering::Release);
            warn!(
                target: "deactivation",
                reason = "recovered",
                "Gateway healthy again (tenant restored); resuming outbound calls and restarting tools"
            );
            let _ = self.commands_tx.send(DeactivationCommand::RestartTools);
        } else if had_marker {
            info!(
                target: "deactivation",
                reason = "recovered",
                "Gateway healthy; cleared tenant-gone marker before tools were stopped"
            );
        }
    }

    /// Whether the tenant has been gone past [`UNINSTALL_AFTER`] and the post-restart grace.
    /// Only ever evaluated on a fresh 410 (a network outage produces none), so a stale marker
    /// alone can't trigger uninstall.
    fn uninstall_due(st: &State, now: DateTime<Utc>) -> bool {
        if st.phase != Phase::Suspended {
            return false;
        }
        let Some(gone_since) = st.gone_since else {
            return false;
        };
        if now.signed_duration_since(gone_since)
            < chrono::Duration::seconds(UNINSTALL_AFTER.as_secs() as i64)
        {
            return false;
        }
        if st.process_started.elapsed() < POST_RESTART_GRACE {
            info!(
                target: "deactivation",
                reason = "grace_deferred",
                "Uninstall deadline reached but within post-restart grace; deferring self-uninstall"
            );
            return false;
        }
        true
    }

    /// Trigger the detached self-uninstall (idempotent). Public so every path funnels through the
    /// same supervisor: the 410 deadline above, or a future backend "decommission" message.
    pub async fn request_uninstall(&self) {
        {
            let mut st = self.state.lock().await;
            if st.uninstall_triggered {
                return;
            }
            st.uninstall_triggered = true;
        }
        error!(
            target: "deactivation",
            reason = "self_destroy_triggered",
            "Triggering client self-uninstall"
        );
        let _ = self.commands_tx.send(DeactivationCommand::Uninstall);
    }
}

fn marker_path(secured_dir: &Path) -> PathBuf {
    secured_dir.join(GONE_MARKER_FILE)
}

fn load_marker(secured_dir: &Path) -> Option<DateTime<Utc>> {
    let raw = std::fs::read_to_string(marker_path(secured_dir)).ok()?;
    match DateTime::parse_from_rfc3339(raw.trim()) {
        Ok(dt) => Some(dt.with_timezone(&Utc)),
        Err(e) => {
            // A corrupt marker silently resets the 24h clock — leave a trail.
            warn!(target: "deactivation", "Failed to parse tenant-gone marker '{}': {e:#}", raw.trim());
            None
        }
    }
}

fn save_marker(secured_dir: &Path, ts: DateTime<Utc>) {
    if let Err(e) = std::fs::write(marker_path(secured_dir), ts.to_rfc3339()) {
        warn!(target: "deactivation", "Failed to persist tenant-gone marker: {e:#}");
    }
}

fn remove_marker(secured_dir: &Path) {
    let path = marker_path(secured_dir);
    if path.exists() {
        if let Err(e) = std::fs::remove_file(&path) {
            warn!(target: "deactivation", "Failed to remove tenant-gone marker: {e:#}");
        }
    }
}
