use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolConnectionMessage {
    pub tool_type: String,
    pub agent_tool_id: String,
}