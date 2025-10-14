use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use tracing::{info, debug};
use crate::models::openframe_client_info::OpenFrameClientInfo;
use crate::platform::directories::DirectoryManager;

#[derive(Clone)]
pub struct OpenFrameClientInfoService {
    info_file_path: PathBuf,
}

impl OpenFrameClientInfoService {
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let info_file_path = directory_manager.secured_dir().join("openframe_client_info.json");
        
        directory_manager.ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self { 
            info_file_path
        })
    }

    pub async fn get(&self) -> Result<OpenFrameClientInfo> {
        if !self.info_file_path.exists() {
            debug!("OpenFrame client info file doesn't exist, returning default");
            return Ok(OpenFrameClientInfo::default());
        }

        let json_content = fs::read_to_string(&self.info_file_path)
            .with_context(|| format!("Failed to read client info file: {:?}", self.info_file_path))?;

        let info: OpenFrameClientInfo = serde_json::from_str(&json_content)
            .context("Failed to deserialize OpenFrame client info from JSON")?;

        Ok(info)
    }

    pub async fn save(&self, info: &OpenFrameClientInfo) -> Result<()> {
        let json_content = serde_json::to_string_pretty(info)
            .context("Failed to serialize OpenFrame client info to JSON")?;

        fs::write(&self.info_file_path, json_content)
            .with_context(|| format!("Failed to write client info file: {:?}", self.info_file_path))?;
        
        debug!("Saved OpenFrame client info to: {:?}", self.info_file_path);
        Ok(())
    }

    pub async fn update_version(&self, new_version: String) -> Result<()> {
        let mut info = self.get().await?;
        info.current_version = new_version.clone();
        info.last_updated = Some(chrono::Utc::now().to_rfc3339());
        
        self.save(&info).await?;
        info!("Updated OpenFrame client version to: {}", new_version);
        
        Ok(())
    }

    pub async fn set_update_status(&self, status: crate::models::openframe_client_info::ClientUpdateStatus, target_version: Option<String>) -> Result<()> {
        let mut info = self.get().await?;
        info.status = status;
        info.target_version = target_version;
        info.last_update_check = Some(chrono::Utc::now().to_rfc3339());
        
        self.save(&info).await?;
        
        Ok(())
    }

    pub async fn set_binary_path(&self, binary_path: String) -> Result<()> {
        let mut info = self.get().await?;
        info.binary_path = binary_path;
        
        self.save(&info).await?;
        
        Ok(())
    }
}
