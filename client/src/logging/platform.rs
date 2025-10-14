use std::fs;
use std::fs::OpenOptions;
use std::path::PathBuf;
use std::process::Command;

/// Returns the platform-specific log directory path
pub fn get_log_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
        let mut path = PathBuf::from(program_data);
        path.push("OpenFrame");
        path.push("logs");
        path
    }

    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/Library/Logs/OpenFrame")
    }

    #[cfg(target_os = "linux")]
    {
        PathBuf::from("/var/log/openframe")
    }
}

/// Ensures the log directory exists and has correct permissions
pub fn ensure_log_directory() -> Result<PathBuf, std::io::Error> {
    let log_dir = get_log_directory();

    // Create parent directories if they don't exist
    if let Some(parent) = log_dir.parent() {
        fs::create_dir_all(parent)?;
    }

    // Create the OpenFrame log directory if it doesn't exist
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir)?;

        #[cfg(target_os = "macos")]
        {
            // On macOS, we need root:admin ownership and 775 permissions
            // These commands will fail gracefully if not run as root
            let _ = Command::new("chown")
                .args(["-R", "root:admin", log_dir.to_str().unwrap()])
                .status();
            let _ = Command::new("chmod")
                .args(["-R", "775", log_dir.to_str().unwrap()])
                .status();
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Set directory permissions to 755 (rwxr-xr-x) on other Unix systems
            use std::os::unix::fs::PermissionsExt;
            let permissions = fs::Permissions::from_mode(0o755);
            fs::set_permissions(&log_dir, permissions)?;
        }
    }

    // Verify we can write to the directory
    if !can_write_to_directory(&log_dir) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            format!(
                "Insufficient permissions to write to log directory: {}",
                log_dir.display()
            ),
        ));
    }

    Ok(log_dir)
}

fn can_write_to_directory(path: &PathBuf) -> bool {
    // Try to create a temporary file in the directory
    let temp_file = path.join(".write_test");
    let result = OpenOptions::new().write(true).create(true).open(&temp_file);

    // Clean up the test file if it was created
    if temp_file.exists() {
        let _ = fs::remove_file(&temp_file);
    }

    result.is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_log_directory() {
        let log_dir = get_log_directory();

        #[cfg(target_os = "windows")]
        assert!(log_dir.to_string_lossy().contains("OpenFrame\\logs"));

        #[cfg(target_os = "macos")]
        assert_eq!(log_dir.to_string_lossy(), "/Library/Logs/OpenFrame");

        #[cfg(target_os = "linux")]
        assert_eq!(log_dir.to_string_lossy(), "/var/log/openframe");
    }
}
