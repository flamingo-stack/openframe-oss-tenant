use serde::{Deserialize, Serialize};
use super::SessionType;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolAgentUpdateMessage {
    pub tool_agent_id: String,
    pub version: String,
    pub session_type: SessionType,
}
