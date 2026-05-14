use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

use crate::models::InitialConfiguration;
use crate::platform::DirectoryManager;

#[derive(Clone)]
pub struct InitialConfigurationService {
    config_file_path: PathBuf,
}

impl InitialConfigurationService {
    pub fn new(directory_manager: &DirectoryManager) -> Result<Self> {
        let config_file_path = directory_manager.secured_dir().join("initial_config.json");

        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self { config_file_path })
    }

    pub fn get_server_url(&self) -> Result<String> {
        Ok(self.read_config()?.server_host)
    }

    pub fn get_initial_key(&self) -> Result<String> {
        Ok(self.read_config()?.initial_key)
    }

    pub fn is_local_mode(&self) -> Result<bool> {
        Ok(self.read_config()?.local_mode)
    }

    pub fn get_local_ca_cert_path(&self) -> Result<String> {
        Ok(self.read_config()?.local_ca_cert_path)
    }

    fn read_config(&self) -> Result<InitialConfiguration> {
        if !self.config_file_path.exists() {
            return Err(anyhow::anyhow!(
                "initial_config.json not found at {}. Is the main client installed?",
                self.config_file_path.display()
            ));
        }

        let json = fs::read_to_string(&self.config_file_path)
            .with_context(|| format!("Failed to read {}", self.config_file_path.display()))?;

        serde_json::from_str::<InitialConfiguration>(&json)
            .context("Failed to deserialize initial_config.json")
    }
}
