use serde::{Deserialize, Serialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolAgentUpdateMessage {
    pub tool_agent_id: String,
    pub version: String,
    pub download_configurations: Vec<DownloadConfiguration>,
}
