use super::*;

struct Setup {
    _dir: tempfile::TempDir,
    svc: LastKnownGoodService,
    client_exe: PathBuf,
    secured: PathBuf,
}

fn setup() -> Setup {
    let dir = tempfile::tempdir().unwrap();
    let secured = dir.path().join("secured");
    let bin_dir = dir.path().join("bin");
    fs::create_dir_all(&secured).unwrap();
    fs::create_dir_all(&bin_dir).unwrap();

    let client_exe = bin_dir.join("openframe-client");
    fs::write(&client_exe, b"binary-v1").unwrap();

    let dm = DirectoryManager::with_custom_dirs(
        dir.path().join("logs"),
        dir.path().to_path_buf(),
        secured.clone(),
    );
    let svc = LastKnownGoodService::new(&dm, client_exe.clone());
    Setup {
        _dir: dir,
        svc,
        client_exe,
        secured,
    }
}

#[test]
fn anchor_is_none_before_first_promotion() {
    let s = setup();
    assert!(s.svc.load_anchor().unwrap().is_none());
}

#[test]
fn reserve_path_appends_lkg_to_the_full_binary_name() {
    let s = setup();
    assert_eq!(
        s.svc.reserve_path().file_name().unwrap().to_string_lossy(),
        "openframe-client.lkg"
    );
}

#[test]
fn promote_writes_anchor_and_reserve_copy() {
    let s = setup();
    s.svc.promote("1.2.3").unwrap();

    assert_eq!(s.svc.load_anchor().unwrap().as_deref(), Some("1.2.3"));
    assert_eq!(fs::read(s.svc.reserve_path()).unwrap(), b"binary-v1");
    assert!(
        s.client_exe.exists(),
        "promotion copies, it must not consume the client binary"
    );
}

#[test]
fn promote_refreshes_reserve_from_current_binary() {
    let s = setup();
    s.svc.promote("1.0.0").unwrap();

    fs::write(&s.client_exe, b"binary-v2").unwrap();
    s.svc.promote("2.0.0").unwrap();

    assert_eq!(s.svc.load_anchor().unwrap().as_deref(), Some("2.0.0"));
    assert_eq!(fs::read(s.svc.reserve_path()).unwrap(), b"binary-v2");
}

#[test]
fn promote_fails_when_client_binary_is_missing() {
    let s = setup();
    fs::remove_file(&s.client_exe).unwrap();
    assert!(s.svc.promote("1.0.0").is_err());
    assert!(s.svc.load_anchor().unwrap().is_none(), "anchor must not move");
}

#[test]
fn boot_marker_version_trims_and_rejects_empty() {
    let s = setup();
    assert!(s.svc.boot_marker_version().is_none());

    fs::write(s.secured.join("boot.marker"), b"  1.2.3\n").unwrap();
    assert_eq!(s.svc.boot_marker_version().as_deref(), Some("1.2.3"));

    fs::write(s.secured.join("boot.marker"), b"  \n").unwrap();
    assert!(s.svc.boot_marker_version().is_none());
}

#[test]
fn boot_marker_mtime_tracks_the_file() {
    let s = setup();
    assert!(s.svc.boot_marker_mtime().is_none());
    fs::write(s.secured.join("boot.marker"), b"1.0.0").unwrap();
    assert!(s.svc.boot_marker_mtime().is_some());
}

#[test]
fn clear_boot_marker_removes_and_tolerates_absence() {
    let s = setup();
    s.svc.clear_boot_marker().unwrap();

    fs::write(s.secured.join("boot.marker"), b"1.0.0").unwrap();
    s.svc.clear_boot_marker().unwrap();
    assert!(s.svc.boot_marker_version().is_none());
}
