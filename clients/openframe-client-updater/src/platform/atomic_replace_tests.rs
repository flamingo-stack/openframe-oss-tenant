use super::*;

fn read(path: &Path) -> Vec<u8> {
    std::fs::read(path).unwrap()
}

#[test]
fn write_temp_lands_next_to_target_with_content() {
    let dir = tempfile::tempdir().unwrap();
    let target = dir.path().join("openframe-client");

    let temp = write_temp(b"new-binary", &target).unwrap();

    assert_eq!(temp.parent().unwrap(), dir.path());
    let name = temp.file_name().unwrap().to_string_lossy().to_string();
    assert!(name.starts_with(".openframe-client-update-"));
    assert!(name.ends_with(".tmp"));
    assert_eq!(read(&temp), b"new-binary");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = std::fs::metadata(&temp).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o755, "temp binary must be executable");
    }
}

#[test]
fn write_temp_fails_without_parent_directory() {
    assert!(write_temp(b"x", Path::new("/")).is_err());
}

#[test]
fn replace_backs_up_old_and_activates_new() {
    let dir = tempfile::tempdir().unwrap();
    let target = dir.path().join("openframe-client");
    let new_binary = dir.path().join("incoming");
    std::fs::write(&target, b"old").unwrap();
    std::fs::write(&new_binary, b"new").unwrap();

    let backup = replace(&target, &new_binary).unwrap();

    assert_eq!(read(&target), b"new");
    assert_eq!(read(&backup), b"old");
    assert!(!new_binary.exists(), "new binary is renamed, not copied");
    assert!(backup
        .file_name()
        .unwrap()
        .to_string_lossy()
        .starts_with("openframe-client.backup."));
}

#[test]
fn replace_restores_backup_when_activation_fails() {
    let dir = tempfile::tempdir().unwrap();
    let target = dir.path().join("openframe-client");
    std::fs::write(&target, b"old").unwrap();
    let missing_new = dir.path().join("does-not-exist");

    assert!(replace(&target, &missing_new).is_err());
    assert_eq!(read(&target), b"old", "old binary must be back in place");
}

#[test]
fn restore_consumes_the_backup() {
    let dir = tempfile::tempdir().unwrap();
    let target = dir.path().join("openframe-client");
    let backup = dir.path().join("openframe-client.backup.1");
    std::fs::write(&target, b"broken").unwrap();
    std::fs::write(&backup, b"good").unwrap();

    restore(&backup, &target).unwrap();

    assert_eq!(read(&target), b"good");
    assert!(!backup.exists());
}

#[test]
fn restore_copy_preserves_the_source() {
    let dir = tempfile::tempdir().unwrap();
    let target = dir.path().join("openframe-client");
    let reserve = dir.path().join("openframe-client.lkg");
    std::fs::write(&target, b"broken").unwrap();
    std::fs::write(&reserve, b"known-good").unwrap();

    restore_copy(&reserve, &target).unwrap();

    assert_eq!(read(&target), b"known-good");
    assert_eq!(read(&reserve), b"known-good", "reserve must survive");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = std::fs::metadata(&target).unwrap().permissions().mode() & 0o777;
        assert_eq!(mode, 0o755, "restored binary must be executable");
    }
}
