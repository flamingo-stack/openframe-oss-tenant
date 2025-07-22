use anyhow::Result;
use openframe::nats::NatsService;
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};
use tracing::{info, Level};
use tracing_subscriber;

#[derive(Debug, Serialize, Deserialize)]
struct SystemMetrics {
    hostname: String,
    cpu_usage: f64,
    memory_usage: f64,
    timestamp: u64,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("Starting simple NATS example");

    // Create NATS service
    let nats_service = NatsService::new();

    // Connect to NATS server
    nats_service.connect().await?;

    // Subscribe to topics and log messages
    nats_service.subscribe_and_log("openframe.system.metrics").await?;
    nats_service.subscribe_and_log("openframe.hello").await?;

    // Give subscriber time to start
    sleep(Duration::from_millis(100)).await;

    // Publishing messages
    for i in 0..5 {
        let metrics = SystemMetrics {
            hostname: format!("client-{}", i),
            cpu_usage: 50.0 + (i as f64 * 10.0),
            memory_usage: 60.0 + (i as f64 * 5.0),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        // Serialize to JSON manually
        let json_payload = serde_json::to_vec(&metrics)?;
        
        nats_service
            .publish("openframe.system.metrics", json_payload)
            .await?;

        info!("Published metrics for client-{}", i);
        sleep(Duration::from_secs(1)).await;
    }

    // Publish a simple text message
    nats_service
        .publish("openframe.hello", b"Hello, NATS!".to_vec())
        .await?;

    info!("Published hello message");

    // Wait a bit to see the logged messages
    sleep(Duration::from_secs(2)).await;

    info!("NATS example completed");
    Ok(())
} 