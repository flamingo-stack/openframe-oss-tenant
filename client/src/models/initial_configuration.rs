use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InitialConfiguration {
    pub server_host: String,
    pub initial_key: String,
    pub local_mode: bool,
}