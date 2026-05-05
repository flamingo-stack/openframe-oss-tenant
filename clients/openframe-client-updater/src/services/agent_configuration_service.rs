use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::AgentConfiguration;
use crate::platform::DirectoryManager;

/// Read-only view of `agent_config.json` (owned by the main client).
/// Credentials (machine_id, client_id, client_secret) are read from disk.
/// Access and refresh tokens are held in-memory only — the updater never
/// writes to the shared agent_config.json to avoid racing the main client.
#[derive(Clone)]
pub struct AgentConfigurationService {
    config_file_path: PathBuf,
    access_token: Arc<RwLock<String>>,
    refresh_token: Arc<RwLock<String>>,
}

impl AgentConfigurationService {
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

    pub async fn get_machine_id(&self) -> Result<String> {
        Ok(self.read_config()?.machine_id)
    }

    pub async fn get_client_credentials(&self) -> Result<(String, String)> {
        let cfg = self.read_config()?;
        Ok((cfg.client_id, cfg.client_secret))
    }

    /// Returns the in-memory access token set by the last successful authentication.
    pub async fn get_access_token(&self) -> Result<String> {
        Ok(self.access_token.read().await.clone())
    }

    /// Returns the in-memory refresh token set by the last successful authentication.
    pub async fn get_refresh_token(&self) -> Result<String> {
        Ok(self.refresh_token.read().await.clone())
    }

    /// Stores new tokens in memory. Never touches agent_config.json.
    pub async fn update_tokens(&self, access_token: String, refresh_token: String) -> Result<()> {
        *self.access_token.write().await = access_token;
        *self.refresh_token.write().await = refresh_token;
        Ok(())
    }

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
