use super::*;

#[test]
fn guard_removes_file_on_drop() {
    let path = std::env::temp_dir().join(temp_script_name("sh"));
    std::fs::write(&path, b"x").unwrap();
    assert!(path.exists());
    {
        let _guard = TempFileGuard { path: path.clone() };
    }
    assert!(!path.exists());
}

#[test]
fn names_are_unique() {
    assert_ne!(temp_script_name("ps1"), temp_script_name("ps1"));
}
