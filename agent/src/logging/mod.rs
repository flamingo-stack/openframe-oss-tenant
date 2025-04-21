pub mod metrics;
pub mod platform;
pub mod shipping;

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

        let log_entry = LogEntry {
            timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Micros, true),
            level,
            target: event.metadata().target().to_string(),
            module_path: event.metadata().module_path().map(|s| s.to_string()),
            file: event.metadata().file().map(|s| s.to_string()),
            line: event.metadata().line(),
            thread: format!("{:?}", std::thread::current().id()),
            message: visitor.message.unwrap_or_default(),
            error: visitor.error,
            context: serde_json::Value::Object(visitor.fields),
        };

        if let Ok(json) = serde_json::to_string(&log_entry) {
            if let Ok(mut file) = self.writer.lock() {
                let _ = writeln!(file, "{}", json);
            }
        }
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
            self.fields.insert(
                field.name().to_string(),
                serde_json::Value::String(value.to_string()),
            );
        }
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        self.fields.insert(
            field.name().to_string(),
            serde_json::Value::String(format!("{:?}", value)),
        );
    }
}

/// Initialize the logging system with the platform-specific path
pub fn init(log_endpoint: Option<String>, agent_id: Option<String>) -> std::io::Result<()> {
    // Ensure log directory exists with correct permissions
    let log_dir = platform::ensure_log_directory()?;

    // Create the JSON layer for structured logging
    let json_layer = JsonLayer::new(get_log_file_path())?;

    // Create a console layer for development
    let console_layer = fmt::layer()
        .with_target(true)
        .with_thread_ids(true)
        .with_line_number(true)
        .with_file(true)
        .with_timer(SystemTime::default());

    // Create metrics layer
    let (metrics_layer, metrics_store) = MetricsLayer::new();

    // Set up the subscriber with both layers
    let subscriber = Registry::default()
        .with(EnvFilter::from_default_env())
        .with(json_layer)
        .with(console_layer)
        .with(metrics_layer);

    // Set the subscriber as the default
    tracing::subscriber::set_global_default(subscriber)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    // Store metrics for later access
    METRICS_STORE.get_or_init(|| metrics_store);

    // Start the background compression task
    std::thread::spawn(|| {
        compress_old_logs();
    });

    Ok(())
}

// Static storage for metrics
static METRICS_STORE: std::sync::OnceLock<Arc<RwLock<MetricsStore>>> = std::sync::OnceLock::new();

/// Get access to the metrics store
pub fn get_metrics_store() -> Option<Arc<RwLock<MetricsStore>>> {
    METRICS_STORE.get().cloned()
}

/// Compress old log files that haven't been compressed yet
fn compress_old_logs() {
    use std::time::{SystemTime, UNIX_EPOCH};

    loop {
        if let Ok(log_dir) = platform::get_log_directory().canonicalize() {
            if let Ok(entries) = fs::read_dir(&log_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        // Only process .log files that aren't today's log
                        if ext == "log" {
                            let filename = path.file_name().unwrap().to_string_lossy();
                            if !filename.ends_with(".gz") && !is_current_log(&filename) {
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
pub fn get_log_file_path() -> PathBuf {
    let mut path = platform::get_log_directory();
    path.push("openframe.log");
    path
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
