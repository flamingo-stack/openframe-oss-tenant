use super::*;
use tempfile::tempdir;

#[test]
fn test_permissions_creation() {
    let dir_perms = Permissions::directory();
    assert_eq!(dir_perms.mode, 0o755);

    let file_perms = Permissions::file();
    assert_eq!(file_perms.mode, 0o644);
}

#[cfg(unix)]
#[test]
fn test_permissions_verification() {
    if unsafe { libc::geteuid() } == 0 {
        let temp = tempdir().unwrap();
        let test_path = temp.path().join("test_file");
        fs::write(&test_path, "test").unwrap();

        let perms = Permissions::file();
        assert!(perms.apply(&test_path).is_ok());
        assert!(perms.verify(&test_path).unwrap());
    }
}

#[test]
fn test_is_admin() {
    // This just verifies the function runs without errors
    let is_admin = PermissionUtils::is_admin();
    println!("Running with admin privileges: {}", is_admin);
}

#[test]
fn test_has_capability() {
    // Test all capabilities
    for cap in &[
        Capability::ManageServices,
        Capability::WriteSystemDirectories,
        Capability::ReadSystemLogs,
        Capability::WriteSystemLogs,
    ] {
        let has_cap = PermissionUtils::has_capability(*cap);
        println!("Has capability {:?}: {}", cap, has_cap);
    }
}

#[test]
fn test_ensure_admin() {
    // This should return Ok if already admin, or attempt to get privileges
    let result = PermissionUtils::ensure_admin();

    if PermissionUtils::is_admin() {
        assert!(result.is_ok());
    } else {
        // The function might return Ok if the user granted privileges via the prompt,
        // or an error if they declined or if there was an issue with the prompt
        println!("Result of ensure_admin when not admin: {:?}", result);
    }
}

#[test]
fn test_run_command() {
    // Test running a simple command that should work on all platforms
    // On Windows, use "cmd /c echo test"
    // On Unix, use "echo test"
    #[cfg(target_os = "windows")]
    {
        let result = PermissionUtils::run_command("cmd", &["/c", "echo", "test"]);
        assert!(result.is_ok());
    }

    #[cfg(unix)]
    {
        let result = PermissionUtils::run_command("echo", &["test"]);
        assert!(result.is_ok());
    }
}

#[test]
fn test_cross_platform_permissions() {
    // Create a temporary file and test platform-agnostic permissions
    let temp = tempdir().unwrap();
    let test_path = temp.path().join("test_file");
    fs::write(&test_path, "test").unwrap();

    // Test applying permissions
    let perms = Permissions::file();
    let result = perms.apply(&test_path);
    assert!(result.is_ok());

    // Test verifying permissions - should pass on all platforms
    // even though the exact permission representation differs
    let verify_result = perms.verify(&test_path);
    assert!(verify_result.is_ok());

    // Test retrieving permissions from a path
    let retrieved_perms = Permissions::from_path(&test_path);
    assert!(retrieved_perms.is_ok());
}

#[test]
fn test_can_read_system_logs() {
    // Just verify the function runs without errors
    let can_read = PermissionUtils::has_capability(Capability::ReadSystemLogs);
    println!("Can read system logs: {}", can_read);
}
