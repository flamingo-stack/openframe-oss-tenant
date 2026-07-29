use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::AgentConfiguration;
use crate::platform::DirectoryManager;

// Credentials read from agent_config.json (owned by the main client, never written here).
// Tokens are in-memory only — avoids racing the main client on the shared file.
#[derive(Clone)]
pub struct AgentConfigurationService {
    config_file_path: PathBuf,
    access_token: Arc<RwLock<String>>,
    refresh_token: Arc<RwLock<String>>,
}

impl AgentConfigurationService {
    /// Creates a configuration service for the secured directory managed by `directory_manager`.
    ///
    /// # Errors
    ///
    /// Returns an error if the secured directory cannot be created or verified.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # fn example(directory_manager: &DirectoryManager) -> anyhow::Result<()> {
    /// let service = AgentConfigurationService::new(directory_manager)?;
    /// # let _ = service;
    /// # Ok(())
    /// # }
    /// ```
    pub fn new(directory_manager: &DirectoryManager) -> Result<Self> {
        let config_file_path = directory_manager.secured_dir().join("agent_config.json");

        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self {
            config_file_path,
            access_token: Arc::new(RwLock::new(String::new())),
            refresh_token: Arc::new(RwLock::new(String::new())),
        })
    }

    /// Retrieves the machine identifier from the agent configuration file.
    ///
    /// # Errors
    ///
    /// Returns an error if the configuration file cannot be read or parsed.
    ///
    /// # Examples
    ///
    /// ```
    /// # async fn example(service: AgentConfigurationService) -> Result<(), Box<dyn std::error::Error>> {
    /// let machine_id = service.get_machine_id().await?;
    /// println!("{machine_id}");
    /// # Ok(())
    /// # }
    /// ```
    ///
    pub async fn get_machine_id(&self) -> Result<String> {
        Ok(self.read_config()?.machine_id)
    }

    /// Retrieves the client ID and client secret from the agent configuration.
    ///
    /// # Returns
    ///
    /// A tuple containing the client ID and client secret.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(service: AgentConfigurationService) -> anyhow::Result<()> {
    /// let (client_id, client_secret) = service.get_client_credentials().await?;
    /// assert!(!client_id.is_empty());
    /// assert!(!client_secret.is_empty());
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_client_credentials(&self) -> Result<(String, String)> {
        let cfg = self.read_config()?;
        Ok((cfg.client_id, cfg.client_secret))
    }

    /// Retrieves the current in-memory access token.
    ///
    /// # Examples
    ///
    /// ```
    /// # async fn example(service: &AgentConfigurationService) -> Result<(), Box<dyn std::error::Error>> {
    /// let token = service.get_access_token().await?;
    /// # let _ = token;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn get_access_token(&self) -> Result<String> {
        Ok(self.access_token.read().await.clone())
    }

    /// Retrieves the currently stored OAuth refresh token.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(service: &AgentConfigurationService) -> anyhow::Result<()> {
    /// let refresh_token = service.get_refresh_token().await?;
    /// # assert!(!refresh_token.is_empty());
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// # Returns
    ///
    /// The currently stored refresh token.
    pub async fn get_refresh_token(&self) -> Result<String> {
        Ok(self.refresh_token.read().await.clone())
    }

    /// Updates the in-memory access and refresh tokens.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(service: &AgentConfigurationService) -> anyhow::Result<()> {
    /// service
    ///     .update_tokens("access-token".to_owned(), "refresh-token".to_owned())
    ///     .await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn update_tokens(&self, access_token: String, refresh_token: String) -> Result<()> {
        *self.access_token.write().await = access_token;
        *self.refresh_token.write().await = refresh_token;
        Ok(())
    }

    /// Reads and deserializes the agent configuration from `agent_config.json`.
    ///
    /// # Errors
    ///
    /// Returns an error if the configuration file is missing, cannot be read, or
    /// contains invalid JSON.
    ///
    /// # Examples
    ///
    /// ```rust,ignore
    /// let configuration = service.read_config()?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    fn read_config(&self) -> Result<AgentConfiguration> {
        if !self.config_file_path.exists() {
            return Err(anyhow::anyhow!(
                "agent_config.json not found at {}. Is the main client installed?",
                self.config_file_path.display()
            ));
        }

        let json = fs::read_to_string(&self.config_file_path)
            .with_context(|| format!("Failed to read {}", self.config_file_path.display()))?;

        serde_json::from_str::<AgentConfiguration>(&json)
            .context("Failed to deserialize agent_config.json")
    }
}
