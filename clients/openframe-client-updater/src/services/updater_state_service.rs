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
    /// Creates a service that stores updater state in the secured directory.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let directory_manager: &DirectoryManager = todo!();
    /// let service = UpdaterStateService::new(directory_manager);
    ///
    /// assert!(service.state_file_path().ends_with("updater_state.json"));
    /// ```
    pub fn new(directory_manager: &DirectoryManager) -> Self {
        Self {
            state_file_path: directory_manager.secured_dir().join("updater_state.json"),
        }
    }

    /// Loads the persisted updater state from disk when the state file exists.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # let service: UpdaterStateService = todo!();
    /// match service.load()? {
    ///     Some(state) => println!("Updater phase: {}", state.phase),
    ///     None => println!("No updater state found"),
    /// }
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// Returns `Ok(None)` when the state file does not exist. Read and deserialization
    /// failures include the state file path as context.
    ///
    /// # Returns
    ///
    /// `Ok(Some(state))` containing the deserialized updater state, `Ok(None)` when
    /// no state file exists, or an error if the file cannot be read or deserialized.
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

    /// Persists the updater state to the state file.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(
    /// #     service: &UpdaterStateService,
    /// #     state: &UpdaterState,
    /// # ) -> anyhow::Result<()> {
    /// service.save(state)?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn save...
    pub fn save(&self, state: &UpdaterState) -> Result<()> {
        if let Some(parent) = self.state_file_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create dir {}", parent.display()))?;
        }

        let json =
            serde_json::to_string_pretty(state).context("Failed to serialize updater state")?;

        let temp_path = self.state_file_path.with_extension("json.tmp");
        fs::write(&temp_path, json)
            .with_context(|| format!("Failed to write {}", temp_path.display()))?;
        fs::rename(&temp_path, &self.state_file_path).with_context(|| {
            format!(
                "Failed to move state file into place: {}",
                self.state_file_path.display()
            )
        })?;

        info!(phase = %state.phase, version = %state.target_version, "Saved updater state");
        Ok(())
    }

    /// Clears the persisted updater state file when it exists.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(service: &UpdaterStateService) -> anyhow::Result<()> {
    /// service.clear()?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn clear(&self) -> Result<()> {
        if self.state_file_path.exists() {
            fs::remove_file(&self.state_file_path)
                .with_context(|| format!("Failed to remove {}", self.state_file_path.display()))?;
            info!("Cleared updater state file");
        }
        Ok(())
    }

    // Removes update_state.json left by the old client update flow after Phase 7 migration.
    /// Removes the legacy `update_state.json` file from the state directory when it exists.
    ///
    /// Removal failures are reported through a warning log.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(service: &UpdaterStateService) {
    /// service.cleanup_legacy_state();
    /// # }
    /// ```
    pub fn cleanup_legacy_state(&self) {
        let legacy_path = self
            .state_file_path
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

    /// Returns the path of the updater state file.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let path = service.state_file_path();
    /// assert!(path.ends_with("updater_state.json"));
    /// ```
    pub fn state_file_path(&self) -> &PathBuf {
        &self.state_file_path
    }

    /// Updates the updater phase and persists the new state.
    ///
    /// # Examples
    ///
    /// ```
    /// fn demonstrate(
    ///     service: &UpdaterStateService,
    ///     state: &mut UpdaterState,
    ///     phase: UpdaterPhase,
    /// ) -> anyhow::Result<()> {
    ///     service.transition(state, phase)?;
    ///     Ok(())
    /// }
    /// ```
    pub fn transition(&self, state: &mut UpdaterState, phase: UpdaterPhase) -> Result<()> {
        state.phase = phase;
        self.save(state)
    }
}
