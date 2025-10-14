use anyhow::{Context, Result, bail};
use tracing::{info, debug};

use crate::clients::AuthClient;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::models::AgentTokenResponse;
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
        Self {
            auth_client,
            config_service,
            shared_token_service,
        }
    }

    pub async fn authenticate_initial(&self) -> Result<AgentTokenResponse> {
        let (client_id, client_secret) = self.config_service.get_client_credentials().await?;
        let token_response = self.auth_client.authenticate_with_secret(client_id, client_secret).await?;

        self.save_tokens_to_config(&token_response).await?;

        Ok(token_response)
    }

    pub async fn reauthenticate(&self) -> Result<AgentTokenResponse> {
        // Try refresh token authentication first
        if let Ok(token_response) = self.try_refresh_token_authentication().await {
            return Ok(token_response);
        }

        // Fallback to client credentials authentication
        info!("Use client credentials to authenticate user");
        self.authenticate_with_client_credentials().await
    }

    async fn try_refresh_token_authentication(&self) -> Result<AgentTokenResponse> {
        let refresh_token = self.config_service.get_refresh_token().await?;
        
        match self.auth_client.authenticate_with_refresh_token(refresh_token).await {
            Ok(token_response) => {
                info!("Authenticated with refresh token");
                self.save_tokens_to_config(&token_response).await?;
                info!("Successfully authenticated using refresh token");
                Ok(token_response)
            }
            Err(err) => {
                let err_msg = err.to_string();
                // TODO: refactore in scope of fallback task to use errors with context or result with status code
                if err_msg.contains("401") || err_msg.contains("403") {
                    info!("Refresh token rejected with 401/403. Will try client credentials");
                    Err(err) // Return error to trigger fallback
                } else {
                    Err(err.context("Refresh token flow failed"))
                }
            }
        }
    }

    async fn authenticate_with_client_credentials(&self) -> Result<AgentTokenResponse> {
        let (client_id, client_secret) = self.config_service.get_client_credentials().await?;
    
        let token_response = self
            .auth_client
            .authenticate_with_secret(client_id, client_secret)
            .await
            .context("Failed to authenticate using client credentials")?;

        self.save_tokens_to_config(&token_response).await?;

        Ok(token_response)
    }

    async fn save_tokens_to_config(&self, token_response: &AgentTokenResponse) -> Result<()> {
        self.config_service.update_tokens(
            token_response.access_token.clone(),
            token_response.refresh_token.clone()
        ).await
        .context("Failed to update configuration with new tokens")?;

        self.shared_token_service
            .update(token_response.access_token.clone())
            .context("Failed to update shared token")?;

        Ok(())
    }
} 