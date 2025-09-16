use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolConnectionMessage {
    pub tool_id: String,
    // Agent's tool ID - identifies the host/agent within the tool (e.g., UUID from tool)
    pub agent_tool_id: String,
}