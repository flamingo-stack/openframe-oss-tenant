use anyhow::{Context, Result};
use indexmap::IndexMap;
use serde::Serialize;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::PathBuf;

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

pub fn read_new_logs(
    log_file_path: &PathBuf,
    position: u64,
    max_count: usize,
) -> Result<(Vec<LogEntry>, u64)> {
    let mut file = File::open(log_file_path).context("Failed to open log file")?;

    // Check if file was truncated (rotated)
    let metadata = file.metadata()?;
    let start_position = if metadata.len() < position { 0 } else { position };

    file.seek(SeekFrom::Start(start_position))?;

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
    let new_position = file.stream_position()?;

    Ok((logs, new_position))
}

fn parse_log_line(line: &str) -> Option<LogEntry> {
    if let Some(entry) = parse_tracing_format(line) {
        return Some(entry);
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

fn is_client_log(entry: &LogEntry) -> bool {
    entry.msg.starts_with("openframe") || entry.msg.starts_with("async_nats")
}

/// Parse OpenFrame tracing compact format
fn parse_tracing_format(line: &str) -> Option<LogEntry> {
    let ts_end = line.find('Z')?;
    let ts = &line[..=ts_end];

    // Validate ISO 8601 timestamp with chrono
    chrono::DateTime::parse_from_rfc3339(ts).ok()?;

    let rest = line[ts_end + 1..].trim_start();
    let level_end = rest.find(char::is_whitespace)?;
    let level = &rest[..level_end];

    let msg = rest[level_end..].trim_start();

    Some(LogEntry {
        ts: ts.to_string(),
        level: level.to_uppercase(),
        msg: msg.to_string(),
        count: None,
    })
}

pub trait LogDeduplicator {
    fn deduplicate(self) -> Vec<LogEntry>;
}

impl LogDeduplicator for Vec<LogEntry> {
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
