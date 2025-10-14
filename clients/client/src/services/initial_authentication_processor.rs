use anyhow::{Context, Result};
use tokio::time::{sleep, Duration};
use tracing::{info, warn};

use crate::services::AgentAuthService;
use crate::services::agent_configuration_service::AgentConfigurationService;

#[derive(Clone)]
pub struct InitialAuthenticationProcessor {
    auth_service: AgentAuthService,
    config_service: AgentConfigurationService,
}

impl InitialAuthenticationProcessor {
    pub fn new(
        auth_service: AgentAuthService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            auth_service,
            config_service,
        }
    }

    pub async fn process(&self) -> Result<()> {
        let access_token = self.config_service.get_access_token().await?;
        if !access_token.is_empty() {
            info!(
                "Existing access_token detected. Skipping initial authentication."
            );
            return Ok(());
        }

        info!("No access_token found – starting authentication loop");
        loop {
            match self.attempt_authentication().await {
                Ok(_) => {
                    info!("Initial authentication succeeded");
                    return Ok(());
                }
                Err(e) => {
                    warn!(
                        "Authentication attempt failed: {}. Retrying in 60 seconds…",
                        e
                    );
                    // TODO: Add exponential backoff
                    sleep(Duration::from_secs(60)).await;
                }
            }
        }
    }

    async fn attempt_authentication(&self) -> Result<()> {
        self.auth_service.authenticate_initial().await
            .context("Authentication service init returned an error")?;
        Ok(())
    }
} 