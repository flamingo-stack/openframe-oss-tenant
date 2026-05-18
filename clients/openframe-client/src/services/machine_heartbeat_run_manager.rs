use crate::services::machine_heartbeat_publisher::MachineHeartbeatPublisher;
use anyhow::Result;
use tokio::time::{timeout, sleep, Duration};
use tracing::{error, info, warn};

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(60);
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(30);
const RETRY_DELAY: Duration = Duration::from_secs(5);
const MAX_RETRIES: u32 = 3;

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
            loop {
                sleep(HEARTBEAT_INTERVAL).await;

                let mut delivered = false;
                for attempt in 1..=MAX_RETRIES {
                    match timeout(HEARTBEAT_TIMEOUT, publisher.publish_heartbeat()).await {
                        Ok(Ok(())) => {
                            delivered = true;
                            break;
                        }
                        Ok(Err(e)) => {
                            warn!("Heartbeat publish failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e);
                        }
                        Err(_) => {
                            warn!("Heartbeat timed out (attempt {}/{})", attempt, MAX_RETRIES);
                        }
                    }
                    if attempt < MAX_RETRIES {
                        sleep(RETRY_DELAY).await;
                    }
                }
                if !delivered {
                    error!("Heartbeat failed after {} attempts - will retry next interval", MAX_RETRIES);
                }
            }
        });
    }
}
