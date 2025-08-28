use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolInstallationMessage {
    pub tool_id: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installation_command_args: Option<Vec<String>>,
    pub run_command_args: Vec<String>,
    pub assets: Vec<Asset>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Asset {
    pub id: String,
}