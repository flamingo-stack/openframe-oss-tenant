//! Mesh self-heal: when the agent is held/orphaned on a stale MeshID, re-fetch the current .msh and bounce the agent so it re-enrolls.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use anyhow::{anyhow, Result};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use crate::models::Installation;
use crate::platform::{system_service, DirectoryManager};
use crate::services::tool_kill_service::ToolKillService;
use crate::services::{AgentConfigurationService, InitialConfigurationService, InstalledToolsService};

const MESH_TOOL_ID: &str = "meshcentral-agent";

/// Agent log line for a control channel that can't connect (orphaned/dead-upstream); its authState= field is ignored (unreliable, ill machines show 0).
const FAILURE_MARKER: &str = "Connection FAILED: No HTTP response";
/// Sent only after the mesh check passes, so an orphaned/dead-upstream agent never prints it (unlike "Server fully authenticated", printed before the hold).
const HEALTHY_MARKER: &str = "Received CoreOk from server";

/// How often we scan the agent log.
const POLL_INTERVAL: Duration = Duration::from_secs(30);
/// How long continuously stuck before we act; also the sole rate-limiter (streak resets after each attempt). Cooldown may return after dev testing.
const STUCK_DURATION: Duration = Duration::from_secs(10 * 60);
/// Timeout for the /generate-msh fetch so an unresponsive server can't block the heal loop.
const HTTP_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Clone)]
pub struct MeshSelfHealService {
    directory_manager: DirectoryManager,
    installed_tools: InstalledToolsService,
    tool_kill: ToolKillService,
    initial_config: InitialConfigurationService,
    agent_config: AgentConfigurationService,
    http: reqwest::Client,
}

impl MeshSelfHealService {
    pub fn new(
        directory_manager: DirectoryManager,
        installed_tools: InstalledToolsService,
        tool_kill: ToolKillService,
        initial_config: InitialConfigurationService,
        agent_config: AgentConfigurationService,
    ) -> Self {
        Self {
            directory_manager,
            installed_tools,
            tool_kill,
            initial_config,
            agent_config,
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

        loop {
            sleep(POLL_INTERVAL).await;

            match read_new_lines(&log_path, &mut offset).await {
                Ok(lines) => {
                    for line in &lines {
                        if line.contains(HEALTHY_MARKER) {
                            stuck_since = None;
                        } else if line.contains(FAILURE_MARKER) {
                            stuck_since.get_or_insert_with(Instant::now);
                        }
                    }
                }
                Err(e) => {
                    // Log not present yet (agent not installed/started) — just wait.
                    debug!("mesh self-heal: cannot read {}: {e}", log_path.display());
                    continue;
                }
            }

            let stuck_for = match stuck_since {
                Some(t) => t.elapsed(),
                None => continue,
            };
            if stuck_for < STUCK_DURATION {
                continue;
            }

            warn!(
                "meshcentral-agent stuck for {}s with no successful connect — attempting MeshID self-heal",
                stuck_for.as_secs()
            );
            match self.try_heal().await {
                Ok(true) => info!("mesh self-heal: adopted a new MeshID and restarted the agent"),
                Ok(false) => {
                    debug!("mesh self-heal: MeshID unchanged or server unreachable — no action taken")
                }
                Err(e) => error!("mesh self-heal failed: {e:#}"),
            }

            // Sole rate-limiter: reset after every attempt; a real heal is cleared by the CoreOk marker.
            stuck_since = None;
        }
    }

    /// Fetch the current .msh; if its MeshID differs from the agent's, rewrite it and bounce. Ok(true) only when applied.
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
        let new_id =
            parse_mesh_id(&body).ok_or_else(|| anyhow!("no MeshID in /generate-msh response"))?;

        let msh_path = self.mesh_msh_path().await?;
        let current_id = tokio::fs::read_to_string(&msh_path)
            .await
            .ok()
            .and_then(|s| parse_mesh_id(&s));

        if current_id.as_deref() == Some(new_id.as_str()) {
            return Ok(false);
        }

        info!(
            "mesh self-heal: MeshID change {} -> {} (writing {})",
            current_id.as_deref().unwrap_or("<none>"),
            new_id,
            msh_path.display()
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

/// Extract the value of the `MeshID=` line from an `.msh` body.
fn parse_mesh_id(msh: &str) -> Option<String> {
    msh.lines()
        .find_map(|l| l.trim().strip_prefix("MeshID="))
        .map(|v| v.trim().to_string())
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
