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
    assert_eq!(
        deduped[0].msg,
        "openframe::services::tool_run_manager: Starting"
    );
    assert_eq!(deduped[0].count, None);

    // Second: tool log (first occurrence)
    assert_eq!(deduped[1].msg, "[tool] Token refresh");
    assert_eq!(deduped[1].ts, "2026-03-17T13:20:20.000Z");
    assert_eq!(deduped[1].count, Some(2)); // deduplicated: 2 occurrences

    // Third: same client log again (not deduplicated)
    assert_eq!(
        deduped[2].msg,
        "openframe::services::tool_run_manager: Starting"
    );
    assert_eq!(deduped[2].count, None);

    // Fourth: another tool log
    assert_eq!(deduped[3].msg, "[tool] Done");
    assert_eq!(deduped[3].count, None);
}

#[test]
fn test_parse_logrus_format() {
    let line =
        r#"time="2026-03-24T13:24:04Z" level=info msg="Agent: /Library/Application Support""#;
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

#[test]
fn test_parse_tool_level_format() {
    let line = "2026-04-06T14:15:10.488Z TOOL Openframe JWT: token123";
    let entry = parse_log_line(line).unwrap();

    assert_eq!(entry.ts, "2026-04-06T14:15:10.488Z");
    assert_eq!(entry.level, "TOOL");
    assert_eq!(entry.msg, "Openframe JWT: token123");
}

#[test]
fn test_tool_level_is_not_client_log() {
    let entry = LogEntry {
        ts: "2026-04-06T14:15:10.488Z".into(),
        level: "TOOL".into(),
        msg: "Connection established".into(),
        count: None,
    };

    assert!(!is_client_log(&entry));
}

#[test]
fn test_deduplicate_tool_level_logs() {
    let logs = vec![
        LogEntry {
            ts: "2026-04-06T14:15:10.000Z".into(),
            level: "TOOL".into(),
            msg: "Connection FAILED: Network timeout".into(),
            count: None,
        },
        LogEntry {
            ts: "2026-04-06T14:15:11.000Z".into(),
            level: "TOOL".into(),
            msg: "Connection FAILED: Network timeout".into(),
            count: None,
        },
        LogEntry {
            ts: "2026-04-06T14:15:12.000Z".into(),
            level: "TOOL".into(),
            msg: "Connection FAILED: Network timeout".into(),
            count: None,
        },
    ];

    let deduped = logs.deduplicate();

    assert_eq!(deduped.len(), 1);
    assert_eq!(deduped[0].msg, "Connection FAILED: Network timeout");
    assert_eq!(deduped[0].count, Some(3));
}
