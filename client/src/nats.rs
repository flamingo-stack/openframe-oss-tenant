use anyhow::{Context, Result};
use async_nats::{Client, jetstream, jetstream::consumer::PushConsumer};
use futures::StreamExt;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{debug, info};

const NATS_SERVER_URL: &str = "ws://localhost:8100/ws/nats?param=value";

#[derive(Debug, Clone)]
pub struct NatsService {
    client: Arc<RwLock<Option<Client>>>,
}

impl NatsService {
    /// Create a new NATS service instance
    pub fn new() -> Self {
        Self {
            client: Arc::new(RwLock::new(None)),
        }
    }

    /// Connect to the NATS server
    pub async fn connect(&self) -> Result<()> {
        println!("\n\n\n\n\n\n\n");
        let url = NATS_SERVER_URL;
        // let client = async_nats::ConnectOptions::new()
        //     .max_reconnects(Some(10))
        //     // .retry_on_initial_connect()
        //     .reconnect_delay_callback(|attempt| {
        //         println!("\n\nFallback: reconnecting to NATS server, attempt: {}\n\n", attempt);
        //         std::time::Duration::from_secs(5)
        //     }) 
        //     // .reconnect_callback(|server| {
        //     //     println!("\n\nReconnected to NATS server at: {}\n\n", server);
        //     // })
        //     .connect(NATS_SERVER_URL)
        //     .await
        //     .context("Failed to connect to NATS server")?;

        // let client = async_nats::connect(NATS_SERVER_URL).await?;

        let device_id = "1234";
        let commands_topic = format!("device.{}.commands", device_id);

        let client = async_nats::ConnectOptions::new()
            .name("device-1234".to_string())
            .user_and_password("device".to_string(), "1234".to_string())
            .connect(NATS_SERVER_URL)
            .await
            .context("Failed to connect to NATS server")?;
        
        // jet stream

        // let inbox = client.new_inbox();
        // log inbox
        let jetstream = jetstream::new(client);
        let stream_name = String::from("DEVICE_COMMANDS");
        let deliver_subject = format!("device.{}.commands.deliver", device_id);

        println!("\nInbox topic: {}\n", deliver_subject);

        let consumer: PushConsumer = jetstream
            .create_stream(jetstream::stream::Config {
                name: stream_name,
                subjects: vec![commands_topic],
                ..Default::default()
            }).await?
            .create_consumer(jetstream::consumer::push::Config {
                deliver_subject: deliver_subject.clone(),
                durable_name: Some(format!("device_{}_commands_consumer", device_id)),
                inactive_threshold: Duration::from_secs(60),
                ..Default::default()
            }).await?;

        let mut messages = consumer.messages().await?;

        while let Some(message) = messages.next().await {
            let message = message?;
            println!(
                "got message on subject {} with payload {:?}",
                message.subject,
                String::from_utf8_lossy(&message.payload)
            );
    
            // acknowledge the message
            message.ack().await.map_err(|e| anyhow::anyhow!("Failed to ack message: {}", e))?;
        }

        // *self.client.write().await = Some(client);
        Ok(())
    }

    /// Publish a message to a subject
    pub async fn publish(&self, subject: &str, payload: Vec<u8>) -> Result<()> {
        let client_guard = self.client.read().await;
        if let Some(client) = &*client_guard {
            client
                .publish(subject.to_string(), payload.into())
                .await
                .context("Failed to publish message")?;
            debug!("Published message to subject: {}", subject);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Not connected to NATS server"))
        }
    }

    /// Subscribe to a subject and log all received messages
    pub async fn subscribe_and_log(&self, subject: &str) -> Result<()> {
        let client_guard = self.client.read().await;
        if let Some(client) = &*client_guard {
            let mut subscriber = client
                .subscribe(subject.to_string())
                .await
                .context("Failed to subscribe to subject")?;
            
            info!("Subscribed to subject: {}", subject);
            
            // Spawn a task to handle incoming messages
            let subject_name = subject.to_string();
            tokio::spawn(async move {
                while let Some(message) = subscriber.next().await {
                    let payload_str = String::from_utf8_lossy(&message.payload);
                    info!("Received message on topic '{}': {}", subject_name, payload_str);
                }
            });
            
            Ok(())
        } else {
            Err(anyhow::anyhow!("Not connected to NATS server"))
        }
    }
}

impl Default for NatsService {
    fn default() -> Self {
        Self::new()
    }
} 