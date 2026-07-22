use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum UpdaterPhase {
    Idle,
    Downloading,
    Verifying,
    StoppingService,
    ReplacingBinary,
    StartingService,
    Completed,
    Failed,
    RollingBack,
    RolledBack,
}

impl std::fmt::Display for UpdaterPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            UpdaterPhase::Idle => "idle",
            UpdaterPhase::Downloading => "downloading",
            UpdaterPhase::Verifying => "verifying",
            UpdaterPhase::StoppingService => "stopping_service",
            UpdaterPhase::ReplacingBinary => "replacing_binary",
            UpdaterPhase::StartingService => "starting_service",
            UpdaterPhase::Completed => "completed",
            UpdaterPhase::Failed => "failed",
            UpdaterPhase::RollingBack => "rolling_back",
            UpdaterPhase::RolledBack => "rolled_back",
        };
        write!(f, "{}", s)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdaterState {
    pub target_version: String,
    pub phase: UpdaterPhase,
    pub backup_path: Option<String>,
    pub downloaded_binary_path: Option<String>,
    pub started_at: String,
    pub failure_reason: Option<String>,
}

impl UpdaterState {
    pub fn new(target_version: String) -> Self {
        Self {
            target_version,
            phase: UpdaterPhase::Idle,
            backup_path: None,
            downloaded_binary_path: None,
            started_at: chrono::Utc::now().to_rfc3339(),
            failure_reason: None,
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self.phase, UpdaterPhase::Completed | UpdaterPhase::Failed | UpdaterPhase::RolledBack)
    }
}
