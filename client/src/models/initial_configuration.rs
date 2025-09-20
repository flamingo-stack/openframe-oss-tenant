use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InitialConfiguration {
    pub server_host: String,
    pub initial_key: String,
    pub local_mode: bool,
    #[serde(default)]
    pub org_id: String,
}

impl Default for InitialConfiguration {
    fn default() -> Self {
        Self {
            server_host: String::new(),
            initial_key: String::new(),
            local_mode: false,
            org_id: String::new(),
        }
    }
}