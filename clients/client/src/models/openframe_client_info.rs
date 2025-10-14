use serde::{Deserialize, Serialize};

/// Status of the OpenFrame client update.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ClientUpdateStatus {
    Current,
    Updating,
    Updated,
    Failed,
}

impl Default for ClientUpdateStatus {
    fn default() -> Self {
        ClientUpdateStatus::Current
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenFrameClientInfo {
    pub current_version: String,
    pub target_version: Option<String>,
    pub status: ClientUpdateStatus,
    pub binary_path: String,
    pub last_update_check: Option<String>,
    pub last_updated: Option<String>,
}

impl Default for OpenFrameClientInfo {
    fn default() -> Self {
        Self {
            current_version: String::new(),
            target_version: None,
            status: ClientUpdateStatus::default(),
            binary_path: String::new(),
            last_update_check: None,
            last_updated: None,
        }
    }
}
