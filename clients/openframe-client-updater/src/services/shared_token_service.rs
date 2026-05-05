use std::fs;
use anyhow::Result;

use crate::platform::DirectoryManager;
use crate::services::EncryptionService;

/// Writes the updater's access token to `shared_token_updater.enc`.
/// Uses a separate file from the main client's `shared_token.enc` to avoid
/// race conditions between the two concurrently running processes.
#[derive(Clone)]
pub struct SharedTokenService {
    dir_manager: DirectoryManager,
    encryption_service: EncryptionService,
}

impl SharedTokenService {
    pub fn new(dir_manager: DirectoryManager, encryption_service: EncryptionService) -> Self {
        Self { dir_manager, encryption_service }
    }

    pub fn update(&self, token: String) -> Result<()> {
        let token_file_path = self.dir_manager.secured_dir().join("shared_token_updater.enc");

        if let Some(parent) = token_file_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let encrypted = self.encryption_service.encrypt(&token)?;
        fs::write(token_file_path, encrypted)?;
        Ok(())
    }
}
