use crate::platform::directories::DirectoryManager;
use crate::services::EncryptionService;
use crate::utils::fs::atomic_write;
use anyhow::Result;

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
        let token_file_path = self.dir_manager.secured_dir().join("shared_token.enc");
        let encrypted_token = self.encryption_service.encrypt(&token)?;
        atomic_write(&token_file_path, encrypted_token)?;
        Ok(())
    }
}
