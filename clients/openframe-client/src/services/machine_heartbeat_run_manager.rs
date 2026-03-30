use crate::services::machine_heartbeat_publisher::MachineHeartbeatPublisher;
use anyhow::Result;
use tokio::time::{interval, timeout, Duration};
use tracing::{error, info};

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(60);
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(30);

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
            let mut interval = interval(HEARTBEAT_INTERVAL);

            loop {
                interval.tick().await;

                match timeout(HEARTBEAT_TIMEOUT, publisher.publish_heartbeat()).await {
                    Ok(Ok(())) => {}
                    Ok(Err(e)) => error!("Failed to send heartbeat: {}", e),
                    Err(_) => error!("Heartbeat timed out - NATS may be disconnected"),
                }
            }
        });
    }
}
