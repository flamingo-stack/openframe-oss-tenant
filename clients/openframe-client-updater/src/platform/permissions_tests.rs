use super::*;

// The secured directory holds shared_token.enc; the client creates it 0700 and
// the updater's health check must never widen that.
#[test]
fn preset_modes() {
    assert_eq!(Permissions::directory().mode, 0o755);
    assert_eq!(Permissions::secured_directory().mode, 0o700);
    assert_eq!(Permissions::file().mode, 0o644);
}

#[cfg(unix)]
#[test]
fn apply_sets_unix_mode() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("secured");
    fs::create_dir(&path).unwrap();

    Permissions::secured_directory().apply(&path).unwrap();
    assert_eq!(
        fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o700
    );

    Permissions::directory().apply(&path).unwrap();
    assert_eq!(
        fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o755
    );
}

#[cfg(not(unix))]
#[test]
fn apply_clears_readonly_for_writable_modes() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("state.json");
    fs::write(&path, b"x").unwrap();

    let mut perms = fs::metadata(&path).unwrap().permissions();
    perms.set_readonly(true);
    fs::set_permissions(&path, perms).unwrap();

    Permissions::file().apply(&path).unwrap();
    assert!(!fs::metadata(&path).unwrap().permissions().readonly());
}

#[cfg(not(unix))]
#[test]
fn apply_on_missing_path_is_a_no_op() {
    let dir = tempfile::tempdir().unwrap();
    assert!(Permissions::file().apply(&dir.path().join("missing")).is_ok());
}
