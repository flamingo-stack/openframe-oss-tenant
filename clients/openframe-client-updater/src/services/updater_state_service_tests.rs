use super::*;

fn service(root: &std::path::Path) -> UpdaterStateService {
    let dm = DirectoryManager::with_custom_dirs(
        root.join("logs"),
        root.join("app"),
        root.join("secured"),
    );
    UpdaterStateService::new(&dm)
}

#[test]
fn load_returns_none_when_no_state_file() {
    let dir = tempfile::tempdir().unwrap();
    assert!(service(dir.path()).load().unwrap().is_none());
}

#[test]
fn save_then_load_round_trips() {
    let dir = tempfile::tempdir().unwrap();
    let svc = service(dir.path());

    let mut state = UpdaterState::new("1.2.3".to_string());
    state.phase = UpdaterPhase::ReplacingBinary;
    state.backup_path = Some("/tmp/backup".to_string());
    svc.save(&state).unwrap();

    let loaded = svc.load().unwrap().unwrap();
    assert_eq!(loaded.target_version, "1.2.3");
    assert_eq!(loaded.phase, UpdaterPhase::ReplacingBinary);
    assert_eq!(loaded.backup_path.as_deref(), Some("/tmp/backup"));
}

// Crash-safety: the state is written to a temp file and renamed into place,
// and the temp file must not linger.
#[test]
fn save_leaves_no_temp_file() {
    let dir = tempfile::tempdir().unwrap();
    let svc = service(dir.path());
    svc.save(&UpdaterState::new("1.0.0".to_string())).unwrap();

    let secured = dir.path().join("secured");
    let names: Vec<String> = std::fs::read_dir(&secured)
        .unwrap()
        .map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(names, vec!["updater_state.json".to_string()]);
}

#[test]
fn load_fails_on_corrupt_state() {
    let dir = tempfile::tempdir().unwrap();
    let svc = service(dir.path());
    std::fs::create_dir_all(dir.path().join("secured")).unwrap();
    std::fs::write(svc.state_file_path(), b"{not json").unwrap();
    assert!(svc.load().is_err());
}

#[test]
fn clear_removes_the_file_and_tolerates_absence() {
    let dir = tempfile::tempdir().unwrap();
    let svc = service(dir.path());

    svc.clear().unwrap();

    svc.save(&UpdaterState::new("1.0.0".to_string())).unwrap();
    svc.clear().unwrap();
    assert!(svc.load().unwrap().is_none());
}

#[test]
fn transition_updates_phase_and_persists() {
    let dir = tempfile::tempdir().unwrap();
    let svc = service(dir.path());

    let mut state = UpdaterState::new("1.0.0".to_string());
    svc.transition(&mut state, UpdaterPhase::Downloading).unwrap();

    assert_eq!(state.phase, UpdaterPhase::Downloading);
    assert_eq!(svc.load().unwrap().unwrap().phase, UpdaterPhase::Downloading);
}

#[test]
fn cleanup_legacy_state_removes_old_client_file() {
    let dir = tempfile::tempdir().unwrap();
    let svc = service(dir.path());
    let secured = dir.path().join("secured");
    std::fs::create_dir_all(&secured).unwrap();
    let legacy = secured.join("update_state.json");
    std::fs::write(&legacy, b"{}").unwrap();

    svc.cleanup_legacy_state();
    assert!(!legacy.exists());
}
