use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tracing::{debug, info};
use uuid::Uuid;

use crate::platform::DirectoryManager;

pub const MACHINE_ID_HEADER: &str = "x-machine-id";

#[derive(Clone)]
pub struct MachineIdService {
    file_path: PathBuf,
    cached_id: Arc<std::sync::RwLock<Option<String>>>,
}

impl MachineIdService {
    pub fn new(directory_manager: &DirectoryManager) -> Self {
        Self {
            file_path: directory_manager.app_support_dir().join("machine_id"),
            cached_id: Arc::new(std::sync::RwLock::new(None)),
        }
    }

    pub fn get_or_create(&self) -> Result<String> {
        // Check cache first
        if let Some(id) = self.cached_id.read().unwrap().clone() {
            return Ok(id);
        }

        // Try to read from file
        if let Ok(id) = self.read() {
            debug!("Using existing machine ID: {}", id);
            *self.cached_id.write().unwrap() = Some(id.clone());
            return Ok(id);
        }

        // Generate new ID
        let id = Uuid::new_v4().to_string();
        self.write(&id)?;
        info!("Generated new machine ID: {}", id);
        *self.cached_id.write().unwrap() = Some(id.clone());
        Ok(id)
    }

    /// Returns the cached machine ID without creating a new one.
    /// Returns empty string if not yet initialized.
    pub fn get(&self) -> String {
        self.cached_id.read().unwrap().clone().unwrap_or_default()
    }

    fn read(&self) -> Result<String> {
        let content = fs::read_to_string(&self.file_path)
            .with_context(|| format!("Failed to read {}", self.file_path.display()))?;

        let id = content.trim();
        if id.is_empty() {
            anyhow::bail!("Machine ID file is empty");
        }
        Ok(id.to_string())
    }

    fn write(&self, id: &str) -> Result<()> {
        if let Some(parent) = self.file_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create {}", parent.display()))?;
        }

        fs::write(&self.file_path, id)
            .with_context(|| format!("Failed to write {}", self.file_path.display()))?;

        Ok(())
    }
}
