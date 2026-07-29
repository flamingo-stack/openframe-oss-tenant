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

const TRUNCATION_MARKER: &str = "output truncated: exceeded transport size limit";
const ERROR_NOT_STARTED: &str = "not executed: agent restarted earlier in batch";
const ERROR_INTERRUPTED: &str = "interrupted by agent restart; outcome unknown";

pub trait ResultPublisher: Send + Sync {
    fn publish_raw(&self, subject: &str, bytes: &[u8]) -> impl Future<Output = Result<()>> + Send;
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
                Self {
                    db: Some(Arc::new(db)),
                }
            }
            Err(e) => {
                error!(path = %path.display(), error = %e, "Failed to open result store, quarantining and retrying");
                let corrupt = path.with_extension("redb.corrupt");
                if let Err(re) = std::fs::rename(&path, &corrupt) {
                    warn!(error = %re, "Failed to quarantine corrupt result store");
                }
                match Self::open(&path) {
                    Ok(db) => Self {
                        db: Some(Arc::new(db)),
                    },
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
            info!(
                count,
                "Recovered interrupted scheduled scripts into the outbox"
            );
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
            Ok(dropped) => warn!(
                dropped,
                cap = OUTBOX_MAX_ENTRIES,
                "Outbox over capacity, dropped oldest results"
            ),
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
#[path = "result_store_tests.rs"]
mod tests;
