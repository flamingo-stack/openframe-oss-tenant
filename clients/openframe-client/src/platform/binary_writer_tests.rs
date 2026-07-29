use super::*;

#[test]
fn aside_path_appends_old_to_full_filename() {
    assert_eq!(
        aside_path(Path::new(r"C:\x\agent.exe")),
        PathBuf::from(r"C:\x\agent.exe.old")
    );
    assert_eq!(
        aside_path(Path::new("/x/agent")),
        PathBuf::from("/x/agent.old")
    );
}
