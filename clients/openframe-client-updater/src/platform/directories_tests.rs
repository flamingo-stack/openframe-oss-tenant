use super::*;

fn manager(root: &Path) -> DirectoryManager {
    DirectoryManager::with_custom_dirs(
        root.join("logs"),
        root.join("app"),
        root.join("secured"),
    )
}

#[test]
fn with_custom_dirs_exposes_the_paths() {
    let dir = tempfile::tempdir().unwrap();
    let dm = manager(dir.path());
    assert_eq!(dm.logs_dir(), dir.path().join("logs"));
    assert_eq!(dm.app_support_dir(), dir.path().join("app"));
    assert_eq!(dm.secured_dir(), dir.path().join("secured"));
}

#[test]
fn ensure_directories_creates_all_three() {
    let dir = tempfile::tempdir().unwrap();
    let dm = manager(dir.path());

    dm.ensure_directories().unwrap();

    assert!(dm.logs_dir().is_dir());
    assert!(dm.app_support_dir().is_dir());
    assert!(dm.secured_dir().is_dir());
}

#[test]
fn ensure_directories_leaves_no_write_probe_behind() {
    let dir = tempfile::tempdir().unwrap();
    let dm = manager(dir.path());
    dm.ensure_directories().unwrap();
    for d in [dm.logs_dir(), dm.app_support_dir(), dm.secured_dir()] {
        assert!(!d.join(".write_test").exists());
    }
}

// The secured directory must stay owner-only; the plain directories 0755.
#[cfg(unix)]
#[test]
fn secured_directory_is_owner_only() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempfile::tempdir().unwrap();
    let dm = manager(dir.path());
    dm.ensure_directories().unwrap();

    let mode = |p: &Path| fs::metadata(p).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode(dm.secured_dir()), 0o700);
    assert_eq!(mode(dm.logs_dir()), 0o755);
    assert_eq!(mode(dm.app_support_dir()), 0o755);
}

// Health checks run repeatedly — a second pass must keep (not widen) 0700.
#[cfg(unix)]
#[test]
fn repeated_health_checks_keep_secured_mode() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempfile::tempdir().unwrap();
    let dm = manager(dir.path());
    dm.ensure_directories().unwrap();
    dm.perform_health_check().unwrap();

    let mode = fs::metadata(dm.secured_dir()).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode, 0o700);
}
