use anyhow::{Context, Result};
use tokio::time::{sleep, Duration};
use tracing::{error, info};

use crate::models::AgentRegistrationResponse;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::AgentRegistrationService;

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
        let machine_id = self.config_service.get_machine_id()?;
        if !machine_id.is_empty() {
            info!("Already registered (machine_id: {})", machine_id);
            return Ok(());
        }

        info!("Starting registration");
        loop {
            match self.attempt_registration().await {
                Ok(_) => {
                    info!("Registration succeeded");
                    return Ok(());
                }
                Err(e) => {
                    error!("Registration failed: {:#}. Retrying in 60s", e);
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
