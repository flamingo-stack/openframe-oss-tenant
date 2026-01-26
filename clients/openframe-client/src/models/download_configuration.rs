use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadConfiguration {
    pub os: String,
    pub file_name: String,
    pub agent_file_name: String,
    pub link: String,
    /// If None, agent_file_name is the executable itself.
    /// If Some, agent_file_name is a directory and this is the path to executable inside.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executable_path: Option<String>,
}

impl DownloadConfiguration {
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

