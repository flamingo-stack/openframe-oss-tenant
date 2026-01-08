use serde::{Deserialize, Serialize};
use super::download_configuration::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetDownloadConfiguration {
    pub os: String,
    pub file_name: String,
    pub asset_file_name: String,
    pub link: String,
}

impl AssetDownloadConfiguration {
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

    pub fn to_download_configuration(&self) -> DownloadConfiguration {
        DownloadConfiguration {
            os: self.os.clone(),
            file_name: self.file_name.clone(),
            agent_file_name: self.asset_file_name.clone(),
            link: self.link.clone(),
        }
    }
}
