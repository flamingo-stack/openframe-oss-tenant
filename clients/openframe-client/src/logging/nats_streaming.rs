use anyhow::{Context, Result};
use std::io::Write;
use std::path::PathBuf;
use tokio::time::{interval, Duration};
use tracing::{debug, error, info};

use crate::platform::DirectoryManager;
use crate::services::{AgentConfigurationService, InitialConfigurationService};

use super::log_parser::{read_new_logs, LogBatchMessage, LogDeduplicator};

// TODO: Set to false when backend is ready
const TEST_MODE: bool = true;

const BATCH_INTERVAL_SECS: u64 = 60;
const MAX_LOGS_PER_BATCH: usize = 50;
const RECONNECT_DELAY_SECS: u64 = 5;
const NATS_SUBJECT: &str = "agents.logs";
// Hardcoded machine ID for NATS header (used before registration)
const NATS_HEADER_MACHINE_ID: &str = "openframe-client";

pub struct NatsLogConnection {
    client: Option<async_nats::Client>,
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
            client: None,
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

        self.client = Some(client);
        info!("NATS logs: initial connection established");
        Ok(())
    }

    pub async fn publish(&self, payload: &LogBatchMessage) -> Result<()> {
        let client = self
            .client
            .as_ref()
            .context("NATS log connection not initialized")?;

        let json = serde_json::to_vec(payload).context("Failed to serialize log batch")?;

        client
            .publish(NATS_SUBJECT.to_string(), json.into())
            .await
            .context("Failed to publish log batch")?;

        debug!("Published {} logs to NATS", payload.logs.len());
        Ok(())
    }
}

pub struct NatsLogStreaming {
    server_host: String,
    tenant_domain: String,
    initial_key: String,
    hostname: String,
    log_file_path: PathBuf,
    agent_config_service: AgentConfigurationService,
}

impl NatsLogStreaming {
    pub fn new(
        initial_config_service: &InitialConfigurationService,
        agent_config_service: &AgentConfigurationService,
        directory_manager: &DirectoryManager,
    ) -> Result<Self> {
        let server_host = initial_config_service.get_server_url()?;
        let initial_key = initial_config_service.get_initial_key()?;
        let tenant_domain = extract_tenant_domain(&server_host);

        let hostname = hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let log_file_path = super::get_log_file_path(directory_manager);

        Ok(Self {
            server_host,
            tenant_domain,
            initial_key,
            hostname,
            log_file_path,
            agent_config_service: agent_config_service.clone(),
        })
    }

    /// Start the log streaming background task.
    pub async fn start(self) -> Result<()> {
        let nats_url = format!("wss://{}/ws/nats-logs", self.server_host);

        let test_output = if TEST_MODE {
            let path = self.log_file_path.with_file_name("openframe_stream_test.log");
            info!("LOG STREAMING TEST MODE: also writing to {}", path.display());
            Some(TestOutputContext {
                path,
                batch_number: 0,
                tenant_domain: self.tenant_domain.clone(),
                initial_key: self.initial_key.clone(),
                nats_url: nats_url.clone(),
            })
        } else {
            None
        };

        let mut connection = NatsLogConnection::new(
            self.server_host.clone(),
            self.tenant_domain.clone(),
            self.initial_key.clone(),
        );

        connection.connect().await?;

        tokio::spawn(log_file_reader_task(
            self.log_file_path,
            connection,
            self.hostname,
            self.tenant_domain,
            self.agent_config_service,
            test_output,
        ));

        Ok(())
    }
}

async fn log_file_reader_task(
    log_file_path: PathBuf,
    connection: NatsLogConnection,
    hostname: String,
    tenant_domain: String,
    agent_config_service: AgentConfigurationService,
    test_output: Option<TestOutputContext>,
) {
    let interval_secs = if test_output.is_some() { 5 } else { BATCH_INTERVAL_SECS };
    let mut ticker = interval(Duration::from_secs(interval_secs));
    let mut file_position: u64 = 0;
    let mut test_ctx = test_output;
    let mut pending_batch: Option<(LogBatchMessage, usize, u64)> = None;

    loop {
        ticker.tick().await;

        // If we have a pending batch from previous failed publish, retry it
        let (batch, raw_count, new_position) = if let Some((b, rc, np)) = pending_batch.take() {
            (b, rc, np)
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
                continue;
            }

            // Get machine_id dynamically (None before registration, Some after)
            let machine_id = agent_config_service.get_machine_id().await.ok();

            let raw_count = logs.len();
            let batch = LogBatchMessage {
                machine_id,
                hostname: hostname.clone(),
                tenant_domain: tenant_domain.clone(),
                logs: logs.deduplicate(),
            };

            (batch, raw_count, new_pos)
        };

        // Write to test file if enabled (only on first attempt)
        if let Some(ref mut ctx) = test_ctx {
            if let Err(e) = ctx.write(&batch, &batch.machine_id, raw_count) {
                error!("Failed to write test output: {:#}", e);
            }
        }

        // Publish to NATS
        if let Err(e) = connection.publish(&batch).await {
            error!("Failed to publish log batch: {:#} - will retry", e);
            // Store batch to retry on next tick
            pending_batch = Some((batch, raw_count, new_position));
        } else {
            // Success - advance file position
            file_position = new_position;
        }
    }
}

struct TestOutputContext {
    path: PathBuf,
    batch_number: u32,
    tenant_domain: String,
    initial_key: String,
    nats_url: String,
}

impl TestOutputContext {
    fn write(&mut self, batch: &LogBatchMessage, machine_id: &Option<String>, raw_count: usize) -> Result<()> {
        self.batch_number += 1;

        let mut file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.path)
            .context("Failed to open test output file")?;

        let machine_id_display = machine_id.as_deref().unwrap_or("<not registered>");

        writeln!(file, "\n==================== BATCH #{} ====================", self.batch_number)?;
        writeln!(file, "NATS URL: {}", self.nats_url)?;
        writeln!(file, "HEADERS:")?;
        writeln!(file, "  x-tenant-domain: {}", self.tenant_domain)?;
        writeln!(file, "  x-initial-key: {}", self.initial_key)?;
        writeln!(file, "  x-machine-id: {} (hardcoded)", NATS_HEADER_MACHINE_ID)?;
        writeln!(file, "JSON machineId: {}", machine_id_display)?;
        writeln!(file, "SUBJECT: {}", NATS_SUBJECT)?;
        writeln!(file, "STATS: {} logs ({} before dedup)", batch.logs.len(), raw_count)?;
        writeln!(file, "-------------------- LOGS --------------------")?;
        for log in &batch.logs {
            let count = log.count.map(|c| format!(" (x{})", c)).unwrap_or_default();
            writeln!(file, "[{}] {} {}{}", log.ts, log.level, log.msg, count)?;
        }
        writeln!(file, "-------------------- JSON --------------------")?;
        writeln!(file, "{}", serde_json::to_string_pretty(batch)?)?;

        file.flush()?;
        Ok(())
    }
}

fn extract_tenant_domain(server_host: &str) -> String {
    server_host
        .strip_prefix("api.")
        .unwrap_or(server_host)
        .to_string()
}
