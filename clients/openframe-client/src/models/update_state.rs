use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UpdatePhase {
    Validating,
    Downloading,
    Extracting,
    PreparingUpdater,
    UpdaterLaunched,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateState {
    pub target_version: String,

    /// Current phase
    pub phase: UpdatePhase,
}

impl UpdateState {
    pub fn new(target_version: String) -> Self {
        Self {
            target_version,
            phase: UpdatePhase::Validating,
        }
    }

    pub fn set_phase(&mut self, phase: UpdatePhase) {
        self.phase = phase;
    }
}
