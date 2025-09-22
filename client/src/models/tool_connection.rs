use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ToolConnection {
    pub tool_agent_id: String,
    pub agent_tool_id: String,
    pub published: bool,
}

impl Default for ToolConnection {
    fn default() -> Self {
        Self {
            tool_agent_id: String::new(),
            agent_tool_id: String::new(),
            published: false,
        }
    }
}
