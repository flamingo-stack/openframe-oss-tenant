use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;
use tracing::{info, error};

use crate::services::{InitialConfigurationService, AgentConfigurationService};

#[derive(Deserialize)]
struct RegistrationSecretResponse {
    secret: String,
}

pub struct InitialKeyService {
    http_client: Client,
    base_url: String,
    initial_config_service: InitialConfigurationService,
    agent_config_service: AgentConfigurationService,
}

impl InitialKeyService {
    pub fn new(
        http_client: Client,
        base_url: String,
        initial_config_service: InitialConfigurationService,
        agent_config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            http_client,
            base_url,
            initial_config_service,
            agent_config_service,
        }
    }

    pub async fn ensure_initial_key(&self) -> Result<()> {
        if !self.initial_config_service.is_initial_key_missing()? {
            return Ok(());
        }

        info!("Initial key missing in config, fetching from server (legacy upgrade)");

        match self.fetch_registration_secret().await {
            Ok(secret) => {
                self.initial_config_service.update_initial_key(secret)?;
                info!("Successfully fetched and saved initial key from server");
            }
            Err(e) => {
                error!("Failed to fetch initial key: {:#}. Log streaming will be unavailable.", e);
            }
        }

        Ok(())
    }

    async fn fetch_registration_secret(&self) -> Result<String> {
        let url = format!("{}/clients/client/agent/registration-secret/active", self.base_url);
        let token = self.agent_config_service.get_access_token().await?;

        let response = self.http_client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .send()
            .await
            .context("Failed to fetch registration secret")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("HTTP {} - {}", status, body);
        }

        let resp: RegistrationSecretResponse = response.json().await?;
        Ok(resp.secret)
    }
}
