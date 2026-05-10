use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgressMessage {
    pub phase: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rolled_back: Option<bool>,
}

impl UpdateProgressMessage {
    pub fn new(phase: impl Into<String>, version: impl Into<String>) -> Self {
        Self {
            phase: phase.into(),
            version: version.into(),
            reason: None,
            rolled_back: None,
        }
    }

    pub fn with_failure(phase: impl Into<String>, version: impl Into<String>, reason: impl Into<String>, rolled_back: bool) -> Self {
        Self {
            phase: phase.into(),
            version: version.into(),
            reason: Some(reason.into()),
            rolled_back: Some(rolled_back),
        }
    }
}
