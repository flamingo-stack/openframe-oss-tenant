use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;

use crate::models::InitialConfiguration;
use crate::platform::directories::DirectoryManager;

#[derive(Clone)]
pub struct InitialConfigurationService {
    config_file_path: PathBuf
}

impl InitialConfigurationService {
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let config_file_path = directory_manager.secured_dir().join("initial_config.json");
        
        directory_manager.ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self { 
            config_file_path
        })
    }

    pub fn get_initial_key(&self) -> Result<String> {
        let config = self.get()?;
        Ok(config.initial_key.clone())
    }

    pub fn get_server_url(&self) -> Result<String> {
        let config = self.get()?;
        Ok(config.server_host.clone())
    }

    pub fn is_local_mode(&self) -> Result<bool> {
        let config = self.get()?;
        Ok(config.local_mode)
    }

    pub fn get_org_id(&self) -> Result<String> {
        let config = self.get()?;
        Ok(config.org_id.clone())
    }

    pub fn get_local_ca_cert_path(&self) -> Result<String> {
        let config = self.get()?;
        Ok(config.local_ca_cert_path.clone())
    }

    fn get(&self) -> Result<InitialConfiguration> {
        if !self.config_file_path.exists() {
            return Err(anyhow::anyhow!("Initial configuration file does not exist"));
        }

        let json_content = fs::read_to_string(&self.config_file_path)
            .with_context(|| format!("Failed to read initial config file: {:?}", self.config_file_path))?;

        let config: InitialConfiguration = serde_json::from_str(&json_content)
            .context("Failed to deserialize initial configuration from JSON")?;

        Ok(config)
    }

    pub fn clear_initial_key(&self) -> Result<()> {
        let mut config = self.get()?;
        config.initial_key = String::new();
        self.save(&config)
            .context("Failed to save initial configuration to file")?;
        Ok(())
    }

    pub fn save(&self, config: &InitialConfiguration) -> Result<()> {
        let config_json = serde_json::to_string_pretty(config)
            .context("Failed to serialize initial configuration to JSON")?;
        fs::write(&self.config_file_path, config_json)
            .with_context(|| format!("Failed to write initial configuration file: {:?}", self.config_file_path))?;
        Ok(())
    }
}
