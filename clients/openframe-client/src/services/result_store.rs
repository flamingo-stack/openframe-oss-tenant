use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use std::future::Future;

use anyhow::{Context, Result};
use redb::{Database, ReadableTable, ReadableTableMetadata, TableDefinition};
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

use crate::config::update_config::{OUTBOX_MAX_ENTRIES, OUTBOX_MAX_PAYLOAD_BYTES};
use crate::models::RmmResult;

const JOURNAL: TableDefinition<&str, &[u8]> = TableDefinition::new("journal");
const OUTBOX_META: TableDefinition<&str, &[u8]> = TableDefinition::new("outbox_meta");
const OUTBOX_PAYLOAD: TableDefinition<&str, &[u8]> = TableDefinition::new("outbox_payload");

const TRUNCATION_MARKER: &str = "output truncated: exceeded 5 MB transport limit";
const ERROR_NOT_STARTED: &str = "not executed: agent restarted earlier in batch";
const ERROR_INTERRUPTED: &str = "interrupted by agent restart; outcome unknown";

pub trait ResultPublisher: Send + Sync {
    fn publish_raw(
        &self,
        subject: &str,
        bytes: &[u8],
    ) -> impl Future<Output = Result<()>> + Send;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalRecord {
    pub subject: String,
    pub execution_id: String,
    pub schedule_id: Option<String>,
    pub machine_id: String,
    pub script_id: Option<String>,
    pub started: bool,
    pub created_at_secs: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct OutboxMeta {
    subject: String,
    created_at_secs: u64,
}

pub fn entry_key(execution_id: &str, script_id: Option<&str>) -> String {
    match script_id {
        Some(id) => format!("{}:{}", execution_id, id),
        None => execution_id.to_string(),
    }
}

pub fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub struct ResultStore {
    db: Option<Arc<Database>>,
}

impl ResultStore {
    pub fn open_or_degrade(path: PathBuf) -> Self {
        match Self::open(&path) {
            Ok(db) => {
                info!(path = %path.display(), "Result store opened");
                Self { db: Some(Arc::new(db)) }
            }
            Err(e) => {
                error!(path = %path.display(), error = %e, "Failed to open result store, quarantining and retrying");
                let corrupt = path.with_extension("redb.corrupt");
                if let Err(re) = std::fs::rename(&path, &corrupt) {
                    warn!(error = %re, "Failed to quarantine corrupt result store");
                }
                match Self::open(&path) {
                    Ok(db) => Self { db: Some(Arc::new(db)) },
                    Err(e2) => {
                        error!(error = %e2, "Result store unavailable, running without durability");
                        Self { db: None }
                    }
                }
            }
        }
    }

    fn open(path: &Path) -> Result<Database> {
        let db = Database::create(path).context("create redb database")?;
        let txn = db.begin_write()?;
        {
            txn.open_table(JOURNAL)?;
            txn.open_table(OUTBOX_META)?;
            txn.open_table(OUTBOX_PAYLOAD)?;
        }
        txn.commit()?;
        Ok(db)
    }

    pub fn enabled(&self) -> bool {
        self.db.is_some()
    }

    pub fn encode_result(result: &RmmResult) -> Vec<u8> {
        let full = serde_json::to_vec(result).unwrap_or_default();
        if full.len() <= OUTBOX_MAX_PAYLOAD_BYTES {
            return full;
        }
        let mut capped = result.clone();
        capped.error = Some(TRUNCATION_MARKER.to_string());
        loop {
            let bytes = serde_json::to_vec(&capped).unwrap_or_default();
            if bytes.len() <= OUTBOX_MAX_PAYLOAD_BYTES {
                return bytes;
            }
            if !capped.stdout.is_empty() {
                shrink(&mut capped.stdout);
            } else if !capped.stderr.is_empty() {
                shrink(&mut capped.stderr);
            } else {
                return bytes;
            }
        }
    }

    async fn with_db<F, T>(&self, f: F) -> Result<T>
    where
        F: FnOnce(&Database) -> Result<T> + Send + 'static,
        T: Send + 'static,
    {
        let db = self.db.clone().context("result store is not durable")?;
        tokio::task::spawn_blocking(move || f(&db))
            .await
            .context("result store task join")?
    }

    pub async fn journal_batch(
        &self,
        execution_id: String,
        records: Vec<(String, JournalRecord)>,
    ) -> Result<bool> {
        self.with_db(move |db| {
            let txn = db.begin_write()?;
            let inserted;
            {
                let mut journal = txn.open_table(JOURNAL)?;
                if journal_contains_batch(&journal, &execution_id)? {
                    inserted = false;
                } else {
                    for (key, record) in &records {
                        let value = serde_json::to_vec(record)?;
                        journal.insert(key.as_str(), value.as_slice())?;
                    }
                    inserted = true;
                }
            }
            txn.commit()?;
            Ok(inserted)
        })
        .await
    }

    pub async fn has_batch(&self, execution_id: &str) -> Result<bool> {
        let execution_id = execution_id.to_string();
        self.with_db(move |db| {
            let txn = db.begin_read()?;
            let journal = txn.open_table(JOURNAL)?;
            journal_contains_batch(&journal, &execution_id)
        })
        .await
    }

    pub async fn journal_remove(&self, key: String) -> Result<()> {
        self.with_db(move |db| {
            let txn = db.begin_write()?;
            {
                txn.open_table(JOURNAL)?.remove(key.as_str())?;
            }
            txn.commit()?;
            Ok(())
        })
        .await
    }

    pub async fn journal_mark_started(&self, key: String) -> Result<()> {
        self.with_db(move |db| {
            let txn = db.begin_write()?;
            {
                let mut journal = txn.open_table(JOURNAL)?;
                let current = journal.get(key.as_str())?.map(|v| v.value().to_vec());
                if let Some(bytes) = current {
                    let mut record: JournalRecord = serde_json::from_slice(&bytes)?;
                    record.started = true;
                    journal.insert(key.as_str(), serde_json::to_vec(&record)?.as_slice())?;
                }
            }
            txn.commit()?;
            Ok(())
        })
        .await
    }

    pub async fn complete(&self, key: String, subject: String, bytes: Vec<u8>) -> Result<()> {
        self.with_db(move |db| {
            let txn = db.begin_write()?;
            {
                let mut meta = txn.open_table(OUTBOX_META)?;
                let mut payload = txn.open_table(OUTBOX_PAYLOAD)?;
                let m = OutboxMeta {
                    subject,
                    created_at_secs: now_secs(),
                };
                meta.insert(key.as_str(), serde_json::to_vec(&m)?.as_slice())?;
                payload.insert(key.as_str(), bytes.as_slice())?;
                let mut journal = txn.open_table(JOURNAL)?;
                journal.remove(key.as_str())?;
            }
            txn.commit()?;
            Ok(())
        })
        .await?;
        self.prune_over_cap().await;
        Ok(())
    }

    pub async fn recover(&self) -> Result<usize> {
        if !self.enabled() {
            return Ok(0);
        }
        let records = self
            .with_db(|db| {
                let txn = db.begin_read()?;
                let journal = txn.open_table(JOURNAL)?;
                let mut out = Vec::new();
                for entry in journal.iter()? {
                    let (key, value) = entry?;
                    let record: JournalRecord = serde_json::from_slice(value.value())?;
                    out.push((key.value().to_string(), record));
                }
                Ok(out)
            })
            .await?;

        let count = records.len();
        for (key, record) in records {
            let error = if record.started {
                ERROR_INTERRUPTED
            } else {
                ERROR_NOT_STARTED
            };
            let result = RmmResult {
                execution_id: record.execution_id.clone(),
                machine_id: record.machine_id.clone(),
                stdout: String::new(),
                stderr: String::new(),
                exit_code: 85,
                execution_time_ms: 0,
                timed_out: false,
                error: Some(error.to_string()),
                script_id: record.script_id.clone(),
                schedule_id: record.schedule_id.clone(),
            };
            let bytes = Self::encode_result(&result);
            self.complete(key, record.subject, bytes).await?;
        }
        if count > 0 {
            info!(count, "Recovered interrupted scheduled scripts into the outbox");
        }
        Ok(count)
    }

    pub async fn pending_keys(&self) -> Result<Vec<(String, String)>> {
        self.with_db(|db| {
            let txn = db.begin_read()?;
            let meta = txn.open_table(OUTBOX_META)?;
            let mut out = Vec::new();
            for entry in meta.iter()? {
                let (key, value) = entry?;
                let m: OutboxMeta = serde_json::from_slice(value.value())?;
                out.push((key.value().to_string(), m.subject));
            }
            Ok(out)
        })
        .await
    }

    pub async fn load_payload(&self, key: String) -> Result<Option<Vec<u8>>> {
        self.with_db(move |db| {
            let txn = db.begin_read()?;
            let payload = txn.open_table(OUTBOX_PAYLOAD)?;
            Ok(payload.get(key.as_str())?.map(|v| v.value().to_vec()))
        })
        .await
    }

    pub async fn remove(&self, key: String) -> Result<()> {
        self.with_db(move |db| {
            let txn = db.begin_write()?;
            {
                let mut meta = txn.open_table(OUTBOX_META)?;
                let mut payload = txn.open_table(OUTBOX_PAYLOAD)?;
                meta.remove(key.as_str())?;
                payload.remove(key.as_str())?;
            }
            txn.commit()?;
            Ok(())
        })
        .await
    }

    pub async fn len(&self) -> Result<usize> {
        self.with_db(|db| {
            let txn = db.begin_read()?;
            let meta = txn.open_table(OUTBOX_META)?;
            Ok(meta.len()? as usize)
        })
        .await
    }

    async fn prune_over_cap(&self) {
        match self.prune_oldest(OUTBOX_MAX_ENTRIES).await {
            Ok(0) => {}
            Ok(dropped) => warn!(dropped, cap = OUTBOX_MAX_ENTRIES, "Outbox over capacity, dropped oldest results"),
            Err(e) => warn!(error = %e, "Failed to prune outbox"),
        }
    }

    pub async fn prune_oldest(&self, keep_newest: usize) -> Result<usize> {
        self.with_db(move |db| {
            {
                let rtxn = db.begin_read()?;
                let meta = rtxn.open_table(OUTBOX_META)?;
                if (meta.len()? as usize) <= keep_newest {
                    return Ok(0);
                }
            }
            let txn = db.begin_write()?;
            let dropped;
            {
                let mut meta = txn.open_table(OUTBOX_META)?;
                let total = meta.len()? as usize;
                if total <= keep_newest {
                    return Ok(0);
                }
                let mut entries = Vec::with_capacity(total);
                for entry in meta.iter()? {
                    let (key, value) = entry?;
                    let m: OutboxMeta = serde_json::from_slice(value.value())?;
                    entries.push((key.value().to_string(), m.created_at_secs));
                }
                entries.sort_by_key(|(_, created)| *created);
                let to_drop = total - keep_newest;
                let victims: Vec<String> =
                    entries.into_iter().take(to_drop).map(|(k, _)| k).collect();
                let mut payload = txn.open_table(OUTBOX_PAYLOAD)?;
                for key in &victims {
                    meta.remove(key.as_str())?;
                    payload.remove(key.as_str())?;
                }
                dropped = victims.len();
            }
            txn.commit()?;
            Ok(dropped)
        })
        .await
    }
}

fn journal_contains_batch(
    journal: &impl ReadableTable<&'static str, &'static [u8]>,
    execution_id: &str,
) -> Result<bool> {
    let prefix = format!("{}:", execution_id);
    for entry in journal.iter()? {
        let (key, _) = entry?;
        let key = key.value();
        if key == execution_id || key.starts_with(&prefix) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn shrink(s: &mut String) {
    let mut n = s.len().saturating_sub(s.len() / 4 + 1);
    while n > 0 && !s.is_char_boundary(n) {
        n -= 1;
    }
    s.truncate(n);
}

#[cfg(test)]
mod tests {
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
}
