use serde::{Deserialize, Serialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetUpdateMessage {
    pub tool_agent_id: String,
    pub asset_id: String,
    pub version: String,
    #[serde(default)]
    pub executable: bool,
    pub download_configurations: Vec<DownloadConfiguration>,
}
