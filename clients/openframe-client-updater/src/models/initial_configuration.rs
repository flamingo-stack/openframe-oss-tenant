use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct InitialConfiguration {
    pub server_host: String,
    pub initial_key: String,
    pub local_mode: bool,
    #[serde(default)]
    pub org_id: String,
    #[serde(default)]
    pub local_ca_cert_path: String,
}
