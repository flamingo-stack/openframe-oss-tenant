use anyhow::{Context, Result};
use std::time::Duration;
use tracing::{info, warn};

use crate::clients::{DeregistrationOutcome, RegistrationClient};
use crate::platform::machine_info_persistence::{self, PersistedMachineInfo};
use crate::platform::DirectoryManager;
use crate::services::{AgentConfigurationService, InitialConfigurationService};

/// Deregistration is best-effort and must never block the local wipe for long.
const DEREGISTER_ATTEMPTS: u32 = 3;
const DEREGISTER_RETRY_DELAY: Duration = Duration::from_secs(5);
const DEREGISTER_HTTP_TIMEOUT_SECS: u64 = 15;

/// Reports an uninstall to the platform so the backend can delete this machine.
pub struct DeregistrationService {
    registration_client: RegistrationClient,
    config_service: AgentConfigurationService,
}

impl DeregistrationService {
    pub fn new(directory_manager: &DirectoryManager) -> Result<Self> {
        let initial_config_service = InitialConfigurationService::new(directory_manager.clone())
            .context("Failed to initialize initial configuration service")?;
        let config_service = AgentConfigurationService::new(directory_manager.clone())
            .context("Failed to initialize agent configuration service")?;

        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(DEREGISTER_HTTP_TIMEOUT_SECS))
            .danger_accept_invalid_certs(initial_config_service.is_local_mode()?)
            .no_proxy()
            .pool_max_idle_per_host(0)
            .build()
            .context("Failed to create HTTP client")?;

        let base_url = format!("https://{}", initial_config_service.get_server_url()?);
        let registration_client = RegistrationClient::new(base_url, http_client)
            .context("Failed to create registration client")?;

        Ok(Self {
            registration_client,
            config_service,
        })
    }

    /// Best-effort deregistration: logs every outcome and never fails the uninstall.
    pub async fn deregister_best_effort(&self) {
        let Some(machine_info) = self.load_credentials() else {
            info!("No registration credentials found, skipping platform deregistration");
            return;
        };

        info!("Reporting uninstall to the platform...");
        for attempt in 1..=DEREGISTER_ATTEMPTS {
            match self.registration_client.deregister(&machine_info).await {
                Ok(DeregistrationOutcome::Deregistered) => {
                    info!("Machine deregistered from the platform");
                    return;
                }
                Ok(DeregistrationOutcome::AlreadyGone(status)) => {
                    info!(
                        "Platform already forgot this machine or lacks the uninstall endpoint ({}), continuing",
                        status
                    );
                    return;
                }
                Err(e) if attempt < DEREGISTER_ATTEMPTS => {
                    warn!(
                        "Deregistration attempt {}/{} failed: {:#}. Retrying in {}s...",
                        attempt,
                        DEREGISTER_ATTEMPTS,
                        e,
                        DEREGISTER_RETRY_DELAY.as_secs()
                    );
                    tokio::time::sleep(DEREGISTER_RETRY_DELAY).await;
                }
                Err(e) => {
                    warn!(
                        "Deregistration failed after {} attempts, continuing uninstall: {:#}",
                        DEREGISTER_ATTEMPTS, e
                    );
                }
            }
        }
    }

    /// The persisted machine-info store survives partial wipes, so fall back to it.
    fn load_credentials(&self) -> Option<PersistedMachineInfo> {
        match self.config_service.get_registration_credentials() {
            Ok((machine_id, client_secret))
                if !machine_id.trim().is_empty() && !client_secret.trim().is_empty() =>
            {
                return Some(PersistedMachineInfo {
                    machine_id,
                    client_secret,
                });
            }
            Ok(_) => {}
            Err(e) => {
                warn!("Failed to read registration credentials from agent config: {:#}", e)
            }
        }
        match machine_info_persistence::read() {
            Ok(machine_info) => machine_info,
            Err(e) => {
                warn!("Failed to read persisted machine info: {:#}", e);
                None
            }
        }
    }
}
