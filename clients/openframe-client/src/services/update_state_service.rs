use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use tracing::{info, debug};
use crate::models::update_state::UpdateState;
use crate::platform::directories::DirectoryManager;

#[derive(Clone)]
pub struct UpdateStateService {
    state_file_path: PathBuf,
}

impl UpdateStateService {
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let state_file_path = directory_manager.secured_dir().join("update_state.json");

        directory_manager.ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self {
            state_file_path
        })
    }

    pub async fn load(&self) -> Result<Option<UpdateState>> {
        if !self.state_file_path.exists() {
            debug!("No update state file found");
            return Ok(None);
        }

        let json_content = fs::read_to_string(&self.state_file_path)
            .with_context(|| format!("Failed to read update state file: {:?}", self.state_file_path))?;

        let state: UpdateState = serde_json::from_str(&json_content)
            .context("Failed to deserialize update state from JSON")?;

        info!("Loaded update state for version: {}, phase: {:?}", state.target_version, state.phase);
        Ok(Some(state))
    }

    pub async fn save(&self, state: &UpdateState) -> Result<()> {
        let json_content = serde_json::to_string_pretty(state)
            .context("Failed to serialize update state to JSON")?;

        fs::write(&self.state_file_path, json_content)
            .with_context(|| format!("Failed to write update state file: {:?}", self.state_file_path))?;

        debug!("Saved update state for version: {}, phase: {:?}", state.target_version, state.phase);
        Ok(())
    }

    pub async fn clear(&self) -> Result<()> {
        if self.state_file_path.exists() {
            fs::remove_file(&self.state_file_path)
                .with_context(|| format!("Failed to remove update state file: {:?}", self.state_file_path))?;

            info!("Cleared update state");
        }
        Ok(())
    }

    pub async fn has_incomplete_update(&self) -> Result<bool> {
        match self.load().await? {
            Some(_state) => Ok(true), // If state exists, recovery is needed
            None => Ok(false),
        }
    }

    pub fn get_state_file_path(&self) -> String {
        self.state_file_path.to_string_lossy().to_string()
    }
}
