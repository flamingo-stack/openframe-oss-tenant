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

    pub fn start(&self) {
        let publisher = self.publisher.clone();
        
        info!("Starting machine heartbeat run manager");
        
        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(60)); // 1 minute
            
            loop {
                interval.tick().await;
                
                if let Err(e) = publisher.publish_heartbeat().await {
                    error!("Failed to send heartbeat: {}", e);
                }
            }
        });
    }
}
