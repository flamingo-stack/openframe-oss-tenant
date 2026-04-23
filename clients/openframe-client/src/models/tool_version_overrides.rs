use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolVersionOverrides {
    #[cfg(feature = "openframe-chat-version")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub openframe_chat: Option<String>,

    #[cfg(feature = "meshcentral-agent-version")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub meshcentral_agent: Option<String>,

    #[cfg(feature = "fleetmdm-agent-version")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fleetmdm_agent: Option<String>,

    #[cfg(feature = "tacticalrmm-agent-version")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tacticalrmm_agent: Option<String>,

    #[cfg(feature = "osquery-version")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub osquery: Option<String>,
}

impl ToolVersionOverrides {
    pub fn lookup(&self, tool_key: &str) -> Option<&str> {
        match tool_key {
            #[cfg(feature = "openframe-chat-version")]
            "openframe-chat" => self.openframe_chat.as_deref(),

            #[cfg(feature = "meshcentral-agent-version")]
            "meshcentral-agent" => self.meshcentral_agent.as_deref(),

            #[cfg(feature = "fleetmdm-agent-version")]
            "fleetmdm-agent" => self.fleetmdm_agent.as_deref(),

            #[cfg(feature = "tacticalrmm-agent-version")]
            "tacticalrmm-agent" => self.tacticalrmm_agent.as_deref(),

            #[cfg(feature = "osquery-version")]
            "osqueryd" => self.osquery.as_deref(),

            _ => None,
        }
    }
}
