use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRegistrationResponse {
    pub machine_id: String,
    pub client_id: String,
    pub client_secret: String,
} 