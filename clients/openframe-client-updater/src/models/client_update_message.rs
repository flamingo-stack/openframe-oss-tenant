use serde::{Deserialize, Serialize};

use super::DownloadConfiguration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientUpdateMessage {
    pub version: String,
    pub download_configurations: Vec<DownloadConfiguration>,
    /// Backend-initiated rollback: bypasses the downgrade guard, and when the
    /// requested version matches the local last-known-good reserve the binary
    /// is restored from disk without downloading.
    #[serde(default)]
    pub rollback: bool,
}
