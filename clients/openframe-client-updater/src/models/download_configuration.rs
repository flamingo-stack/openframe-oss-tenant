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
    /// Determines whether this configuration targets the current operating system.
    ///
    /// # Examples
    ///
    /// ```
    /// let configuration = DownloadConfiguration {
    ///     os: String::from("LINUX"),
    ///     file_name: String::from("agent.zip"),
    ///     target_file_name: String::from("agent"),
    ///     link: String::from("https://example.com/agent.zip"),
    /// };
    ///
    /// assert_eq!(
    ///     configuration.matches_current_os(),
    ///     cfg!(target_os = "linux")
    /// );
    /// ```
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
