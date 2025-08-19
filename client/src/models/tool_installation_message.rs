use serde::{Serialize, Deserialize};

#[serde(rename_all = "camelCase")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolInstallationMessage {
    pub tool_id: String,
    pub version: String,
}