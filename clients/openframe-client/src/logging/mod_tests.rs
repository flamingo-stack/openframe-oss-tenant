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
