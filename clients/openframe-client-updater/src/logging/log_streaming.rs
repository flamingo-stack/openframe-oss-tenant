use anyhow::{Context, Result};
use async_nats::jetstream;
use serde::Serialize;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::time::interval;
use tracing::{debug, error, info};

use crate::services::agent_configuration_service::AgentConfigurationService;

const BATCH_INTERVAL_SECS: u64 = 60;
const MAX_LOGS_PER_BATCH: usize = 50;
const NATS_SUBJECT: &str = "agents.logs";

// ── Data types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
struct LogEntry {
    level: String,
    ts: String,
    msg: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogBatchMessage {
    #[serde(skip_serializing_if = "Option::is_none")]
    machine_id: Option<String>,
    hostname: String,
    logs: Vec<LogEntry>,
}

// ── Log line parser — tracing compact format ───────────────────────────────

fn parse_log_line(line: &str) -> Option<LogEntry> {
    let ts_end = line.find('Z')?;
    let ts = &line[..=ts_end];
    chrono::DateTime::parse_from_rfc3339(ts).ok()?;

    let rest = line[ts_end + 1..].trim_start();
    let level_end = rest.find(char::is_whitespace)?;
    let level = &rest[..level_end];
    let msg = rest[level_end..].trim_start();

    Some(LogEntry {
        ts: ts.to_string(),
        level: level.to_uppercase(),
        msg: msg.to_string(),
    })
}

// ── File reader with commit/rollback offset ────────────────────────────────

struct FileLogSource {
    log_path: PathBuf,
    offset_path: PathBuf,
    committed_offset: u64,
    pending_offset: u64,
}

impl FileLogSource {
    fn new(log_path: PathBuf, offset_path: PathBuf) -> Self {
        let offset = fs::read_to_string(&offset_path)
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0);
        Self {
            log_path,
            offset_path,
            committed_offset: offset,
            pending_offset: offset,
        }
    }

    fn read(&mut self, max_count: usize) -> Result<Vec<LogEntry>> {
        let mut file = File::open(&self.log_path).context("Failed to open log file")?;
        let metadata = file.metadata()?;

        let start = if metadata.len() < self.committed_offset {
            0
        } else {
            self.committed_offset
        };

        file.seek(SeekFrom::Start(start))?;

        let mut entries = Vec::new();
        for line in BufReader::new(&file).lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => continue,
            };
            if let Some(entry) = parse_log_line(&line) {
                entries.push(entry);
                if entries.len() >= max_count {
                    break;
                }
            }
        }

        self.pending_offset = file.stream_position()?;
        Ok(entries)
    }

    fn commit(&mut self) {
        self.committed_offset = self.pending_offset;
        if let Err(e) = fs::write(&self.offset_path, self.committed_offset.to_string()) {
            error!("Failed to save log offset: {}", e);
        }
    }

    fn rollback(&mut self) {
        self.pending_offset = self.committed_offset;
    }
}

// ── Cross-platform hostname ────────────────────────────────────────────────

fn get_hostname() -> String {
    #[cfg(target_os = "windows")]
    {
        std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        fs::read_to_string("/etc/hostname")
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| "unknown".to_string())
    }
}

// ── Public entry point ─────────────────────────────────────────────────────

/// Owns the full log streaming pipeline for openframe-client-updater:
///   write (.log file) → read (FileLogSource) → publish (existing NATS JetStream)
///
/// Same pattern as meshagent: the service owns its pipeline end-to-end rather
/// than delegating reading to an external process.
pub struct LogStreamingRunManager {
    nats_client: Arc<async_nats::Client>,
    agent_config_service: AgentConfigurationService,
    log_file_path: PathBuf,
    offset_file_path: PathBuf,
    hostname: String,
}

impl LogStreamingRunManager {
    pub fn new(
        nats_client: Arc<async_nats::Client>,
        agent_config_service: AgentConfigurationService,
        log_file_path: PathBuf,
        offset_file_path: PathBuf,
    ) -> Self {
        Self {
            nats_client,
            agent_config_service,
            log_file_path,
            offset_file_path,
            hostname: get_hostname(),
        }
    }

    pub fn start(self) {
        tokio::spawn(async move {
            let js = jetstream::new((*self.nats_client).clone());
            let mut source = FileLogSource::new(
                self.log_file_path.clone(),
                self.offset_file_path.clone(),
            );
            let mut ticker = interval(Duration::from_secs(BATCH_INTERVAL_SECS));

            loop {
                ticker.tick().await;

                if !self.log_file_path.exists() {
                    debug!("Log streaming: log file not yet present, skipping tick");
                    continue;
                }

                let logs = match source.read(MAX_LOGS_PER_BATCH) {
                    Ok(entries) => entries,
                    Err(e) => {
                        error!("Log streaming: failed to read log file: {:#}", e);
                        continue;
                    }
                };

                if logs.is_empty() {
                    continue;
                }

                let machine_id = self.agent_config_service.get_machine_id().await.ok();

                let batch = LogBatchMessage {
                    machine_id,
                    hostname: self.hostname.clone(),
                    logs,
                };

                let json = match serde_json::to_vec(&batch) {
                    Ok(j) => j,
                    Err(e) => {
                        error!("Log streaming: failed to serialise batch: {}", e);
                        source.rollback();
                        continue;
                    }
                };

                match js.publish(NATS_SUBJECT, json.into()).await {
                    Ok(ack) => match ack.await {
                        Ok(_) => {
                            info!("Log streaming: published {} entries", batch.logs.len());
                            source.commit();
                        }
                        Err(e) => {
                            error!("Log streaming: ack failed: {:#}", e);
                            source.rollback();
                        }
                    },
                    Err(e) => {
                        error!("Log streaming: publish failed: {:#}", e);
                        source.rollback();
                    }
                }
            }
        });
    }
}
