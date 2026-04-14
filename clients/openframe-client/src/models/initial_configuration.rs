use serde::{Deserialize, Serialize};

use super::DeviceTag;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InitialConfiguration {
    pub server_host: String,
    pub initial_key: String,
    pub local_mode: bool,
    #[serde(default)]
    pub org_id: String,
    #[serde(default)]
    pub local_ca_cert_path: String,
    #[serde(default)]
    pub tags: Vec<DeviceTag>,
}

impl Default for InitialConfiguration {
    fn default() -> Self {
        Self {
            server_host: String::new(),
            initial_key: String::new(),
            local_mode: false,
            org_id: String::new(),
            local_ca_cert_path: String::new(),
            tags: Vec::new(),
        }
    }
}