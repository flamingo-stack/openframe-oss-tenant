use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InstallationType {
    #[default]
    Standard,
    GuiApp,
    Service,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub service_name: Option<String>,
}

/// Hardcoded test version for download links (set to None to disable)
const TEST_VERSION_OVERRIDE: Option<&str> = Some("9.9.9");

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

    /// Returns the download link, optionally with version replaced for testing.
    /// If TEST_VERSION_OVERRIDE is set, replaces the version in GitHub download links.
    /// Example: .../releases/download/0.0.4/... -> .../releases/download/9.9.9/...
    pub fn get_download_link(&self) -> String {
        match TEST_VERSION_OVERRIDE {
            Some(test_version) => {
                // Pattern: /releases/download/{version}/
                if let Some(idx) = self.link.find("/releases/download/") {
                    let prefix = &self.link[..idx + "/releases/download/".len()];
                    let rest = &self.link[idx + "/releases/download/".len()..];
                    // Find the next slash after version
                    if let Some(slash_idx) = rest.find('/') {
                        let suffix = &rest[slash_idx..];
                        return format!("{}{}{}", prefix, test_version, suffix);
                    }
                }
                self.link.clone()
            }
            None => self.link.clone(),
        }
    }
}

