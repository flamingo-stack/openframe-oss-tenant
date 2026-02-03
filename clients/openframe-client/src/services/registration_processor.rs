use anyhow::{bail, Context, Result};
use tokio::time::{sleep, Duration};
use tracing::{error, info};

use crate::services::AgentRegistrationService;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::models::AgentRegistrationResponse;

const MAX_RETRIES: u32 = 5;
const INITIAL_BACKOFF_SECS: u64 = 30;
const MAX_BACKOFF_SECS: u64 = 240;

#[derive(Clone)]
pub struct RegistrationProcessor {
    registration_service: AgentRegistrationService,
    config_service: AgentConfigurationService,
}

impl RegistrationProcessor {
    pub fn new(
        registration_service: AgentRegistrationService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            registration_service,
            config_service,
        }
    }

    pub async fn process(&self) -> Result<()> {
        let machine_id = self.config_service.get_machine_id().await?;
        if !machine_id.is_empty() {
            info!(
                "Existing machine_id detected ({}). Skipping registration.",
                machine_id
            );
            return Ok(());
        }

        info!("No machine_id found – starting registration loop");
        for attempt in 1..=MAX_RETRIES {
            match self.attempt_registration().await {
                Ok(_) => {
                    info!("Registration succeeded");
                    return Ok(());
                }
                Err(e) => {
                    error!("Registration attempt {}/{} failed: {:#}", attempt, MAX_RETRIES, e);
                    if attempt < MAX_RETRIES {
                        let backoff_secs = (INITIAL_BACKOFF_SECS * 2u64.pow(attempt - 1)).min(MAX_BACKOFF_SECS);
                        info!("Retrying in {} seconds", backoff_secs);
                        sleep(Duration::from_secs(backoff_secs)).await;
                    }
                }
            }
        }

        bail!("Registration failed after {} attempts", MAX_RETRIES)
    }

    async fn attempt_registration(&self) -> Result<AgentRegistrationResponse> {
        self.registration_service
            .register_agent()
            .await
            .context("Registration service returned an error")
    }
} 