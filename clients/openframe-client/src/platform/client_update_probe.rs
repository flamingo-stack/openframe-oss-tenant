use crate::platform::directories::get_secured_directory;

pub const UPDATER_TOOL_AGENT_ID: &str = "openframe-client-updater";

const UPDATER_STATE_FILE_NAME: &str = "updater_state.json";
const UPDATER_STATE_STALE_SECS: u64 = 30 * 60;
const IN_FLIGHT_UPDATER_PHASES: [&str; 8] = [
    "downloading",
    "verifying",
    "stopping_service",
    "replacing_binary",
    "starting_service",
    "verifying_boot",
    "observing",
    "rolling_back",
];

/// Determines whether a recent client update is currently in an in-flight phase.
///
/// The updater state file must contain a recognized phase and have been modified
/// within the last 30 minutes. Returns `None` when the state file is unavailable,
/// invalid, stale, or contains a terminal or unknown phase.
///
/// # Examples
///
/// ```
/// if let Some(phase) = in_flight_client_update_phase() {
///     println!("Client update in progress: {phase}");
/// }
/// ```
///
/// Returns the current in-flight phase, or `None` when no active update is detected.
pub fn in_flight_client_update_phase() -> Option<String> {
    let path = get_secured_directory().join(UPDATER_STATE_FILE_NAME);
    let modified = std::fs::metadata(&path).ok()?.modified().ok()?;
    if let Ok(age) = modified.elapsed() {
        if age.as_secs() > UPDATER_STATE_STALE_SECS {
            return None;
        }
    }
    let raw = std::fs::read_to_string(&path).ok()?;
    let state: serde_json::Value = serde_json::from_str(&raw).ok()?;
    let phase = state.get("phase")?.as_str()?;
    IN_FLIGHT_UPDATER_PHASES.contains(&phase).then(|| phase.to_string())
}
