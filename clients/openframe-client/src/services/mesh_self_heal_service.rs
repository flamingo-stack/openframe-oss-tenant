//! Mesh self-heal: re-fetch the .msh and restart the service when the agent can't enroll (stale
//! MeshID or missing ServerID). Restart-only (no `-install`) so agent.db / the NodeID is preserved.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use crate::models::Installation;
use crate::platform::{system_service, DirectoryManager};
use crate::services::tool_kill_service::ToolKillService;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::{AgentConfigurationService, InitialConfigurationService, InstalledToolsService};

const MESH_TOOL_ID: &str = "meshcentral-agent";

/// Agent log line for a control channel that can't connect (orphaned/dead-upstream); its authState= field is ignored (unreliable, ill machines show 0).
const FAILURE_MARKER: &str = "Connection FAILED: No HTTP response";
/// Sent only after the mesh check passes, so an orphaned/dead-upstream agent never prints it (unlike "Server fully authenticated", printed before the hold).
const HEALTHY_MARKER: &str = "Received CoreOk from server";

/// How often we scan the agent log.
const POLL_INTERVAL: Duration = Duration::from_secs(30);
/// How long continuously stuck before we act.
const STUCK_DURATION: Duration = Duration::from_secs(10 * 60);
/// Minimum wait between heal attempts (success or no-op), so a server-side outage can't spin.
const NOOP_HEAL_COOLDOWN: Duration = Duration::from_secs(60 * 60);
/// Timeout for the /generate-msh fetch so an unresponsive server can't block the heal loop.
const HTTP_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct MeshSelfHealService {
    directory_manager: DirectoryManager,
    installed_tools: InstalledToolsService,
    tool_kill: ToolKillService,
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
        initial_config: InitialConfigurationService,
        agent_config: AgentConfigurationService,
        tool_run_manager: ToolRunManager,
    ) -> Self {
        Self {
            directory_manager,
            installed_tools,
            tool_kill,
            initial_config,
            agent_config,
            tool_run_manager,
            http: reqwest::Client::builder()
                .timeout(HTTP_TIMEOUT)
                .build()
                .expect("failed to build mesh self-heal HTTP client"),
        }
    }

    /// Spawn the self-heal watcher in the background (matches tool_run_manager).
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

        let mut offset: u64 = 0;
        let mut stuck_since: Option<Instant> = None;
        let mut last_heal_attempt: Option<Instant> = None;

        loop {
            sleep(POLL_INTERVAL).await;

            let msh_missing_serverid = self.current_msh_missing_serverid().await;

            match read_new_lines(&log_path, &mut offset).await {
                Ok(lines) => {
                    for line in &lines {
                        if line.contains(HEALTHY_MARKER) {
                            stuck_since = None;
                            last_heal_attempt = None;
                        } else if line.contains(FAILURE_MARKER) {
                            stuck_since.get_or_insert_with(Instant::now);
                        }
                    }
                }
                Err(e) => {
                    // Log not present yet (agent not installed/started) — just wait.
                    debug!("mesh self-heal: cannot read {}: {e}", log_path.display());
                }
            }

            let stuck = stuck_since.map_or(false, |t| t.elapsed() >= STUCK_DURATION);
            if !msh_missing_serverid && !stuck {
                continue;
            }

            // Rate-limit attempts.
            if let Some(t) = last_heal_attempt {
                if t.elapsed() < NOOP_HEAL_COOLDOWN {
                    continue;
                }
            }

            if self.tool_run_manager.is_updating(MESH_TOOL_ID).await {
                info!("meshcentral-agent is updating — skipping .msh self-heal this cycle");
                stuck_since = None;
                continue;
            }

            let reason = if msh_missing_serverid {
                "current .msh has no ServerID (agent cannot authenticate the server)".to_string()
            } else {
                format!("no successful connect within {}s", STUCK_DURATION.as_secs())
            };
            warn!("meshcentral-agent unhealthy: {reason} — attempting .msh self-heal");

            match self.try_heal().await {
                Ok(true) => info!("mesh self-heal: refreshed .msh and restarted the agent (NodeID preserved)"),
                Ok(false) => debug!("mesh self-heal: .msh already current — likely a server-side issue, no action taken"),
                Err(e) => error!("mesh self-heal failed: {e:#}"),
            }

            stuck_since = None;
            last_heal_attempt = Some(Instant::now());
        }
    }

    /// Re-fetch the .msh; if MeshID/ServerID changed (or it's missing), rewrite and bounce. Ok(true) when applied.
    async fn try_heal(&self) -> Result<bool> {
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
            // Nothing to fix; log the server the agent is dialing so a server-side outage is
            // distinguishable from a stale .msh target.
            let server = current
                .as_deref()
                .and_then(|s| parse_msh_field(s, "MeshServer"))
                .unwrap_or_else(|| "<none>".to_string());
            info!("mesh self-heal: .msh already current (MeshServer={server}) — no action");
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

        // Restart the service to re-import the .msh: kill, then start (redundant start is a no-op under mac KeepAlive).
        self.tool_kill.stop_tool(MESH_TOOL_ID).await?;
        if let Some(service_name) = self.mesh_service_name().await? {
            if let Err(e) = system_service::start_service(&service_name).await {
                debug!("mesh self-heal: start_service({service_name}) — likely already running: {e}");
            }
        }
        Ok(true)
    }

    /// True only when the agent is installed, its .msh exists, and that .msh has no ServerID line.
    async fn current_msh_missing_serverid(&self) -> bool {
        let msh_path = match self.mesh_msh_path().await {
            Ok(p) => p,
            Err(_) => return false, // not installed / no .msh yet — nothing to heal
        };
        match tokio::fs::read_to_string(&msh_path).await {
            Ok(s) => parse_msh_field(&s, "ServerID").is_none(),
            Err(_) => false,
        }
    }

    /// Find the .msh the client saved in the tool dir (agent.msh on Windows, meshagent.msh on macOS).
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

    /// The service name (launchd/SCM/systemd) if the agent installs as a service.
    async fn mesh_service_name(&self) -> Result<Option<String>> {
        let tool = self
            .installed_tools
            .get_by_tool_agent_id(MESH_TOOL_ID)
            .await?
            .ok_or_else(|| anyhow!("{MESH_TOOL_ID} is not installed"))?;
        Ok(match tool.installation {
            Installation::Service { service_name, .. } => Some(service_name),
            _ => None,
        })
    }
}

/// Extract the value of a `Key=` line (e.g. `MeshID=`, `ServerID=`) from an `.msh` body.
fn parse_msh_field(msh: &str, key: &str) -> Option<String> {
    let prefix = format!("{key}=");
    msh.lines()
        .find_map(|l| l.trim().strip_prefix(prefix.as_str()).map(|v| v.trim().to_string()))
        .filter(|v| !v.is_empty())
}

/// Read whole new lines since *offset, advancing only to the last newline; resets offset if the file shrank.
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
        None => return Ok(Vec::new()), // no complete line yet
    };
    *offset += consume as u64;

    Ok(String::from_utf8_lossy(&buf[..consume])
        .lines()
        .map(|s| s.to_string())
        .collect())
}
