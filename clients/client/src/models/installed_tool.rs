use serde::{Deserialize, Serialize};

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
    pub run_command_args: Vec<String>,
    pub tool_agent_id_command_args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uninstallation_command_args: Option<Vec<String>>,
    pub status: ToolStatus,
}

impl Default for InstalledTool {
    fn default() -> Self {
        Self {
            tool_agent_id: String::new(),
            tool_id: String::new(),
            tool_type: String::new(),
            version: String::new(),
            run_command_args: Vec::new(),
            status: ToolStatus::default(),
            tool_agent_id_command_args: Vec::new(),
            uninstallation_command_args: None,
        }
    }
}
