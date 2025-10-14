use anyhow::{anyhow, Context, Result};
use std::path::PathBuf;
use std::process::Command;
use tracing::info;

use crate::models::InitialConfiguration;
use crate::platform::DirectoryManager;
use crate::services::InitialConfigurationService;

#[derive(Clone)]
pub struct InstallationInitialConfigService {
    initial_service: InitialConfigurationService,
}

#[derive(Debug, Clone)]
pub struct InstallConfigParams {
    pub server_url: Option<String>,
    pub initial_key: Option<String>,
    pub org_id: Option<String>,
    pub local_mode: bool,
}

impl InstallationInitialConfigService {
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let initial_service = InitialConfigurationService::new(directory_manager)
            .context("Failed to initialize initial configuration service")?;
        Ok(Self { initial_service })
    }

    /// Build and persist InitialConfiguration based on provided install parameters.
    pub fn build_and_save(&self, params: InstallConfigParams) -> Result<()> {
        // Validate required params
        let server_url = params
            .server_url
            .filter(|s| !s.trim().is_empty())
            .ok_or_else(|| anyhow!("serverUrl is required"))?;
        let initial_key = params
            .initial_key
            .filter(|s| !s.trim().is_empty())
            .ok_or_else(|| anyhow!("initialKey is required"))?;
        let org_id = params
            .org_id
            .filter(|s| !s.trim().is_empty())
            .ok_or_else(|| anyhow!("orgId is required"))?;

        let mut cfg = InitialConfiguration::default();
        cfg.server_host = server_url;
        cfg.initial_key = initial_key;
        cfg.org_id = org_id;
        cfg.local_mode = params.local_mode;

        // Only resolve local CA path via mkcert if running in local mode
        if params.local_mode {
            info!("Resolving mkcert CAROOT during install (local mode enabled)...");
            let output = Command::new("mkcert")
                .arg("-CAROOT")
                .output()
                .context("Failed to execute 'mkcert -CAROOT' during install")?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(anyhow!(
                    "'mkcert -CAROOT' failed with status {}: {}",
                    output.status, stderr
                ));
            }

            let root = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if root.is_empty() {
                return Err(anyhow!("'mkcert -CAROOT' returned empty output"));
            }

            let ca = PathBuf::from(&root).join("rootCA.pem");
            if !ca.exists() {
                return Err(anyhow!(
                    "rootCA.pem not found at {} (from mkcert -CAROOT)",
                    ca.to_string_lossy()
                ));
            }

            cfg.local_ca_cert_path = ca.to_string_lossy().to_string();
            info!("Resolved local CA cert path: {}", cfg.local_ca_cert_path);
        } else {
            info!("Skipping mkcert CAROOT resolution (local mode disabled)");
        }

        // Save the initial configuration
        self.initial_service
            .save(&cfg)
            .context("Failed to save initial configuration")?;

        Ok(())
    }
}


