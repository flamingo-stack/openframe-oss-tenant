use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use crate::platform::DirectoryManager;
use crate::services::tool_kill_service::ToolKillService;
use crate::services::tool_restart_service::{RestartOutcome, ToolRestartService};
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::{AgentConfigurationService, InitialConfigurationService, InstalledToolsService};

const MESH_TOOL_ID: &str = "meshcentral-agent";

/// Stable prefix shared by every control-channel failure line the agent emits ("Connection FAILED: ..." and "Connection FAILED (latest attempt): ...").
const FAILURE_MARKER: &str = "Connection FAILED";
/// Printed only after a successful server connect, identically across agent versions.
const HEALTHY_MARKER: &str = "Received CoreOk from server";

/// How often we scan the agent log.
const POLL_INTERVAL: Duration = Duration::from_secs(30);
/// How long an unresolved failure (no healthy connect logged since) may stand before we act.
const STUCK_DURATION: Duration = Duration::from_secs(10 * 60);
/// A healthy agent logs roughly hourly, so this much total silence means it is wedged or dead.
const SILENCE_DURATION: Duration = Duration::from_secs(90 * 60);
/// Minimum wait between heal attempts (restart, no-op, or failure), so a server-side outage can't spin.
const ACTION_COOLDOWN: Duration = Duration::from_secs(60 * 60);
/// Timeout for the /generate-msh fetch so an unresponsive server can't block the heal loop.
const HTTP_TIMEOUT: Duration = Duration::from_secs(30);
/// How far back to look for markers when seeding health state at startup.
const TAIL_BYTES: u64 = 64 * 1024;

#[derive(Clone)]
pub struct MeshSelfHealService {
    directory_manager: DirectoryManager,
    installed_tools: InstalledToolsService,
    tool_kill: ToolKillService,
    tool_restart: ToolRestartService,
    initial_config: InitialConfigurationService,
    agent_config: AgentConfigurationService,
    tool_run_manager: ToolRunManager,
    http: reqwest::Client,
}

impl MeshSelfHealService {
    pub fn new(
        directory_manager: DirectoryManager,
        installed_tools: InstalledToolsService,
        tool_kill: ToolKillService,
        tool_restart: ToolRestartService,
        initial_config: InitialConfigurationService,
        agent_config: AgentConfigurationService,
        tool_run_manager: ToolRunManager,
    ) -> Self {
        Self {
            directory_manager,
            installed_tools,
            tool_kill,
            tool_restart,
            initial_config,
            agent_config,
            tool_run_manager,
            http: reqwest::Client::builder()
                .timeout(HTTP_TIMEOUT)
                .build()
                .expect("failed to build mesh self-heal HTTP client"),
        }
    }

    pub async fn run(&self) -> Result<()> {
        let this = self.clone();
        tokio::spawn(async move {
            this.watch().await;
            error!("mesh self-heal watcher exited unexpectedly");
        });
        Ok(())
    }

    async fn watch(self) {
        let log_path = self
            .directory_manager
            .app_support_dir()
            .join(MESH_TOOL_ID)
            .join(format!("{MESH_TOOL_ID}.log"));

        info!(
            "mesh self-heal watcher started (log: {})",
            log_path.display()
        );

        // Start at EOF so stale history can't arm detection, but seed health from the tail to catch an already-wedged agent.
        let mut offset: u64 = tokio::fs::metadata(&log_path).await.map(|m| m.len()).unwrap_or(0);
        let mut last_marker_healthy = last_marker_in_tail(&log_path).await.unwrap_or(true);
        let mut stuck_since: Option<Instant> = if last_marker_healthy { None } else { Some(Instant::now()) };
        let mut last_action: Option<Instant> = None;
        let mut last_activity = seed_last_activity(&log_path).await;

        loop {
            let sleep_started = Instant::now();
            sleep(POLL_INTERVAL).await;

            // The sleep alone overran by far ⇒ the host was suspended (Instant counts suspend on Windows) — discard timers measured across it.
            if sleep_started.elapsed() > POLL_INTERVAL * 5 {
                stuck_since = None;
                last_activity = Instant::now();
            }

            match read_new_lines(&log_path, &mut offset).await {
                Ok(lines) => {
                    if !lines.is_empty() {
                        last_activity = Instant::now();
                    }
                    for line in &lines {
                        if line.contains(HEALTHY_MARKER) {
                            stuck_since = None;
                            last_action = None;
                            last_marker_healthy = true;
                        } else if line.contains(FAILURE_MARKER) {
                            stuck_since.get_or_insert_with(Instant::now);
                            last_marker_healthy = false;
                        }
                    }
                }
                Err(e) => {
                    debug!("mesh self-heal: cannot read {}: {e}", log_path.display());
                }
            }

            // Agent is being replaced by an update — drop stale history so we don't restart it post-update.
            if self.tool_run_manager.is_updating(MESH_TOOL_ID).await {
                stuck_since = None;
                last_activity = Instant::now();
                continue;
            }

            if let Some(t) = last_action {
                if t.elapsed() < ACTION_COOLDOWN {
                    continue;
                }
            }

            let stuck = stuck_since.is_some_and(|t| t.elapsed() >= STUCK_DURATION);
            let silent = last_activity.elapsed() >= SILENCE_DURATION;
            let msh_missing_serverid = self.current_msh_missing_serverid().await;

            if msh_missing_serverid || stuck {
                let reason = if msh_missing_serverid {
                    "current .msh has no ServerID (agent cannot authenticate the server)".to_string()
                } else {
                    format!("no successful connect within {}s", STUCK_DURATION.as_secs())
                };
                warn!("meshcentral-agent unhealthy: {reason} — refreshing .msh and restarting the agent");

                // Arm the cooldown before acting so no outcome (busy, error, no-op) can spin the loop.
                last_action = Some(Instant::now());
                match self.try_refresh_msh().await {
                    Ok(true) => info!("mesh self-heal: refreshed .msh (NodeID preserved)"),
                    Ok(false) => debug!("mesh self-heal: .msh already current"),
                    Err(e) => error!("mesh self-heal: .msh refresh failed (restarting anyway): {e:#}"),
                }
                self.restart_agent().await;

                stuck_since = None;
                last_activity = Instant::now();
            } else if silent {
                warn!(
                    "meshcentral-agent silent for {}s (last_marker_healthy={last_marker_healthy}) — restarting the agent",
                    last_activity.elapsed().as_secs()
                );

                last_action = Some(Instant::now());
                self.restart_agent().await;

                stuck_since = None;
                last_activity = Instant::now();
            }
        }
    }

    /// Restart through the shared guarded flow; a missing registry entry degrades to a process kill so the OS supervisor can relaunch.
    async fn restart_agent(&self) {
        match self.tool_restart.restart_guarded(MESH_TOOL_ID).await {
            Ok(RestartOutcome::Restarted) => info!("mesh self-heal: agent restarted"),
            Ok(RestartOutcome::Busy) => info!("mesh self-heal: meshcentral-agent busy with another operation — skipping restart"),
            Ok(RestartOutcome::NotInstalled) => {
                warn!("mesh self-heal: meshcentral-agent not in registry — falling back to a process kill");
                if let Err(e) = self.tool_kill.stop_tool(MESH_TOOL_ID).await {
                    error!("mesh self-heal: fallback kill failed: {e:#}");
                }
            }
            Err(e) => error!("mesh self-heal: agent restart failed: {e:#}"),
        }
    }

    /// Refresh the .msh from /generate-msh; returns true when it was rewritten.
    async fn try_refresh_msh(&self) -> Result<bool> {
        let host = self.initial_config.get_server_url()?;
        let url = format!("https://{host}/tools/agent/meshcentral-server/generate-msh?host={host}");

        let token = self.agent_config.get_access_token().await?;
        let resp = self
            .http
            .get(&url)
            .header("Authorization", format!("Bearer {token}"))
            .send()
            .await?;
        if !resp.status().is_success() {
            return Err(anyhow!("/generate-msh returned HTTP {}", resp.status()));
        }
        let body = resp.text().await?;
        let new_mesh = parse_msh_field(&body, "MeshID");
        let new_server = parse_msh_field(&body, "ServerID");
        if new_mesh.is_none() && new_server.is_none() {
            return Err(anyhow!("/generate-msh response has neither MeshID nor ServerID"));
        }

        let msh_path = self.mesh_msh_path().await?;
        let current = tokio::fs::read_to_string(&msh_path).await.ok();
        let cur_mesh = current.as_deref().and_then(|s| parse_msh_field(s, "MeshID"));
        let cur_server = current.as_deref().and_then(|s| parse_msh_field(s, "ServerID"));

        let mesh_changed = new_mesh.is_some() && cur_mesh != new_mesh;
        let server_changed = new_server.is_some() && cur_server != new_server;
        if !mesh_changed && !server_changed {
            let server = current
                .as_deref()
                .and_then(|s| parse_msh_field(s, "MeshServer"))
                .unwrap_or_else(|| "<none>".to_string());
            info!("mesh self-heal: .msh already current (MeshServer={server})");
            return Ok(false);
        }

        info!(
            "mesh self-heal: rewriting {} (mesh_changed={}, serverid {} -> {})",
            msh_path.display(),
            mesh_changed,
            if cur_server.is_some() { "present" } else { "missing" },
            if new_server.is_some() { "present" } else { "missing" }
        );

        let tmp_path = msh_path.with_extension("msh.tmp");
        tokio::fs::write(&tmp_path, body.as_bytes()).await?;
        tokio::fs::rename(&tmp_path, &msh_path).await?;
        Ok(true)
    }

    async fn current_msh_missing_serverid(&self) -> bool {
        let msh_path = match self.mesh_msh_path().await {
            Ok(p) => p,
            Err(_) => return false,
        };
        match tokio::fs::read_to_string(&msh_path).await {
            Ok(s) => parse_msh_field(&s, "ServerID").is_none(),
            Err(_) => false,
        }
    }

    async fn mesh_msh_path(&self) -> Result<PathBuf> {
        self.installed_tools
            .get_by_tool_agent_id(MESH_TOOL_ID)
            .await?
            .ok_or_else(|| anyhow!("{MESH_TOOL_ID} is not installed"))?;
        let dir = self.directory_manager.app_support_dir().join(MESH_TOOL_ID);
        let mut rd = tokio::fs::read_dir(&dir).await?;
        while let Some(entry) = rd.next_entry().await? {
            let p = entry.path();
            if p.extension().and_then(|e| e.to_str()) == Some("msh") {
                return Ok(p);
            }
        }
        Err(anyhow!("no .msh found in {}", dir.display()))
    }
}

fn parse_msh_field(msh: &str, key: &str) -> Option<String> {
    let prefix = format!("{key}=");
    msh.lines()
        .find_map(|l| l.trim().strip_prefix(prefix.as_str()).map(|v| v.trim().to_string()))
        .filter(|v| !v.is_empty())
}

/// Seed the silence timer from the log's mtime so an already-silent agent isn't granted a fresh window on client restart; a recent boot (Instant underflow) falls back to now.
/// Staleness credit is capped below SILENCE_DURATION so at least STUCK_DURATION of live, monotonically-measured silence is observed before the branch can fire (also bounds wall-clock/NTP skew in mtime).
async fn seed_last_activity(path: &Path) -> Instant {
    let now = Instant::now();
    let max_credit = SILENCE_DURATION.saturating_sub(STUCK_DURATION);
    tokio::fs::metadata(path)
        .await
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|mtime| mtime.elapsed().ok())
        .and_then(|stale_for| now.checked_sub(stale_for.min(max_credit)))
        .unwrap_or(now)
}

/// Health of the last marker within the log tail: Some(true)=healthy, Some(false)=failing, None=no marker found.
async fn last_marker_in_tail(path: &Path) -> Option<bool> {
    use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};

    let mut file = tokio::fs::File::open(path).await.ok()?;
    let len = file.metadata().await.ok()?.len();
    file.seek(SeekFrom::Start(len.saturating_sub(TAIL_BYTES))).await.ok()?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).await.ok()?;

    let mut last = None;
    for line in String::from_utf8_lossy(&buf).lines() {
        if line.contains(HEALTHY_MARKER) {
            last = Some(true);
        } else if line.contains(FAILURE_MARKER) {
            last = Some(false);
        }
    }
    last
}

async fn read_new_lines(path: &Path, offset: &mut u64) -> Result<Vec<String>> {
    use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};

    let mut file = tokio::fs::File::open(path).await?;
    let len = file.metadata().await?.len();
    if len < *offset {
        *offset = 0;
    }
    if len == *offset {
        return Ok(Vec::new());
    }

    file.seek(SeekFrom::Start(*offset)).await?;
    let mut buf = Vec::new();
    file.read_to_end(&mut buf).await?;

    let consume = match buf.iter().rposition(|&b| b == b'\n') {
        Some(i) => i + 1,
        None => return Ok(Vec::new()),
    };
    *offset += consume as u64;

    Ok(String::from_utf8_lossy(&buf[..consume])
        .lines()
        .map(|s| s.to_string())
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FAILED_0_0_22_NO_HTTP: &str = "Connection FAILED: No HTTP response (fd=0, status=Complete/Disconnected, authState=0, connState=0, tls=down, elapsedMs=20016, attempt=ABCD1234-2100)";
    const FAILED_0_0_22_TIMEOUT: &str = "Connection FAILED: Network timeout - server unreachable or gateway blocking (tls=down, elapsedMs=21016, attempt=ABCD1234-2101)";
    const FAILED_0_0_23_PLUS: &str = "Connection FAILED (latest attempt): No HTTP response (fd=0, status=Complete/Disconnected, authState=0, connState=0, tls=down, elapsedMs=20016, attempt=ABCD1234-2102)";
    const CORE_OK: &str = "Received CoreOk from server (coreTimeout=0x0)";

    #[test]
    fn failure_marker_matches_0_0_22_formats() {
        assert!(FAILED_0_0_22_NO_HTTP.contains(FAILURE_MARKER));
        assert!(FAILED_0_0_22_TIMEOUT.contains(FAILURE_MARKER));
    }

    #[test]
    fn failure_marker_matches_0_0_23_plus_format() {
        assert!(FAILED_0_0_23_PLUS.contains(FAILURE_MARKER));
    }

    #[test]
    fn markers_ignore_unrelated_lines() {
        for line in [
            "Connection: dialing uri=wss://x.openframe.ai/ws/tools/agent/meshcentral-server/agent.ashx host=x.openframe.ai port=443 family=IPv4 ip=1.2.3.4 useproxy=0 proxy=DIRECT attempt=ABCD1234-2103 suppressed=2",
            "AutoRetry Connect in 299066 milliseconds",
        ] {
            assert!(!line.contains(FAILURE_MARKER));
            assert!(!line.contains(HEALTHY_MARKER));
        }
    }

    #[test]
    fn healthy_marker_matches_core_ok() {
        assert!(CORE_OK.contains(HEALTHY_MARKER));
    }

    #[tokio::test]
    async fn tail_seed_reports_last_marker() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("meshcentral-agent.log");

        assert_eq!(last_marker_in_tail(&path).await, None);

        tokio::fs::write(&path, "startup\nno markers here\n").await.unwrap();
        assert_eq!(last_marker_in_tail(&path).await, None);

        tokio::fs::write(&path, format!("{FAILED_0_0_22_NO_HTTP}\n{CORE_OK}\n")).await.unwrap();
        assert_eq!(last_marker_in_tail(&path).await, Some(true));

        tokio::fs::write(&path, format!("{CORE_OK}\n{FAILED_0_0_23_PLUS}\n{FAILED_0_0_22_TIMEOUT}\n")).await.unwrap();
        assert_eq!(last_marker_in_tail(&path).await, Some(false));
    }
}
