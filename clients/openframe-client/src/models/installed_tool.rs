use serde::{Deserialize, Serialize};
use crate::models::SessionType;

/// Installation status of the tool on the endpoint.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ToolStatus {
    Installed,
}

impl Default for ToolStatus {
    fn default() -> Self {
        ToolStatus::Installed
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledTool {
    pub tool_agent_id: String,
    pub tool_id: String,
    pub tool_type: String,
    pub version: String,
    pub session_type: SessionType,
    pub run_command_args: Vec<String>,
    pub tool_agent_id_command_args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uninstallation_command_args: Option<Vec<String>>,
    pub status: ToolStatus,
    /// Path to executable relative to tool folder
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executable_path: Option<String>,
}

impl Default for InstalledTool {
    fn default() -> Self {
        Self {
            tool_agent_id: String::new(),
            tool_id: String::new(),
            tool_type: String::new(),
            version: String::new(),
            session_type: SessionType::Service,
            run_command_args: Vec::new(),
            status: ToolStatus::default(),
            tool_agent_id_command_args: Vec::new(),
            uninstallation_command_args: None,
            executable_path: None,
        }
    }
}
