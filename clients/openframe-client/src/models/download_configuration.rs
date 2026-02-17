use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InstallationType {
    #[default]
    Standard,
    GuiApp,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadConfiguration {
    pub os: String,
    pub file_name: String,
    #[serde(alias = "agentFileName", alias = "assetFileName")]
    pub target_file_name: String,
    pub link: String,
    #[serde(default)]
    pub installation_type: InstallationType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bundle_id: Option<String>,
}

impl DownloadConfiguration {
    /// Returns true if agent_file_name is a path (requires extracting entire archive).
    pub fn is_folder_extraction(&self) -> bool {
        Path::new(&self.target_file_name).components().count() > 1
    }

    /// Checks if this configuration matches the current OS
    pub fn matches_current_os(&self) -> bool {
        let current_os = if cfg!(target_os = "windows") {
            "windows"
        } else if cfg!(target_os = "macos") {
            "macos"
        } else if cfg!(target_os = "linux") {
            "linux"
        } else {
            return false;
        };
        
        self.os.eq_ignore_ascii_case(current_os)
    }
}

