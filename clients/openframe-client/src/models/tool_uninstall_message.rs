use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolUninstallMessage {
    pub operation_id: String,
    pub tool_agent_id: String,
    #[serde(default)]
    pub tool_id: Option<String>,
    #[serde(default)]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UninstallStatus {
    Removed,
    NotInstalled,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolUninstallResult {
    pub operation_id: String,
    pub tool_agent_id: String,
    pub status: UninstallStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
