use serde::{Deserialize, Serialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolAgentUpdateMessage {
    pub tool_agent_id: String,
    pub version: String,
    pub download_configurations: Vec<DownloadConfiguration>,
    #[serde(default)]
    pub asset: Option<AssetUpdate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetUpdate {
    pub asset_id: String,
    pub version: String,
    #[serde(default)]
    pub executable: bool,
    pub download_configurations: Vec<DownloadConfiguration>,
}
