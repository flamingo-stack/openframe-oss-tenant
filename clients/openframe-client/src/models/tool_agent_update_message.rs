use serde::{Deserialize, Serialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolAgentUpdateMessage {
    pub tool_agent_id: String,
    pub version: String,
    pub download_configurations: Vec<DownloadConfiguration>,
    pub assets: Option<Vec<AssetUpdate>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetUpdate {
    pub asset_id: String,
    pub version: Option<String>,
    #[serde(default)]
    pub executable: bool,
    pub download_configurations: Option<Vec<DownloadConfiguration>>,
}
