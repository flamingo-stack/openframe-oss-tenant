use super::*;
use std::os::unix::fs::PermissionsExt;

#[test]
fn atomic_write_sets_644_and_self_heals() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("token.enc");

    atomic_write(&path, b"first").unwrap();
    assert_eq!(
        std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o644
    );

    // A pre-existing owner-only file must be corrected on the next write, not preserved.
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
    atomic_write(&path, b"second").unwrap();
    assert_eq!(
        std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
        0o644
    );
    assert_eq!(std::fs::read(&path).unwrap(), b"second");
}
