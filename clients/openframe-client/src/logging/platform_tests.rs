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
