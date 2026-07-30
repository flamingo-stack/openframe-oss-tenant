use super::*;

// openframe-client's ordering guard (platform/client_update_probe.rs) parses
// updater_state.json and matches these exact strings — a rename here silently
// disables the guard on the client side.
#[test]
fn phase_serde_strings_match_client_probe_contract() {
    let expected = [
        (UpdaterPhase::Idle, "idle"),
        (UpdaterPhase::Downloading, "downloading"),
        (UpdaterPhase::Verifying, "verifying"),
        (UpdaterPhase::StoppingService, "stopping_service"),
        (UpdaterPhase::ReplacingBinary, "replacing_binary"),
        (UpdaterPhase::StartingService, "starting_service"),
        (UpdaterPhase::VerifyingBoot, "verifying_boot"),
        (UpdaterPhase::Observing, "observing"),
        (UpdaterPhase::Completed, "completed"),
        (UpdaterPhase::Failed, "failed"),
        (UpdaterPhase::RollingBack, "rolling_back"),
        (UpdaterPhase::RolledBack, "rolled_back"),
    ];
    for (phase, s) in expected {
        assert_eq!(serde_json::to_string(&phase).unwrap(), format!("\"{}\"", s));
        assert_eq!(phase.to_string(), s);
        let parsed: UpdaterPhase = serde_json::from_str(&format!("\"{}\"", s)).unwrap();
        assert_eq!(parsed, phase);
    }
}

#[test]
fn only_completed_failed_and_rolled_back_are_terminal() {
    let terminal = [
        UpdaterPhase::Completed,
        UpdaterPhase::Failed,
        UpdaterPhase::RolledBack,
    ];
    let non_terminal = [
        UpdaterPhase::Idle,
        UpdaterPhase::Downloading,
        UpdaterPhase::Verifying,
        UpdaterPhase::StoppingService,
        UpdaterPhase::ReplacingBinary,
        UpdaterPhase::StartingService,
        UpdaterPhase::VerifyingBoot,
        UpdaterPhase::Observing,
        UpdaterPhase::RollingBack,
    ];
    for phase in terminal {
        let mut state = UpdaterState::new("1.0.0".to_string());
        state.phase = phase;
        assert!(state.is_terminal());
    }
    for phase in non_terminal {
        let mut state = UpdaterState::new("1.0.0".to_string());
        state.phase = phase;
        assert!(!state.is_terminal());
    }
}

#[test]
fn new_state_starts_idle_and_empty() {
    let state = UpdaterState::new("1.2.3".to_string());
    assert_eq!(state.target_version, "1.2.3");
    assert_eq!(state.phase, UpdaterPhase::Idle);
    assert!(state.backup_path.is_none());
    assert!(state.downloaded_binary_path.is_none());
    assert!(state.failure_reason.is_none());
    assert!(!state.started_at.is_empty());
}

#[test]
fn state_round_trips_through_json() {
    let mut state = UpdaterState::new("2.0.0".to_string());
    state.phase = UpdaterPhase::ReplacingBinary;
    state.backup_path = Some("/tmp/openframe-client.backup".to_string());
    state.downloaded_binary_path = Some("/tmp/new-binary".to_string());
    state.failure_reason = Some("boom".to_string());

    let json = serde_json::to_string(&state).unwrap();
    let restored: UpdaterState = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.target_version, state.target_version);
    assert_eq!(restored.phase, state.phase);
    assert_eq!(restored.backup_path, state.backup_path);
    assert_eq!(restored.downloaded_binary_path, state.downloaded_binary_path);
    assert_eq!(restored.failure_reason, state.failure_reason);
    assert_eq!(restored.started_at, state.started_at);
}
