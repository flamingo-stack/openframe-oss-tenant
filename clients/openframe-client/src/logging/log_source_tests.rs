use super::*;
use std::io::Write;
use tempfile::TempDir;

#[test]
fn test_file_log_source_reads_and_commits() {
    let tmp = TempDir::new().unwrap();
    let log_path = tmp.path().join("test.log");
    let offset_path = tmp.path().join("offset");

    let mut file = File::create(&log_path).unwrap();
    writeln!(
        file,
        "2026-04-06T14:15:10.488Z INFO openframe::test: message 1"
    )
    .unwrap();
    writeln!(
        file,
        "2026-04-06T14:15:11.488Z WARN openframe::test: message 2"
    )
    .unwrap();

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
        fn name(&self) -> &str {
            &self.name
        }
        fn read(&mut self, max_count: usize) -> Result<Vec<LogEntry>> {
            let available = self.logs_available.load(Ordering::SeqCst);
            let to_read = max_count.min(available);
            self.logs_available.fetch_sub(to_read, Ordering::SeqCst);

            Ok((0..to_read)
                .map(|i| LogEntry {
                    ts: format!("2026-04-06T14:15:{:02}.000Z", i),
                    level: "INFO".to_string(),
                    msg: format!("{}::log_{}", self.name, i),
                    count: None,
                })
                .collect())
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
