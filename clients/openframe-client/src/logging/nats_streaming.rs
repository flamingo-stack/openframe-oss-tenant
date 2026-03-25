use anyhow::{Context, Result};
use indexmap::IndexMap;
use serde::Serialize;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom, Write};
use std::path::PathBuf;
use tokio::time::{interval, Duration};
use tracing::{debug, error, info};

use crate::platform::DirectoryManager;
use crate::services::{AgentConfigurationService, InitialConfigurationService};

// TODO: Set to false when backend is ready
const TEST_MODE: bool = true;

const BATCH_INTERVAL_SECS: u64 = 60;
const MAX_LOGS_PER_BATCH: usize = 50;
const RECONNECT_DELAY_SECS: u64 = 5;
const NATS_SUBJECT: &str = "agents.logs";
// Hardcoded machine ID for NATS header (used before registration)
const NATS_HEADER_MACHINE_ID: &str = "openframe-client";

#[derive(Debug, Clone, Serialize)]
pub struct LogEntry {
    pub level: String,
    pub ts: String,
    pub msg: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogBatchMessage {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub machine_id: Option<String>,
    pub hostname: String,
    pub tenant_domain: String,
    pub logs: Vec<LogEntry>,
}

pub struct NatsLogConnection {
    client: Option<async_nats::Client>,
    server_host: String,
    tenant_domain: String,
    initial_key: String,
}

impl NatsLogConnection {
    pub fn new(
        server_host: String,
        tenant_domain: String,
        initial_key: String,
    ) -> Self {
        Self {
            client: None,
            server_host,
            tenant_domain,
            initial_key,
        }
    }

    pub async fn connect(&mut self) -> Result<()> {
        let url = format!("wss://{}/ws/nats-logs", self.server_host);
        info!(
            "NATS logs: connecting to {} (tenant={})",
            url, self.tenant_domain
        );

        let tenant_domain = self.tenant_domain.clone();
        let client = async_nats::ConnectOptions::new()
            .custom_header("x-tenant-domain", &self.tenant_domain)
            .custom_header("x-initial-key", &self.initial_key)
            .custom_header("x-machine-id", NATS_HEADER_MACHINE_ID)
            .retry_on_initial_connect()
            .reconnect_delay_callback(|attempt| {
                let delay = Duration::from_secs(RECONNECT_DELAY_SECS);
                error!("NATS logs: reconnecting, attempt {}", attempt);
                delay
            })
            .event_callback(move |event| {
                let tenant = tenant_domain.clone();
                async move {
                    match event {
                        async_nats::Event::Connected => {
                            info!("NATS logs: connected (tenant={})", tenant);
                        }
                        async_nats::Event::Disconnected => {
                            error!("NATS logs: disconnected (tenant={})", tenant);
                        }
                        async_nats::Event::ServerError(err) => {
                            error!("NATS logs: server error: {} (tenant={})", err, tenant);
                        }
                        async_nats::Event::ClientError(err) => {
                            error!("NATS logs: client error: {} (tenant={})", err, tenant);
                        }
                        _ => {}
                    }
                }
            })
            .connect(&url)
            .await
            .context("Failed to connect to NATS logs endpoint")?;

        self.client = Some(client);
        info!("NATS logs: initial connection established");
        Ok(())
    }

    pub async fn publish(&self, payload: &LogBatchMessage) -> Result<()> {
        let client = self
            .client
            .as_ref()
            .context("NATS log connection not initialized")?;

        let json = serde_json::to_vec(payload).context("Failed to serialize log batch")?;

        client
            .publish(NATS_SUBJECT.to_string(), json.into())
            .await
            .context("Failed to publish log batch")?;

        debug!("Published {} logs to NATS", payload.logs.len());
        Ok(())
    }
}

pub struct NatsLogStreaming {
    server_host: String,
    tenant_domain: String,
    initial_key: String,
    hostname: String,
    log_file_path: PathBuf,
    agent_config_service: AgentConfigurationService,
}

impl NatsLogStreaming {
    pub fn new(
        initial_config_service: &InitialConfigurationService,
        agent_config_service: &AgentConfigurationService,
        directory_manager: &DirectoryManager,
    ) -> Result<Self> {
        let server_host = initial_config_service.get_server_url()?;
        let initial_key = initial_config_service.get_initial_key()?;
        let tenant_domain = extract_tenant_domain(&server_host);

        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let log_file_path = super::get_log_file_path(directory_manager);

        Ok(Self {
            server_host,
            tenant_domain,
            initial_key,
            hostname,
            log_file_path,
            agent_config_service: agent_config_service.clone(),
        })
    }

    /// Start the log streaming background task.
    pub async fn start(self) -> Result<()> {
        let nats_url = format!("wss://{}/ws/nats-logs", self.server_host);

        let test_output = if TEST_MODE {
            let path = self.log_file_path.with_file_name("openframe_stream_test.log");
            info!("LOG STREAMING TEST MODE: also writing to {}", path.display());
            Some(TestOutputContext {
                path,
                batch_number: 0,
                tenant_domain: self.tenant_domain.clone(),
                initial_key: self.initial_key.clone(),
                nats_url: nats_url.clone(),
            })
        } else {
            None
        };

        let mut connection = NatsLogConnection::new(
            self.server_host.clone(),
            self.tenant_domain.clone(),
            self.initial_key.clone(),
        );

        connection.connect().await?;

        tokio::spawn(log_file_reader_task(
            self.log_file_path,
            connection,
            self.hostname,
            self.tenant_domain,
            self.agent_config_service,
            test_output,
        ));

        Ok(())
    }
}

async fn log_file_reader_task(
    log_file_path: PathBuf,
    connection: NatsLogConnection,
    hostname: String,
    tenant_domain: String,
    agent_config_service: AgentConfigurationService,
    test_output: Option<TestOutputContext>,
) {
    let interval_secs = if test_output.is_some() { 5 } else { BATCH_INTERVAL_SECS };
    let mut ticker = interval(Duration::from_secs(interval_secs));
    let mut file_position: u64 = 0;
    let mut test_ctx = test_output;

    loop {
        ticker.tick().await;

        let logs = match read_new_logs(&log_file_path, &mut file_position, MAX_LOGS_PER_BATCH) {
            Ok(logs) => logs,
            Err(e) => {
                error!("Failed to read log file: {:#}", e);
                continue;
            }
        };

        if logs.is_empty() {
            continue;
        }

        // Get machine_id dynamically (None before registration, Some after)
        let machine_id = agent_config_service.get_machine_id().await.ok();

        let raw_count = logs.len();
        let batch = LogBatchMessage {
            machine_id: machine_id.clone(),
            hostname: hostname.clone(),
            tenant_domain: tenant_domain.clone(),
            logs: logs.deduplicate(),
        };

        // Write to test file if enabled
        if let Some(ref mut ctx) = test_ctx {
            if let Err(e) = ctx.write(&batch, &machine_id, raw_count) {
                error!("Failed to write test output: {:#}", e);
            }
        }

        // Publish to NATS
        if let Err(e) = connection.publish(&batch).await {
            error!("Failed to publish log batch: {:#}", e);
        }
    }
}

struct TestOutputContext {
    path: PathBuf,
    batch_number: u32,
    tenant_domain: String,
    initial_key: String,
    nats_url: String,
}

impl TestOutputContext {
    fn write(&mut self, batch: &LogBatchMessage, machine_id: &Option<String>, raw_count: usize) -> Result<()> {
        self.batch_number += 1;

        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
            .context("Failed to open test output file")?;

        let machine_id_display = machine_id.as_deref().unwrap_or("<not registered>");

        writeln!(file, "\n==================== BATCH #{} ====================", self.batch_number)?;
        writeln!(file, "NATS URL: {}", self.nats_url)?;
        writeln!(file, "HEADERS:")?;
        writeln!(file, "  x-tenant-domain: {}", self.tenant_domain)?;
        writeln!(file, "  x-initial-key: {}", self.initial_key)?;
        writeln!(file, "  x-machine-id: {} (hardcoded)", NATS_HEADER_MACHINE_ID)?;
        writeln!(file, "JSON machineId: {}", machine_id_display)?;
        writeln!(file, "SUBJECT: {}", NATS_SUBJECT)?;
        writeln!(file, "STATS: {} logs ({} before dedup)", batch.logs.len(), raw_count)?;
        writeln!(file, "-------------------- LOGS --------------------")?;
        for log in &batch.logs {
            let count = log.count.map(|c| format!(" (x{})", c)).unwrap_or_default();
            writeln!(file, "[{}] {} {}{}", log.ts, log.level, log.msg, count)?;
        }
        writeln!(file, "-------------------- JSON --------------------")?;
        writeln!(file, "{}", serde_json::to_string_pretty(batch)?)?;

        file.flush()?;
        Ok(())
    }
}

fn read_new_logs(
    log_file_path: &PathBuf,
    position: &mut u64,
    max_count: usize,
) -> Result<Vec<LogEntry>> {
    let mut file = File::open(log_file_path).context("Failed to open log file")?;

    // Check if file was truncated (rotated)
    let metadata = file.metadata()?;
    if metadata.len() < *position {
        *position = 0;
    }

    file.seek(SeekFrom::Start(*position))?;

    let reader = BufReader::new(&file);
    let mut logs = Vec::new();

    for line in reader.lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => continue,
        };

        if let Some(entry) = parse_log_line(&line) {
            logs.push(entry);
            if logs.len() >= max_count {
                break;
            }
        }
    }
    *position = file.stream_position()?;

    Ok(logs)
}

fn parse_log_line(line: &str) -> Option<LogEntry> {
    if line.starts_with("20") {
        let ts_end = line.find('Z')?;
        let ts = &line[..=ts_end];
        let rest = line[ts_end + 1..].trim_start();
        let level_end = rest.find(char::is_whitespace)?;
        let level = &rest[..level_end];
        let msg = rest[level_end..].trim_start();

        return Some(LogEntry {
            ts: ts.to_string(),
            level: level.to_uppercase(),
            msg: msg.to_string(),
            count: None,
        });
    }
    let line = line.strip_prefix("stdout:").unwrap_or(line).trim_start();
    if line.starts_with("time=\"") {
        let ts_start = 6; // after 'time="'
        let ts_end = ts_start + line[ts_start..].find('"')?;
        let ts = &line[ts_start..ts_end];

        let level_start = line.find("level=")? + 6;
        let level_end = level_start + line[level_start..].find(char::is_whitespace)?;
        let level = &line[level_start..level_end];

        let msg_start = line.find("msg=\"")? + 5;
        let msg = line[msg_start..].trim_end_matches('"');

        return Some(LogEntry {
            ts: ts.to_string(),
            level: level.to_uppercase(),
            msg: format!("[tool] {}", msg),
            count: None,
        });
    }

    None
}

fn extract_tenant_domain(server_host: &str) -> String {
    server_host
        .strip_prefix("api.")
        .unwrap_or(server_host)
        .to_string()
}

fn is_client_log(entry: &LogEntry) -> bool {
    entry.msg.starts_with("openframe") || entry.msg.starts_with("async_nats")
}

pub trait LogDeduplicator {
    fn deduplicate(self) -> Vec<LogEntry>;
}

impl LogDeduplicator for Vec<LogEntry> {
    /// Deduplicates tool logs while preserving client logs as-is.
    /// Tool logs with identical messages are grouped with a count.
    /// Order is preserved: each log appears at its first occurrence position.
    fn deduplicate(self) -> Vec<LogEntry> {
        let mut result: Vec<LogEntry> = Vec::new();
        let mut tool_seen: IndexMap<String, usize> = IndexMap::new();

        for entry in self {
            if is_client_log(&entry) {
                result.push(entry);
            } else if let Some(&idx) = tool_seen.get(&entry.msg) {
                result[idx].count = Some(result[idx].count.unwrap_or(1) + 1);
            } else {
                tool_seen.insert(entry.msg.clone(), result.len());
                result.push(entry);
            }
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_parse_log_line() {
        let line = "2026-03-18T15:44:15.099267Z  INFO openframe::services::nats_connection_manager: Reauthentication successful";
        let entry = parse_log_line(line).unwrap();

        assert_eq!(entry.ts, "2026-03-18T15:44:15.099267Z");
        assert_eq!(entry.level, "INFO");
        assert_eq!(
            entry.msg,
            "openframe::services::nats_connection_manager: Reauthentication successful"
        );
    }

    #[test]
    fn test_parse_log_line_warn() {
        let line = "2026-03-17T13:20:19.591487Z  WARN openframe::services::github_download_service: Download failed";
        let entry = parse_log_line(line).unwrap();

        assert_eq!(entry.ts, "2026-03-17T13:20:19.591487Z");
        assert_eq!(entry.level, "WARN");
        assert_eq!(
            entry.msg,
            "openframe::services::github_download_service: Download failed"
        );
    }

    #[test]
    fn test_deduplicate_tool_logs_only() {
        let logs = vec![
            // Client log - should NOT be deduplicated
            LogEntry {
                ts: "2026-03-17T13:20:19.000Z".into(),
                level: "INFO".into(),
                msg: "openframe::services::tool_run_manager: Starting".into(),
                count: None,
            },
            // Tool log - should be deduplicated
            LogEntry {
                ts: "2026-03-17T13:20:20.000Z".into(),
                level: "INFO".into(),
                msg: "[tool] Token refresh".into(),
                count: None,
            },
            // Same client log - should NOT be deduplicated (appears twice)
            LogEntry {
                ts: "2026-03-17T13:20:21.000Z".into(),
                level: "INFO".into(),
                msg: "openframe::services::tool_run_manager: Starting".into(),
                count: None,
            },
            // Same tool log - should be deduplicated with previous
            LogEntry {
                ts: "2026-03-17T13:20:22.000Z".into(),
                level: "INFO".into(),
                msg: "[tool] Token refresh".into(),
                count: None,
            },
            // Another tool log
            LogEntry {
                ts: "2026-03-17T13:20:23.000Z".into(),
                level: "INFO".into(),
                msg: "[tool] Done".into(),
                count: None,
            },
        ];

        let deduped = logs.deduplicate();

        assert_eq!(deduped.len(), 4);

        // First: client log (not deduplicated)
        assert_eq!(deduped[0].msg, "openframe::services::tool_run_manager: Starting");
        assert_eq!(deduped[0].count, None);

        // Second: tool log (first occurrence)
        assert_eq!(deduped[1].msg, "[tool] Token refresh");
        assert_eq!(deduped[1].ts, "2026-03-17T13:20:20.000Z");
        assert_eq!(deduped[1].count, Some(2)); // deduplicated: 2 occurrences

        // Third: same client log again (not deduplicated)
        assert_eq!(deduped[2].msg, "openframe::services::tool_run_manager: Starting");
        assert_eq!(deduped[2].count, None);

        // Fourth: another tool log
        assert_eq!(deduped[3].msg, "[tool] Done");
        assert_eq!(deduped[3].count, None);
    }

    #[test]
    fn test_parse_logrus_format() {
        let line = r#"time="2026-03-24T13:24:04Z" level=info msg="Agent: /Library/Application Support""#;
        let entry = parse_log_line(line).unwrap();

        assert_eq!(entry.ts, "2026-03-24T13:24:04Z");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.msg, "[tool] Agent: /Library/Application Support");
    }

    #[test]
    fn test_parse_logrus_with_stdout_prefix() {
        let line = r#"stdout: time="2026-03-24T13:24:04Z" level=info msg="Token refresh job started""#;
        let entry = parse_log_line(line).unwrap();

        assert_eq!(entry.ts, "2026-03-24T13:24:04Z");
        assert_eq!(entry.level, "INFO");
        assert_eq!(entry.msg, "[tool] Token refresh job started");
    }
}
