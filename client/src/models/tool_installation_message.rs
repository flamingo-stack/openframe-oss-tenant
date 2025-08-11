use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ToolInstallationMessage {
    pub tool_id: String,
    pub version: String,
}