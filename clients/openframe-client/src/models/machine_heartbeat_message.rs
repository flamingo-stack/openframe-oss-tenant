use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MachineHeartbeatMessage {
    // Empty object - machineId comes from topic name, timestamp generated at service side
}

impl MachineHeartbeatMessage {
    pub fn new() -> Self {
        Self {}
    }
}