use std::fmt;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::fs;

use anyhow::{Context, Result};
use tracing::{error, info};

use super::log_parser::{parse_log_line, LogDeduplicator, LogEntry};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogSourceKind {
    Openframe,
    Meshcentral,
}

impl fmt::Display for LogSourceKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LogSourceKind::Openframe => write!(f, "openframe"),
            LogSourceKind::Meshcentral => write!(f, "meshcentral-agent"),
        }
    }
}

pub trait LogSource: Send + Sync {
    fn name(&self) -> &str;
    fn read(&mut self, max_count: usize) -> Result<Vec<LogEntry>>;
    fn commit(&mut self);
    fn rollback(&mut self);
}

pub struct FileLogSource {
    name: String,
    log_path: PathBuf,
    offset_path: PathBuf,
    committed_offset: u64,
    pending_offset: u64,
}

impl FileLogSource {
    pub fn new(kind: LogSourceKind, log_path: PathBuf, offset_path: PathBuf) -> Self {
        let offset = load_offset(&offset_path);
        Self {
            name: kind.to_string(),
            log_path,
            offset_path,
            committed_offset: offset,
            pending_offset: offset,
        }
    }
}

impl LogSource for FileLogSource {
    fn name(&self) -> &str {
        &self.name
    }

    fn read(&mut self, max_count: usize) -> Result<Vec<LogEntry>> {
        let (entries, new_offset) = read_log_file(&self.log_path, self.committed_offset, max_count)?;
        self.pending_offset = new_offset;
        Ok(entries)
    }

    fn commit(&mut self) {
        self.committed_offset = self.pending_offset;
        save_offset(&self.offset_path, self.committed_offset);
    }

    fn rollback(&mut self) {
        self.pending_offset = self.committed_offset;
    }
}


fn read_log_file(path: &Path, position: u64, max_count: usize) -> Result<(Vec<LogEntry>, u64)> {
    let mut file = File::open(path).context("Failed to open log file")?;
    let metadata = file.metadata()?;
    let start_position = if metadata.len() < position { 0 } else { position };

    file.seek(SeekFrom::Start(start_position))?;

    let reader = BufReader::new(&file);
    let mut entries = Vec::new();

    for line in reader.lines() {
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

    let new_position = file.stream_position()?;
    Ok((entries, new_position))
}

fn load_offset(path: &Path) -> u64 {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0)
}

fn save_offset(path: &Path, offset: u64) {
    if let Err(e) = fs::write(path, offset.to_string()) {
        error!("Failed to save log offset to {:?}: {:#}", path, e);
    }
}

pub struct LogSourceRegistry {
    sources: Vec<Box<dyn LogSource>>,
}

impl LogSourceRegistry {
    pub fn new() -> Self {
        Self {
            sources: Vec::new(),
        }
    }

    pub fn register(&mut self, source: Box<dyn LogSource>) {
        info!("Registered log source: {}", source.name());
        self.sources.push(source);
    }

    pub fn read_all(&mut self, max_total: usize) -> Vec<LogEntry> {
        let mut all_logs = Vec::new();
        let mut remaining = max_total;
        let mut active: Vec<bool> = vec![true; self.sources.len()];

        while remaining > 0 && active.iter().any(|&a| a) {
            let active_count = active.iter().filter(|&&a| a).count();
            let quota_per_source = remaining / active_count;

            // Minimum 1 log per source to make progress
            let quota = quota_per_source.max(1);

            for (i, source) in self.sources.iter_mut().enumerate() {
                if !active[i] || remaining == 0 {
                    continue;
                }

                let to_read = quota.min(remaining);

                match source.read(to_read) {
                    Ok(entries) => {
                        let count = entries.len();
                        if count == 0 {
                            active[i] = false;
                        } else {
                            info!("Read {} logs from '{}'", count, source.name());
                            remaining = remaining.saturating_sub(count);
                            all_logs.extend(entries);

                            if count < to_read {
                                active[i] = false;
                            }
                        }
                    }
                    Err(e) => {
                        error!("Failed to read from '{}': {:#}", source.name(), e);
                        active[i] = false;
                    }
                }
            }
        }

        all_logs.deduplicate()
    }

    pub fn commit_all(&mut self) {
        for source in &mut self.sources {
            source.commit();
        }
    }

    pub fn rollback_all(&mut self) {
        for source in &mut self.sources {
            source.rollback();
        }
    }
}

impl Default for LogSourceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_file_log_source_reads_and_commits() {
        let tmp = TempDir::new().unwrap();
        let log_path = tmp.path().join("test.log");
        let offset_path = tmp.path().join("offset");

        let mut file = File::create(&log_path).unwrap();
        writeln!(file, "2026-04-06T14:15:10.488Z INFO openframe::test: message 1").unwrap();
        writeln!(file, "2026-04-06T14:15:11.488Z WARN openframe::test: message 2").unwrap();

        let mut source = FileLogSource::new(LogSourceKind::Openframe, log_path, offset_path.clone());
        let entries = source.read(10).unwrap();

        assert_eq!(entries.len(), 2);
        source.commit();
        assert!(offset_path.exists());
    }

    #[test]
    fn test_file_log_source_returns_error_on_missing_file() {
        let tmp = TempDir::new().unwrap();
        let log_path = tmp.path().join("nonexistent.log");
        let offset_path = tmp.path().join("offset");

        let mut source = FileLogSource::new(LogSourceKind::Meshcentral, log_path, offset_path);
        assert!(source.read(10).is_err());
    }

    #[test]
    fn test_file_log_source_rollback() {
        let tmp = TempDir::new().unwrap();
        let log_path = tmp.path().join("test.log");
        let offset_path = tmp.path().join("offset");

        let mut file = File::create(&log_path).unwrap();
        writeln!(file, "2026-04-06T14:15:10.488Z INFO openframe::test: msg").unwrap();

        let mut source = FileLogSource::new(LogSourceKind::Openframe, log_path, offset_path);

        let entries1 = source.read(10).unwrap();
        source.rollback();
        let entries2 = source.read(10).unwrap();

        assert_eq!(entries1[0].msg, entries2[0].msg);
    }

    #[test]
    fn test_registry_distributes_reads_across_sources() {
        use std::sync::atomic::{AtomicUsize, Ordering};
        use std::sync::Arc;

        struct MockLogSource {
            name: String,
            logs_available: Arc<AtomicUsize>,
        }

        impl MockLogSource {
            fn new(name: &str, available: usize) -> Self {
                Self {
                    name: name.to_string(),
                    logs_available: Arc::new(AtomicUsize::new(available)),
                }
            }
        }

        impl LogSource for MockLogSource {
            fn name(&self) -> &str { &self.name }
            fn read(&mut self, max_count: usize) -> Result<Vec<LogEntry>> {
                let available = self.logs_available.load(Ordering::SeqCst);
                let to_read = max_count.min(available);
                self.logs_available.fetch_sub(to_read, Ordering::SeqCst);

                Ok((0..to_read).map(|i| LogEntry {
                    ts: format!("2026-04-06T14:15:{:02}.000Z", i),
                    level: "INFO".to_string(),
                    msg: format!("{}::log_{}", self.name, i),
                    count: None,
                }).collect())
            }
            fn commit(&mut self) {}
            fn rollback(&mut self) {}
        }

        let mut registry = LogSourceRegistry::new();
        registry.register(Box::new(MockLogSource::new("source1", 100)));
        registry.register(Box::new(MockLogSource::new("source2", 100)));

        let logs = registry.read_all(50);
        assert!(logs.len() <= 50);
    }
}
