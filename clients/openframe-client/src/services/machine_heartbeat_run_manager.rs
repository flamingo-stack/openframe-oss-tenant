use crate::services::machine_heartbeat_publisher::MachineHeartbeatPublisher;
use anyhow::Result;
use tokio::time::{interval, Duration};
use tracing::{error, info};

#[derive(Clone)]
pub struct MachineHeartbeatRunManager {
    publisher: MachineHeartbeatPublisher,
}

impl MachineHeartbeatRunManager {
    pub fn new(publisher: MachineHeartbeatPublisher) -> Self {
        Self { publisher }
    }

    pub async fn start(&self) -> Result<()> {
        let mut interval = interval(Duration::from_secs(120)); // 2 minutes
        
        info!("Starting machine heartbeat run manager");
        
        loop {
            interval.tick().await;
            
            if let Err(e) = self.publisher.publish_heartbeat().await {
                error!("Failed to send heartbeat: {}", e);
            }
        }
    }
}
