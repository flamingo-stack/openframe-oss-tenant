use std::fs;
use anyhow::Result;
use crate::platform::directories::DirectoryManager;
use crate::services::EncryptionService;

#[derive(Clone)]
pub struct SharedTokenService {
    dir_manager: DirectoryManager,
    encryption_service: EncryptionService,
}

impl SharedTokenService {
    pub fn new(dir_manager: DirectoryManager, encryption_service: EncryptionService) -> Self {
        Self { 
            dir_manager,
            encryption_service,
        }
    }

    pub fn update(&self, token: String) -> Result<()> {
        let config_dir = self.dir_manager.secured_dir();
        let token_file_path = config_dir.join("shared_token.enc");

        if let Some(parent) = token_file_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let encrypted_token = self.encryption_service.encrypt(&token)?;
        fs::write(token_file_path, encrypted_token)?;
        Ok(())
    }
} 