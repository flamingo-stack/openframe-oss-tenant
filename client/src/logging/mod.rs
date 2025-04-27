pub mod metrics;
pub mod shipping;

use crate::platform::{DirectoryError, DirectoryManager};
use chrono::Utc;
use flate2::write::GzEncoder;
use flate2::Compression;
use metrics::{MetricValue, MetricsLayer, MetricsStore};
use serde::Serialize;
use shipping::LogShipper;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;
use tokio::sync::RwLock;
use tracing::{Event, Level, Metadata, Subscriber};
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{
    fmt::{self, time::SystemTime},
    layer::SubscriberExt,
    prelude::*,
    EnvFilter, Layer, Registry,
};

#[derive(Debug, Serialize)]
struct LogEntry {
    timestamp: String,
    level: String,
    target: String,
    module_path: Option<String>,
    file: Option<String>,
    line: Option<u32>,
    thread: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(flatten)]
    context: serde_json::Value,
}

// Global file logger for direct writes when tracing fails
static LOG_FILE: std::sync::OnceLock<Arc<Mutex<Option<std::fs::File>>>> =
    std::sync::OnceLock::new();

// Get access to the global log file for manual writing
fn get_log_file() -> Arc<Mutex<Option<std::fs::File>>> {
    LOG_FILE.get().cloned().unwrap_or_else(|| {
        let file = Arc::new(Mutex::new(None));
        let _ = LOG_FILE.set(file.clone());
        file
    })
}

// Manual log function that writes directly to file - fallback when tracing fails
pub fn manual_log(level: &str, message: &str) {
    let timestamp = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Micros, true);
    let entry = LogEntry {
        timestamp,
        level: level.to_string(),
        target: "manual".to_string(),
        module_path: None,
        file: None,
        line: None,
        thread: format!("{:?}", std::thread::current().id()),
        message: message.to_string(),
        error: None,
        context: serde_json::Value::Object(serde_json::Map::new()),
    };

    if let Ok(json) = serde_json::to_string(&entry) {
        if let Ok(mut file_lock) = get_log_file().lock() {
            if let Some(ref mut file) = *file_lock {
                let _ = writeln!(file, "{}", json);
                let _ = file.flush();
            }
        }

        // Also write to stdout for capture by LaunchDaemon
        println!("{}", json);
    }
}

pub struct JsonLayer {
    writer: Arc<std::sync::Mutex<std::fs::File>>,
    metrics: Arc<RwLock<MetricsStore>>,
}

impl JsonLayer {
    fn new(log_file: PathBuf) -> std::io::Result<Self> {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_file)?;

        Ok(Self {
            writer: Arc::new(std::sync::Mutex::new(file)),
            metrics: Arc::new(RwLock::new(MetricsStore::new())),
        })
    }
}

impl<S> Layer<S> for JsonLayer
where
    S: tracing::Subscriber,
{
    fn on_event(
        &self,
        event: &tracing::Event<'_>,
        _ctx: tracing_subscriber::layer::Context<'_, S>,
    ) {
        let mut visitor = JsonVisitor::default();
        event.record(&mut visitor);

        let level = event.metadata().level().to_string();

        // Update metrics based on log level
        let mut labels = HashMap::new();
        labels.insert("level".to_string(), level.clone());

        if let Ok(mut metrics) = self.metrics.try_write() {
            metrics.record_counter("log_count", 1, labels);
        }

        // Store message content in a separate variable before using it
        let message_content = visitor.message.clone().unwrap_or_default();

        let log_entry = LogEntry {
            timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Micros, true),
            level,
            target: event.metadata().target().to_string(),
            module_path: event.metadata().module_path().map(|s| s.to_string()),
            file: event.metadata().file().map(|s| s.to_string()),
            line: event.metadata().line(),
            thread: format!("{:?}", std::thread::current().id()),
            message: message_content.clone(),
            error: visitor.error,
            context: serde_json::Value::Object(visitor.fields),
        };

        if let Ok(json) = serde_json::to_string(&log_entry) {
            if let Ok(mut file) = self.writer.lock() {
                let _ = writeln!(file, "{}", json);
                let _ = file.flush();
            }

            // Also write to stdout for capture by LaunchDaemon
            // Use stdout for INFO or lower level logs, stderr for warnings/errors
            if event.metadata().level() <= &Level::INFO {
                println!("{}", json);
            } else {
                eprintln!("{}", json);
            }
        }

        // Also write to manual log as backup
        manual_log(&event.metadata().level().to_string(), &message_content);
    }
}

#[derive(Default)]
struct JsonVisitor {
    message: Option<String>,
    error: Option<String>,
    fields: serde_json::Map<String, serde_json::Value>,
}

impl tracing::field::Visit for JsonVisitor {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.message = Some(value.to_string());
        } else if field.name() == "error" {
            self.error = Some(value.to_string());
        } else {
            self.fields.insert(field.name().to_string(), value.into());
        }
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        self.fields
            .insert(field.name().to_string(), format!("{:?}", value).into());
    }
}

/// Initialize logging with optional endpoint and agent ID
pub fn init(log_endpoint: Option<String>, agent_id: Option<String>) -> std::io::Result<()> {
    // Check if logging is already initialized
    static INIT: std::sync::Once = std::sync::Once::new();
    let mut init_result = Ok(());

    INIT.call_once(|| {
        // Initialize directory manager and ensure directories exist
        let dir_manager = DirectoryManager::new();
        if let Err(e) = dir_manager.perform_health_check() {
            init_result = Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            ));
            return;
        }

        // Create log directory if it doesn't exist
        let log_dir = dir_manager.logs_dir();
        if !log_dir.exists() {
            if let Err(e) = std::fs::create_dir_all(&log_dir) {
                eprintln!("Failed to create log directory: {}", e);
                init_result = Err(e);
                return;
            }
        }

        // Initialize global log file for manual writes
        let log_file_path = log_dir.join("openframe.log");
        match std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_path)
        {
            Ok(file) => {
                let _ = LOG_FILE.set(Arc::new(Mutex::new(Some(file))));
                // Write initial entry
                manual_log("INFO", "Manual logging system initialized");
            }
            Err(e) => {
                eprintln!("Failed to open log file for manual writes: {}", e);
            }
        }

        // Create a simple direct file logger that we know works
        let log_path = log_dir.join("openframe.log");

        // Create and set up a non-rotating file logger - simplest, most reliable approach
        let file_appender = match std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
        {
            Ok(file) => file,
            Err(e) => {
                eprintln!("Failed to open log file: {}", e);
                init_result = Err(e);
                return;
            }
        };

        // Create JSON layer
        let json_layer = fmt::layer()
            .json()
            .with_file(true)
            .with_line_number(true)
            .with_thread_ids(true)
            .with_target(true)
            .with_timer(SystemTime::default())
            .with_writer(std::sync::Mutex::new(file_appender));

        // Set log level to INFO or lower (DEBUG/TRACE) from environment or default to INFO
        let env_filter = EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| EnvFilter::new("info,openframe=debug"));

        // Create metrics layer
        let (metrics_layer, metrics_store) = MetricsLayer::new();

        // Set up the subscriber with our layers
        let subscriber = Registry::default()
            .with(env_filter)
            .with(json_layer)
            .with(metrics_layer);

        // Set the subscriber as the default
        if let Err(e) = tracing::subscriber::set_global_default(subscriber) {
            eprintln!("Failed to set global subscriber: {}", e);
            init_result = Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            ));
            return;
        }

        // Force an initial log entry with explicit info level to ensure logging is working
        tracing::info!("OpenFrame logging system initialized");
        manual_log("INFO", "BACKUP: OpenFrame logging system initialized");

        // Store metrics for later access
        METRICS_STORE.get_or_init(|| metrics_store);

        // Start the background compression task with directory manager
        let dir_manager_clone = dir_manager.clone();
        std::thread::spawn(move || {
            compress_old_logs(&dir_manager_clone);
        });
    });

    init_result
}

// Static storage for metrics
static METRICS_STORE: std::sync::OnceLock<Arc<RwLock<MetricsStore>>> = std::sync::OnceLock::new();

/// Get access to the metrics store
pub fn get_metrics_store() -> Option<Arc<RwLock<MetricsStore>>> {
    METRICS_STORE.get().cloned()
}

/// Compress old log files that haven't been compressed yet
fn compress_old_logs(dir_manager: &DirectoryManager) {
    loop {
        if let Ok(log_dir) = dir_manager.logs_dir().canonicalize() {
            if let Ok(entries) = fs::read_dir(&log_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        // Only process .log files that aren't today's log
                        if ext == "log" {
                            let filename = path.file_name().unwrap().to_string_lossy();
                            // Don't compress the current log file
                            if !filename.ends_with(".gz")
                                && !is_current_log(&filename)
                                && filename != "openframe.log"
                            {
                                if let Err(e) = compress_log_file(&path) {
                                    eprintln!(
                                        "Failed to compress log file {}: {}",
                                        path.display(),
                                        e
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
        // Check for files to compress every hour
        std::thread::sleep(std::time::Duration::from_secs(3600));
    }
}

/// Check if the given log file is the current day's log
fn is_current_log(filename: &str) -> bool {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    filename.contains(&today)
}

/// Compress a log file using gzip compression
fn compress_log_file(path: &PathBuf) -> std::io::Result<()> {
    let mut input = fs::File::open(path)?;
    let mut contents = Vec::new();
    input.read_to_end(&mut contents)?;

    let gz_path = path.with_extension("log.gz");
    let output = fs::File::create(&gz_path)?;
    let mut encoder = GzEncoder::new(output, Compression::default());
    encoder.write_all(&contents)?;
    encoder.finish()?;

    // Remove the original file after successful compression
    fs::remove_file(path)?;

    Ok(())
}

/// Get the current log file path
pub fn get_log_file_path(dir_manager: &DirectoryManager) -> PathBuf {
    dir_manager.logs_dir().join("openframe.log")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use tempfile::tempdir;
    use tracing::{debug, error, info, trace, warn};

    #[test]
    fn test_structured_logging() -> std::io::Result<()> {
        let temp_dir = tempdir()?;
        let log_file = temp_dir.path().join("test.log");

        let json_layer = JsonLayer::new(log_file.clone())?;
        let subscriber = Registry::default().with(json_layer);

        tracing::subscriber::set_global_default(subscriber).expect("Failed to set subscriber");

        // Log messages with different levels and context
        error!(error = "test error", "Error message");
        warn!(user = "test_user", "Warning message");
        info!(request_id = 123, "Info message");
        debug!(status = "pending", "Debug message");
        trace!(correlation_id = "abc", "Trace message");

        // Read and verify log file contents
        let mut file = std::fs::File::open(log_file)?;
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;

        // Verify each log level appears in the file
        assert!(contents.contains(r#""level":"ERROR"#));
        assert!(contents.contains(r#""level":"WARN"#));
        assert!(contents.contains(r#""level":"INFO"#));
        assert!(contents.contains(r#""level":"DEBUG"#));
        assert!(contents.contains(r#""level":"TRACE"#));

        // Verify custom fields are included
        assert!(contents.contains(r#""error":"test error"#));
        assert!(contents.contains(r#""user":"test_user"#));
        assert!(contents.contains(r#""request_id":"123"#));
        assert!(contents.contains(r#""status":"pending"#));
        assert!(contents.contains(r#""correlation_id":"abc"#));

        Ok(())
    }
}
