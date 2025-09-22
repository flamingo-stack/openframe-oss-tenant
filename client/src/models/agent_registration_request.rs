use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRegistrationRequest {
    pub hostname: String,
    pub agent_version: String,
    #[serde(skip_serializing_if = "String::is_empty", default)]
    pub organization_id: String,
} 