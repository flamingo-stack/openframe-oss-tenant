use anyhow::{Context, Result};
use tracing::info;

use crate::clients::AuthClient;
use crate::models::AgentTokenResponse;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::shared_token_service::SharedTokenService;

#[derive(Clone)]
pub struct AgentAuthService {
    auth_client: AuthClient,
    config_service: AgentConfigurationService,
    shared_token_service: SharedTokenService,
}

impl AgentAuthService {
    pub fn new(
        auth_client: AuthClient,
        config_service: AgentConfigurationService,
        shared_token_service: SharedTokenService,
    ) -> Self {
        Self { auth_client, config_service, shared_token_service }
    }

    pub async fn authenticate_initial(&self) -> Result<AgentTokenResponse> {
        let (client_id, client_secret) = self.config_service.get_client_credentials().await?;
        let token_response = self.auth_client
            .authenticate_with_secret(client_id, client_secret)
            .await?;

        self.store_tokens(&token_response).await?;
        Ok(token_response)
    }

    pub async fn reauthenticate(&self) -> Result<AgentTokenResponse> {
        if let Ok(token_response) = self.try_refresh_token().await {
            return Ok(token_response);
        }
        info!("Refresh token failed, falling back to client credentials");
        self.authenticate_with_client_credentials().await
    }

    async fn try_refresh_token(&self) -> Result<AgentTokenResponse> {
        let refresh_token = self.config_service.get_refresh_token().await?;
        match self.auth_client.authenticate_with_refresh_token(refresh_token).await {
            Ok(token_response) => {
                info!("Authenticated with refresh token");
                self.store_tokens(&token_response).await?;
                Ok(token_response)
            }
            Err(err) => {
                let msg = err.to_string();
                if msg.contains("401") || msg.contains("403") {
                    info!("Refresh token rejected, will try client credentials");
                }
                Err(err)
            }
        }
    }

    async fn authenticate_with_client_credentials(&self) -> Result<AgentTokenResponse> {
        let (client_id, client_secret) = self.config_service.get_client_credentials().await?;
        let token_response = self.auth_client
            .authenticate_with_secret(client_id, client_secret)
            .await
            .context("Failed to authenticate using client credentials")?;

        self.store_tokens(&token_response).await?;
        Ok(token_response)
    }

    /// Stores tokens in the in-memory config cache and writes the access token
    /// to shared_token_updater.enc. Never writes to agent_config.json.
    async fn store_tokens(&self, token_response: &AgentTokenResponse) -> Result<()> {
        self.config_service
            .update_tokens(
                token_response.access_token.clone(),
                token_response.refresh_token.clone(),
            )
            .await
            .context("Failed to update in-memory token cache")?;

        self.shared_token_service
            .update(token_response.access_token.clone())
            .context("Failed to write shared_token_updater.enc")?;

        Ok(())
    }
}
