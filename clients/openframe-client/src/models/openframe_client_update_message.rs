use serde::{Deserialize, Serialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFrameClientUpdateMessage {
    pub version: String,
    pub download_configurations: Vec<DownloadConfiguration>,
}
