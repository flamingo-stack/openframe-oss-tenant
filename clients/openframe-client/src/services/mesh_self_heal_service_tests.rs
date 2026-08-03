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
