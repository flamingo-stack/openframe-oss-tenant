use serde::{Serialize, Deserialize};

#[serde(rename_all = "camelCase")]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ToolInstallationMessage {
    pub tool_id: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installation_command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub run_command: Option<String>,
}