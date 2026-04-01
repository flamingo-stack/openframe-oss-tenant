use anyhow::{Context, Result};
use async_nats::jetstream;
use async_nats::jetstream::context::PublishErrorKind;
use std::path::PathBuf;
use std::time::Instant;
use tokio::time::{interval, Duration};
use tracing::{error, info, warn};

use crate::platform::DirectoryManager;
use crate::services::device_data_fetcher::DeviceDataFetcher;
use crate::services::{AgentConfigurationService, InitialConfigurationService};

use super::log_parser::{read_new_logs, LogBatchMessage, LogDeduplicator};
use super::log_rotation::LogRotationManager;

const BATCH_INTERVAL_SECS: u64 = 60;
const MAX_LOGS_PER_BATCH: usize = 50;
const RECONNECT_DELAY_SECS: u64 = 5;
const NATS_SUBJECT: &str = "agents.logs";
const NON_RETRIABLE_TIMEOUT_SECS: u64 = 120; // 2 min retry then skip
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

    pub async fn publish(&self, payload: &LogBatchMessage) -> Result<(), PublishErrorKind> {
        let js = self
            .jetstream
            .as_ref()
            .ok_or(PublishErrorKind::Other)?;

        let json = serde_json::to_vec(payload)
            .map_err(|_| PublishErrorKind::Other)?;

        js.publish(NATS_SUBJECT, json.into())
            .await
            .map_err(|e| e.kind())?
            .await
            .map_err(|e| e.kind())?;

        info!("Published {} logs to NATS", payload.logs.len());
        Ok(())
    }
}

fn is_retriable_error(kind: &PublishErrorKind) -> bool {
    matches!(
        kind,
        PublishErrorKind::TimedOut | PublishErrorKind::BrokenPipe
    )
}

pub struct LogStreamingRunManager {
    server_host: String,
    tenant_domain: String,
    initial_key: String,
    hostname: String,
    log_file_path: PathBuf,
    offset_file_path: PathBuf,
    agent_config_service: AgentConfigurationService,
}

impl LogStreamingRunManager {
    pub fn new(
        initial_config_service: &InitialConfigurationService,
        agent_config_service: &AgentConfigurationService,
        directory_manager: &DirectoryManager,
    ) -> Result<Self> {
        let server_host = initial_config_service.get_server_url()?;
        let initial_key = initial_config_service.get_initial_key()?;
        let tenant_domain = extract_tenant_domain(&server_host);

        let device_data_fetcher = DeviceDataFetcher::new();
        let hostname = device_data_fetcher.get_hostname().unwrap_or_else(|| "unknown".to_string());

        let log_file_path = directory_manager.logs_dir().join("openframe.log");
        let offset_file_path = directory_manager.secured_dir().join("log_stream_offset");

        Ok(Self {
            server_host,
            tenant_domain,
            initial_key,
            hostname,
            log_file_path,
            offset_file_path,
            agent_config_service: agent_config_service.clone(),
        })
    }

    /// Start the log streaming background task.
    pub async fn start(self) -> Result<()> {
        let mut connection = NatsLogConnection::new(
            self.server_host.clone(),
            self.tenant_domain.clone(),
            self.initial_key.clone(),
        );

        connection.connect().await?;

        let rotation_manager = LogRotationManager::new(
            self.log_file_path.clone(),
            self.offset_file_path.clone(),
        );

        tokio::spawn(log_file_reader_task(
            self.log_file_path,
            rotation_manager,
            connection,
            self.hostname,
            self.tenant_domain,
            self.agent_config_service,
        ));

        Ok(())
    }
}

struct PendingBatch {
    batch: LogBatchMessage,
    position: u64,
    first_attempt: Instant,
    is_retriable: bool,
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
    let mut pending: Option<PendingBatch> = None;

    loop {
        ticker.tick().await;

        // If we have a pending batch from previous failed publish, retry it
        let (batch, new_position, first_attempt, is_retriable) = if let Some(p) = pending.take() {
            // Check if non-retriable batch exceeded timeout
            if !p.is_retriable && p.first_attempt.elapsed().as_secs() >= NON_RETRIABLE_TIMEOUT_SECS {
                warn!("Skipping log batch after {} retries (non-retriable error)", NON_RETRIABLE_TIMEOUT_SECS);
                file_position = p.position;
                rotation_manager.save_offset(file_position);
                continue;
            }
            (p.batch, p.position, p.first_attempt, p.is_retriable)
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

            (batch, new_pos, Instant::now(), true)
        };

        // Publish to NATS with JetStream ack
        match connection.publish(&batch).await {
            Ok(()) => {
                file_position = new_position;
                rotation_manager.save_offset(file_position);
            }
            Err(kind) => {
                let retriable = is_retriable_error(&kind);
                error!("Failed to publish log batch: {:?} (retriable: {}) - will retry", kind, retriable);
                pending = Some(PendingBatch {
                    batch,
                    position: new_position,
                    first_attempt,
                    is_retriable: is_retriable && retriable,
                });
            }
        }
    }
}

fn extract_tenant_domain(server_host: &str) -> String {
    server_host
        .strip_prefix("api.")
        .unwrap_or(server_host)
        .to_string()
}
