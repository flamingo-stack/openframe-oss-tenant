use super::*;
use tempfile::tempdir;

fn store() -> (ResultStore, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let path = dir.path().join("outbox.redb");
    (ResultStore::open_or_degrade(path), dir)
}

fn record(execution_id: &str, script_id: &str) -> (String, JournalRecord) {
    let key = entry_key(execution_id, Some(script_id));
    (
        key,
        JournalRecord {
            subject: "machine.m.script-execution.result".to_string(),
            execution_id: execution_id.to_string(),
            schedule_id: Some("sch".to_string()),
            machine_id: "m".to_string(),
            script_id: Some(script_id.to_string()),
            started: false,
            created_at_secs: now_secs(),
        },
    )
}

fn result(execution_id: &str, script_id: &str) -> RmmResult {
    RmmResult {
        execution_id: execution_id.to_string(),
        machine_id: "m".to_string(),
        stdout: "ok".to_string(),
        stderr: String::new(),
        exit_code: 0,
        execution_time_ms: 1,
        timed_out: false,
        error: None,
        script_id: Some(script_id.to_string()),
        schedule_id: Some("sch".to_string()),
    }
}

#[tokio::test]
async fn invariant_journal_xor_outbox() {
    let (s, _d) = store();
    let (key, rec) = record("ex", "a");
    assert!(s.journal_batch("ex".to_string(), vec![(key.clone(), rec)]).await.unwrap());

    assert!(s.has_batch("ex").await.unwrap());
    assert!(s.pending_keys().await.unwrap().is_empty());

    let bytes = ResultStore::encode_result(&result("ex", "a"));
    s.complete(key.clone(), "subj".to_string(), bytes).await.unwrap();

    assert!(!s.has_batch("ex").await.unwrap());
    let pending = s.pending_keys().await.unwrap();
    assert_eq!(pending, vec![(key, "subj".to_string())]);
}

#[tokio::test]
async fn journal_batch_rejects_duplicate_execution() {
    let (s, _d) = store();
    let (k1, r1) = record("ex", "a");
    assert!(s.journal_batch("ex".to_string(), vec![(k1, r1)]).await.unwrap());

    let (k2, r2) = record("ex", "b");
    assert!(
        !s.journal_batch("ex".to_string(), vec![(k2, r2)]).await.unwrap(),
        "a second batch with the same execution_id must be rejected"
    );
    assert!(s.has_batch("ex").await.unwrap());
}

#[tokio::test]
async fn write_ahead_survives_reopen() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("outbox.redb");
    let key = entry_key("ex", Some("a"));
    {
        let s = ResultStore::open_or_degrade(path.clone());
        let bytes = ResultStore::encode_result(&result("ex", "a"));
        s.complete(key.clone(), "subj".to_string(), bytes).await.unwrap();
    }
    let s = ResultStore::open_or_degrade(path);
    assert_eq!(s.pending_keys().await.unwrap().len(), 1);
    assert!(s.load_payload(key).await.unwrap().is_some());
}

#[tokio::test]
async fn recover_distinguishes_started_flag() {
    let (s, _d) = store();
    let (k1, r1) = record("ex", "a");
    let (k2, mut r2) = record("ex", "b");
    r2.started = true;
    s.journal_batch("ex".to_string(), vec![(k1, r1), (k2, r2)]).await.unwrap();

    let recovered = s.recover().await.unwrap();
    assert_eq!(recovered, 2);
    assert!(!s.has_batch("ex").await.unwrap());

    let mut errors: Vec<String> = Vec::new();
    for (key, _) in s.pending_keys().await.unwrap() {
        let bytes = s.load_payload(key).await.unwrap().unwrap();
        let r: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(r["exit_code"], 85);
        errors.push(r["error"].as_str().unwrap().to_string());
    }
    errors.sort();
    assert_eq!(errors, vec![ERROR_INTERRUPTED.to_string(), ERROR_NOT_STARTED.to_string()]);
}

#[tokio::test]
async fn recover_is_idempotent() {
    let (s, _d) = store();
    let (k, r) = record("ex", "a");
    s.journal_batch("ex".to_string(), vec![(k, r)]).await.unwrap();
    assert_eq!(s.recover().await.unwrap(), 1);
    assert_eq!(s.recover().await.unwrap(), 0);
    assert_eq!(s.pending_keys().await.unwrap().len(), 1);
}

#[tokio::test]
async fn same_batch_two_scripts_coexist() {
    let (s, _d) = store();
    let a = ResultStore::encode_result(&result("ex", "a"));
    let b = ResultStore::encode_result(&result("ex", "b"));
    s.complete(entry_key("ex", Some("a")), "subj".to_string(), a).await.unwrap();
    s.complete(entry_key("ex", Some("b")), "subj".to_string(), b).await.unwrap();
    assert_eq!(s.pending_keys().await.unwrap().len(), 2);
}

#[tokio::test]
async fn oversize_result_is_truncated_under_limit() {
    let mut r = result("ex", "a");
    r.stdout = "x".repeat(OUTBOX_MAX_PAYLOAD_BYTES + 1024);
    r.stderr = "diagnostic".to_string();
    let bytes = ResultStore::encode_result(&r);
    assert!(bytes.len() <= OUTBOX_MAX_PAYLOAD_BYTES);
    let decoded: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(decoded["error"], TRUNCATION_MARKER);
    assert_eq!(decoded["stderr"], "diagnostic", "stderr preferred over stdout");
}

#[tokio::test]
async fn prune_keeps_newest_drops_oldest() {
    let (s, _d) = store();
    for i in 0..5 {
        let mut r = record("ex", &format!("s{}", i));
        r.1.created_at_secs = i as u64;
        let bytes = ResultStore::encode_result(&result("ex", &format!("s{}", i)));
        s.complete(r.0, "subj".to_string(), bytes).await.unwrap();
    }
    let dropped = s.prune_oldest(2).await.unwrap();
    assert_eq!(dropped, 3);
    assert_eq!(s.len().await.unwrap(), 2);
}
