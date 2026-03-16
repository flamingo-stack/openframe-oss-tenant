use anyhow::{Context, Result};
use tokio::time::{sleep, Duration};
use tracing::{error, info, warn};

use crate::services::AgentRegistrationService;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::models::AgentRegistrationResponse;

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
        let (client_id, _) = self.config_service.get_client_credentials().await?;
        if !client_id.is_empty() {
            info!(
                "Existing client_id detected. Skipping registration."
            );
            return Ok(());
        }

        info!("No client_id found – starting registration loop");
        loop {
            match self.attempt_registration().await {
                Ok(_) => {
                    info!("Registration succeeded");
                    return Ok(());
                }
                Err(e) => {
                    error!("Registration attempt failed. Retrying in 60 seconds…: {:#}", e);
                    // TODO: Add exponential backoff
                    sleep(Duration::from_secs(60)).await;
                }
            }
        }
    }
    

    async fn attempt_registration(&self) -> Result<AgentRegistrationResponse> {
        self.registration_service
            .register_agent()
            .await
            .context("Registration service returned an error")
    }
} 