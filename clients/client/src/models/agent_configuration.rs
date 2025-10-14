use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AgentConfiguration {
    pub machine_id: String,
    pub client_id: String,
    pub client_secret: String,
    pub access_token: String,
    pub refresh_token: String,
}

impl Default for AgentConfiguration {
    fn default() -> Self {
        Self {
            machine_id: String::new(),
            client_id: String::new(),
            client_secret: String::new(),
            access_token: String::new(),
            refresh_token: String::new(),
        }
    }
}