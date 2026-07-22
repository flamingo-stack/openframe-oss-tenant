use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadConfiguration {
    pub os: String,
    pub file_name: String,
    #[serde(alias = "agentFileName", alias = "assetFileName")]
    pub target_file_name: String,
    pub link: String,
}

impl DownloadConfiguration {
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
