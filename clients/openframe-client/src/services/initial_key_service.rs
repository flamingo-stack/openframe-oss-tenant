use anyhow::{Context, Result};
use reqwest::Client;
use serde::Deserialize;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing::{info, error};

use crate::services::{InitialConfigurationService, AgentConfigurationService};

const RETRY_INTERVAL_SECS: u64 = 60;

#[derive(Deserialize)]
struct RegistrationSecretResponse {
    key: String,
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

    pub async fn ensure_initial_key(self: Arc<Self>) {
        if !self.is_key_missing() {
            return;
        }

        info!("Initial key missing in config, starting background fetch (legacy upgrade)");

        tokio::spawn(async move {
            loop {
                match self.fetch_registration_secret().await {
                    Ok(secret) => {
                        if let Err(e) = self.initial_config_service.update_initial_key(secret) {
                            error!("Failed to save initial key: {:#}", e);
                        } else {
                            info!("Successfully fetched and saved initial key from server");
                        }
                        return;
                    }
                    Err(e) => {
                        error!("Failed to fetch initial key: {:#}. Retrying in {}s...", e, RETRY_INTERVAL_SECS);
                        sleep(Duration::from_secs(RETRY_INTERVAL_SECS)).await;
                    }
                }
            }
        });
    }

    fn is_key_missing(&self) -> bool {
        self.initial_config_service.is_initial_key_missing().unwrap_or(false)
    }

    async fn fetch_registration_secret(&self) -> Result<String> {
        let url = format!("{}/clients/agent/registration-secret/active", self.base_url);
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
        Ok(resp.key)
    }
}
