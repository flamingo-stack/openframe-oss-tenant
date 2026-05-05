use serde::{Deserialize, Serialize};

use super::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientUpdateMessage {
    pub version: String,
    pub download_configurations: Vec<DownloadConfiguration>,
}
