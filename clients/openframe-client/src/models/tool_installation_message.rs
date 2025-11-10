use serde::{Serialize, Deserialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ToolInstallationMessage {
    pub tool_agent_id: String,
    pub tool_id: String,
    pub tool_type: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_type: Option<SessionType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_configurations: Option<Vec<DownloadConfiguration>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub installation_command_args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uninstallation_command_args: Option<Vec<String>>,
    pub run_command_args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_agent_id_command_args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assets: Option<Vec<Asset>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum SessionType {
    #[serde(rename = "SERVICE")]
    Service,
    #[serde(rename = "CONSOLE")]
    Console,
    #[serde(rename = "USER")]
    User,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub local_filename: String,
    pub source: AssetSource,
    pub path: Option<String>,
    #[serde(default)]
    pub executable: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AssetSource {
    #[serde(rename = "ARTIFACTORY")]
    Artifactory,
    #[serde(rename = "TOOL_API")]
    ToolApi,
}