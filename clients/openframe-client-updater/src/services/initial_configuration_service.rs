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
    /// Creates a service for accessing the initial configuration in the secured directory.
    ///
    /// Ensures the required directories exist before storing the path to `initial_config.json`.
    ///
    /// # Errors
    ///
    /// Returns an error if the secured directory cannot be created or verified.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let service = InitialConfigurationService::new(&directory_manager)?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// `directory_manager` must provide the secured directory used to store the configuration.
    pub fn new(directory_manager: &DirectoryManager) -> Result<Self> {
        let config_file_path = directory_manager.secured_dir().join("initial_config.json");

        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self { config_file_path })
    }

    /// Retrieves the configured server URL.
    ///
    /// # Examples
    ///
    /// ```
    /// # let service: InitialConfigurationService = todo!();
    /// let server_url = service.get_server_url()?;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Returns
    ///
    /// The configured server URL.
    pub fn get_server_url(&self) -> Result<String> {
        Ok(self.read_config()?.server_host)
    }

    /// Retrieves the initial key from the stored configuration.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # let service: InitialConfigurationService = todo!();
    /// let initial_key = service.get_initial_key().unwrap();
    /// println!("{initial_key}");
    /// ```
    pub fn get_initial_key(&self) -> Result<String> {
        Ok(self.read_config()?.initial_key)
    }

    /// Determines whether the client is configured to run in local mode.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(service: &InitialConfigurationService) -> Result<(), Box<dyn std::error::Error>> {
    /// let local_mode = service.is_local_mode()?;
    /// assert!(local_mode || !local_mode);
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// Returns `true` when local mode is enabled, `false` otherwise.
    pub fn is_local_mode(&self) -> Result<bool> {
        Ok(self.read_config()?.local_mode)
    }

    /// Gets the path to the local certificate authority certificate.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(service: &InitialConfigurationService) -> Result<(), Box<dyn std::error::Error>> {
    /// let cert_path = service.get_local_ca_cert_path()?;
    /// assert!(!cert_path.is_empty());
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// # Returns
    ///
    /// The configured local CA certificate path.
    pub fn get_local_ca_cert_path(&self) -> Result<String> {
        Ok(self.read_config()?.local_ca_cert_path)
    }

    /// Reads and deserializes the initial configuration file.
    ///
    /// Returns an error if the file is missing, cannot be read, or contains invalid JSON.
    ///
    /// # Examples
    ///
    /// ```
    /// # use std::fs;
    /// # let path = std::env::temp_dir().join("initial_config.json");
    /// # fs::write(&path, r#"{"server_host":"https://example.com","initial_key":"key","local_mode":false,"local_ca_cert_path":""}"#)?;
    /// # let service = InitialConfigurationService { config_file_path: path.clone() };
    /// let configuration = service.read_config()?;
    /// assert_eq!(configuration.server_host, "https://example.com");
    /// # fs::remove_file(path)?;
    /// # Ok::<(), Box<dyn std::error::Error>>(())
    /// ```
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
