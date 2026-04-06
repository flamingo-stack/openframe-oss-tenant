use anyhow::{Context, Result};
use async_nats::jetstream;
use std::path::PathBuf;
use tokio::time::{interval, Duration};
use tracing::{debug, error, info};

use crate::platform::DirectoryManager;
use crate::services::device_data_fetcher::DeviceDataFetcher;
use crate::services::{AgentConfigurationService, InitialConfigurationService};

use super::log_parser::{read_new_logs, LogBatchMessage, LogDeduplicator};
use super::log_rotation::LogRotationManager;

const BATCH_INTERVAL_SECS: u64 = 60;
const MAX_LOGS_PER_BATCH: usize = 50;
const RECONNECT_DELAY_SECS: u64 = 5;
const INITIAL_KEY_CHECK_INTERVAL_SECS: u64 = 10;
const NATS_SUBJECT: &str = "agents.logs";
// Hardcoded machine ID for NATS header (used before registration)
const NATS_HEADER_MACHINE_ID: &str = "openframe-client";

pub struct NatsLogConnection {
    jetstream: Option<jetstream::Context>,
    server_host: String,
    tenant_domain: String,
    initial_key: String,
}

impl NatsLogConnection {
    pub fn new(
        server_host: String,
        tenant_domain: String,
        initial_key: String,
    ) -> Self {
        Self {
            jetstream: None,
            server_host,
            tenant_domain,
            initial_key,
        }
    }

    pub async fn connect(&mut self) -> Result<()> {
        let url = format!("wss://{}/ws/nats-logs", self.server_host);
        info!(
            "NATS logs: connecting to {} (tenant={})",
            url, self.tenant_domain
        );

        let tenant_domain = self.tenant_domain.clone();
        let client = async_nats::ConnectOptions::new()
            .custom_header("x-tenant-domain", &self.tenant_domain)
            .custom_header("x-initial-key", &self.initial_key)
            .custom_header("x-machine-id", NATS_HEADER_MACHINE_ID)
            .retry_on_initial_connect()
            .reconnect_delay_callback(|attempt| {
                let delay = Duration::from_secs(RECONNECT_DELAY_SECS);
                error!("NATS logs: reconnecting, attempt {}", attempt);
                delay
            })
            .event_callback(move |event| {
                let tenant = tenant_domain.clone();
                async move {
                    match event {
                        async_nats::Event::Connected => {
                            info!("NATS logs: connected (tenant={})", tenant);
                        }
                        async_nats::Event::Disconnected => {
                            error!("NATS logs: disconnected (tenant={})", tenant);
                        }
                        async_nats::Event::ServerError(err) => {
                            error!("NATS logs: server error: {} (tenant={})", err, tenant);
                        }
                        async_nats::Event::ClientError(err) => {
                            error!("NATS logs: client error: {} (tenant={})", err, tenant);
                        }
                        _ => {}
                    }
                }
            })
            .connect(&url)
            .await
            .context("Failed to connect to NATS logs endpoint")?;

        self.jetstream = Some(jetstream::new(client));
        info!("NATS logs: initial connection established");
        Ok(())
    }

    pub async fn publish(&self, payload: &LogBatchMessage) -> Result<()> {
        let js = self
            .jetstream
            .as_ref()
            .context("NATS log connection not initialized")?;

        let json = serde_json::to_vec(payload).context("Failed to serialize log batch")?;

        js.publish(NATS_SUBJECT, json.into())
            .await
            .context("Failed to publish log batch")?
            .await
            .context("Failed to receive publish acknowledgment")?;

        debug!("Published {} logs to NATS (ack received)", payload.logs.len());
        Ok(())
    }
}

pub struct LogStreamingRunManager {
    server_host: String,
    tenant_domain: String,
    hostname: String,
    log_file_path: PathBuf,
    offset_file_path: PathBuf,
    initial_config_service: InitialConfigurationService,
    agent_config_service: AgentConfigurationService,
}

impl LogStreamingRunManager {
    pub fn new(
        initial_config_service: &InitialConfigurationService,
        agent_config_service: &AgentConfigurationService,
        directory_manager: &DirectoryManager,
    ) -> Result<Self> {
        let server_host = initial_config_service.get_server_url()?;
        let tenant_domain = extract_tenant_domain(&server_host);

        let device_data_fetcher = DeviceDataFetcher::new();
        let hostname = device_data_fetcher.get_hostname().unwrap_or_else(|| "unknown".to_string());

        let log_file_path = directory_manager.logs_dir().join("openframe.log");
        let offset_file_path = directory_manager.secured_dir().join("log_stream_offset");

        Ok(Self {
            server_host,
            tenant_domain,
            hostname,
            log_file_path,
            offset_file_path,
            initial_config_service: initial_config_service.clone(),
            agent_config_service: agent_config_service.clone(),
        })
    }

    pub async fn start(self) -> Result<()> {
        tokio::spawn(async move {
            let initial_key = self.wait_for_initial_key().await;

            let mut connection = NatsLogConnection::new(
                self.server_host.clone(),
                self.tenant_domain.clone(),
                initial_key,
            );

            if let Err(e) = connection.connect().await {
                error!("Failed to connect to NATS logs: {:#}", e);
                return;
            }

            let rotation_manager = LogRotationManager::new(
                self.log_file_path.clone(),
                self.offset_file_path.clone(),
            );

            log_file_reader_task(
                self.log_file_path,
                rotation_manager,
                connection,
                self.hostname,
                self.tenant_domain,
                self.agent_config_service,
            ).await;
        });

        Ok(())
    }

    async fn wait_for_initial_key(&self) -> String {
        loop {
            match self.initial_config_service.get_initial_key() {
                Ok(key) if !key.is_empty() => {
                    info!("NATS log streaming: initial key available, starting");
                    return key;
                }
                _ => {
                    debug!("NATS log streaming: waiting for initial key...");
                    tokio::time::sleep(Duration::from_secs(INITIAL_KEY_CHECK_INTERVAL_SECS)).await;
                }
            }
        }
    }
}

async fn log_file_reader_task(
    log_file_path: PathBuf,
    rotation_manager: LogRotationManager,
    connection: NatsLogConnection,
    hostname: String,
    tenant_domain: String,
    agent_config_service: AgentConfigurationService,
) {
    let mut ticker = interval(Duration::from_secs(BATCH_INTERVAL_SECS));
    let mut file_position: u64 = rotation_manager.load_offset();
    let mut pending_batch: Option<(LogBatchMessage, u64)> = None;

    loop {
        ticker.tick().await;

        // If we have a pending batch from previous failed publish, retry it
        let (batch, new_position) = if let Some((b, np)) = pending_batch.take() {
            (b, np)
        } else {
            // Read new logs
            let (logs, new_pos) = match read_new_logs(&log_file_path, file_position, MAX_LOGS_PER_BATCH) {
                Ok(result) => result,
                Err(e) => {
                    error!("Failed to read log file: {:#}", e);
                    continue;
                }
            };

            if logs.is_empty() {
                // No new logs - check if rotation is needed
                rotation_manager.rotate_if_ready(&mut file_position);
                continue;
            }

            // Get machine_id dynamically (None before registration, Some after)
            let machine_id = agent_config_service.get_machine_id().await.ok();

            let batch = LogBatchMessage {
                machine_id,
                hostname: hostname.clone(),
                tenant_domain: tenant_domain.clone(),
                logs: logs.deduplicate(),
            };

            (batch, new_pos)
        };

        // Publish to NATS with JetStream ack
        if let Err(e) = connection.publish(&batch).await {
            error!("Failed to publish log batch: {:#} - will retry", e);
            pending_batch = Some((batch, new_position));
        } else {
            // Success - advance file position and persist
            file_position = new_position;
            rotation_manager.save_offset(file_position);
        }
    }
}

fn extract_tenant_domain(server_host: &str) -> String {
    server_host
        .strip_prefix("api.")
        .unwrap_or(server_host)
        .to_string()
}
