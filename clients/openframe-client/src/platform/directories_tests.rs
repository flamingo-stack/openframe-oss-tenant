use super::*;
use tempfile::tempdir;

#[test]
fn test_directory_creation() {
    let temp_dir = tempdir().unwrap();
    let logs_dir = temp_dir.path().join("logs");
    let app_dir = temp_dir.path().join("app");
    let secured_dir = temp_dir.path().join("secured");

    let manager =
        DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone(), secured_dir.clone());

    // Test directory creation
    assert!(manager.ensure_directories().is_ok());
    assert!(logs_dir.exists());
    assert!(app_dir.exists());
}

#[test]
fn test_directory_permissions() {
    let temp_dir = tempdir().unwrap();
    let logs_dir = temp_dir.path().join("logs");
    let app_dir = temp_dir.path().join("app");
    let secured_dir = temp_dir.path().join("secured");

    let manager =
        DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone(), secured_dir.clone());

    // Create directories first
    assert!(manager.ensure_directories().is_ok());

    // Test permission validation and fixing
    assert!(manager.validate_permissions().is_ok());

    // Test user directory creation
    let user_manager = DirectoryManager::with_user_logs_dir();
    if let Some(user_logs) = &user_manager.user_logs_dir {
        assert!(
            user_logs.to_string_lossy().contains("OpenFrame")
                || user_logs.to_string_lossy().contains("openframe")
        );
    }
}

#[test]
fn test_file_permissions() {
    let temp_dir = tempdir().unwrap();
    let logs_dir = temp_dir.path().join("logs");
    let app_dir = temp_dir.path().join("app");
    let secured_dir = temp_dir.path().join("secured");

    let manager =
        DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone(), secured_dir.clone());

    // Create directories first
    assert!(manager.ensure_directories().is_ok());

    // Create a test file in the logs directory
    let test_file = logs_dir.join("test.log");
    fs::write(&test_file, "test").unwrap();

    // Apply file permissions
    let file_perms = Permissions::file();
    assert!(file_perms.apply(&test_file).is_ok());

    // Verify file permissions
    #[cfg(unix)]
    {
        if unsafe { libc::geteuid() } == 0 {
            // Only run this check if we're root, otherwise it will fail
            let metadata = fs::metadata(&test_file).unwrap();
            assert_eq!(metadata.permissions().mode() & 0o777, 0o644);
        }
    }
}

#[test]
fn test_error_handling() {
    // Test with a non-existent directory
    let non_existent = PathBuf::from("/non_existent_dir_for_test");

    let manager = DirectoryManager::with_custom_dirs(
        non_existent.clone(),
        non_existent.clone(),
        non_existent.clone(),
    );

    // This should fail on validate because we can't create the directory
    #[cfg(unix)]
    if unsafe { libc::geteuid() } != 0 {
        // We expect this to fail if we're not root
        assert!(manager.validate_permissions().is_err());
    }
}

#[test]
fn test_user_logs_directory() {
    let manager = DirectoryManager::with_user_logs_dir();

    // Ensure the user logs directory exists
    assert!(manager.user_logs_dir.is_some());

    #[cfg(target_os = "macos")]
    {
        let user_logs = manager.user_logs_dir.unwrap();
        assert!(user_logs
            .to_string_lossy()
            .contains("Library/Logs/OpenFrame"));
    }

    #[cfg(target_os = "windows")]
    {
        let user_logs = manager.user_logs_dir.unwrap();
        assert!(user_logs.to_string_lossy().contains("OpenFrame\\Logs"));
    }

    #[cfg(target_os = "linux")]
    {
        let user_logs = manager.user_logs_dir.unwrap();
        assert!(user_logs
            .to_string_lossy()
            .contains(".local/share/openframe/logs"));
    }
}

#[test]
fn test_health_check() {
    let temp_dir = tempdir().unwrap();
    let logs_dir = temp_dir.path().join("logs");
    let app_dir = temp_dir.path().join("app");
    let secured_dir = temp_dir.path().join("secured");

    let manager =
        DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone(), secured_dir.clone());

    // Test health check
    assert!(manager.perform_health_check().is_ok());
    assert!(logs_dir.exists());
    assert!(app_dir.exists());

    // Intentionally corrupt permissions to test fixing
    #[cfg(unix)]
    {
        if unsafe { libc::geteuid() } == 0 {
            // Only run this check if we're root, otherwise it will fail
            use std::os::unix::fs::PermissionsExt;
            let bad_perms = fs::Permissions::from_mode(0o700);
            fs::set_permissions(&logs_dir, bad_perms).unwrap();

            // Health check should fix the permissions
            assert!(manager.perform_health_check().is_ok());

            // Verify permissions were fixed
            let metadata = fs::metadata(&logs_dir).unwrap();
            assert_eq!(metadata.permissions().mode() & 0o777, 0o755);
        }
    }
}

#[test]
fn test_write_permissions() {
    let temp_dir = tempdir().unwrap();
    let logs_dir = temp_dir.path().join("logs");
    let app_dir = temp_dir.path().join("app");
    let secured_dir = temp_dir.path().join("secured");

    let manager =
        DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone(), secured_dir.clone());

    // Create directories first
    assert!(manager.ensure_directories().is_ok());

    // Test write permissions
    assert!(manager.can_write_to_directory(&logs_dir));
    assert!(manager.can_write_to_directory(&app_dir));
}

#[test]
fn test_get_logs_directory() {
    let logs_dir = get_logs_directory();

    #[cfg(target_os = "macos")]
    assert_eq!(logs_dir, PathBuf::from("/Library/Logs/OpenFrame"));

    #[cfg(target_os = "linux")]
    assert_eq!(logs_dir, PathBuf::from("/var/log/openframe"));

    #[cfg(target_os = "windows")]
    {
        let program_data = std::env::var_os("ProgramData").unwrap_or_default();
        let expected = PathBuf::from(program_data).join("OpenFrame").join("logs");
        assert_eq!(logs_dir, expected);
    }
}

#[test]
fn test_get_app_support_directory() {
    let app_dir = get_app_support_directory();

    #[cfg(target_os = "macos")]
    assert_eq!(
        app_dir,
        PathBuf::from("/Library/Application Support/OpenFrame")
    );

    #[cfg(target_os = "linux")]
    assert_eq!(app_dir, PathBuf::from("/var/lib/openframe"));

    #[cfg(target_os = "windows")]
    {
        let program_data = std::env::var_os("ProgramData").unwrap_or_default();
        let expected = PathBuf::from(program_data).join("OpenFrame");
        assert_eq!(app_dir, expected);
    }
}

#[test]
fn test_get_secured_directory() {
    let secured_dir = get_secured_directory();

    #[cfg(target_os = "macos")]
    assert_eq!(
        secured_dir,
        PathBuf::from("/Library/Application Support/OpenFrame/secured")
    );

    #[cfg(target_os = "linux")]
    assert_eq!(secured_dir, PathBuf::from("/var/lib/openframe/secured"));

    #[cfg(target_os = "windows")]
    {
        let program_data = std::env::var_os("ProgramData").unwrap_or_default();
        let expected = PathBuf::from(program_data)
            .join("OpenFrame")
            .join("secured");
        assert_eq!(secured_dir, expected);
    }
}
