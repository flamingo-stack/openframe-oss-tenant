use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UpdatePhase {
    Validating,
    Downloading,
    Extracting,
    PreparingUpdater,
    UpdaterLaunched,
    /// Legacy phase (old scripts stamp it pre-restart); not treated as proof of success.
    Completed,
    /// Boot marker matched; final verification is done by the agent after restart.
    Verifying,
    /// The updater restored the reserve binary.
    RolledBack,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateState {
    pub target_version: String,

    /// Current phase
    pub phase: UpdatePhase,

    /// Boots survived while this update was still unverified (crash-loop guard).
    #[serde(default)]
    pub boot_attempts: u32,

    #[serde(default)]
    pub started_at: Option<String>,
}

impl UpdateState {
    pub fn new(target_version: String) -> Self {
        Self {
            target_version,
            phase: UpdatePhase::Validating,
            boot_attempts: 0,
            started_at: Some(chrono::Utc::now().to_rfc3339()),
        }
    }

    pub fn set_phase(&mut self, phase: UpdatePhase) {
        self.phase = phase;
    }
}
