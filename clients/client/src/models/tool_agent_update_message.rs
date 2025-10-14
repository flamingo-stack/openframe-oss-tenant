use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolAgentUpdateMessage {
    pub tool_agent_id: String,
    pub version: String,
}
