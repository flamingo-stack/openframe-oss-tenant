use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn};

use crate::models::{UpdaterPhase, UpdaterState};
use crate::platform::DirectoryManager;

#[derive(Clone)]
pub struct UpdaterStateService {
    state_file_path: PathBuf,
}

impl UpdaterStateService {
    pub fn new(directory_manager: &DirectoryManager) -> Self {
        Self {
            state_file_path: directory_manager.secured_dir().join("updater_state.json"),
        }
    }

    /// Loads the persisted state. Returns `None` if no state file exists (clean start).
    pub fn load(&self) -> Result<Option<UpdaterState>> {
        if !self.state_file_path.exists() {
            return Ok(None);
        }

        let json = fs::read_to_string(&self.state_file_path)
            .with_context(|| format!("Failed to read {}", self.state_file_path.display()))?;

        let state: UpdaterState = serde_json::from_str(&json)
            .with_context(|| format!("Failed to deserialize {}", self.state_file_path.display()))?;

        info!(
            phase = %state.phase,
            version = %state.target_version,
            "Loaded updater state from disk"
        );

        Ok(Some(state))
    }

    /// Persists the current state to disk. Called after every phase transition.
    pub fn save(&self, state: &UpdaterState) -> Result<()> {
        if let Some(parent) = self.state_file_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create dir {}", parent.display()))?;
        }

        let json = serde_json::to_string_pretty(state)
            .context("Failed to serialize updater state")?;

        fs::write(&self.state_file_path, json)
            .with_context(|| format!("Failed to write {}", self.state_file_path.display()))?;

        info!(phase = %state.phase, version = %state.target_version, "Saved updater state");
        Ok(())
    }

    /// Removes the state file. Called after a terminal phase (Completed, Failed, RolledBack).
    pub fn clear(&self) -> Result<()> {
        if self.state_file_path.exists() {
            fs::remove_file(&self.state_file_path)
                .with_context(|| format!("Failed to remove {}", self.state_file_path.display()))?;
            info!("Cleared updater state file");
        }
        Ok(())
    }

    /// Removes the legacy `update_state.json` written by the main client's old update flow,
    /// if it exists. Called once on startup after Phase 7 removes the client's update logic.
    pub fn cleanup_legacy_state(&self) {
        let legacy_path = self.state_file_path
            .parent()
            .map(|p| p.join("update_state.json"));

        if let Some(path) = legacy_path {
            if path.exists() {
                if let Err(e) = fs::remove_file(&path) {
                    warn!("Failed to remove legacy update_state.json: {}", e);
                } else {
                    info!("Removed legacy update_state.json");
                }
            }
        }
    }

    pub fn state_file_path(&self) -> &PathBuf {
        &self.state_file_path
    }

    /// Convenience: transition the phase, persist, and return the updated state.
    pub fn transition(&self, state: &mut UpdaterState, phase: UpdaterPhase) -> Result<()> {
        state.phase = phase;
        self.save(state)
    }
}
