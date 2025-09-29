use anyhow::{Context, Result};
use tracing::{info, warn, error};
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::platform::DirectoryManager;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
use std::process;
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;

#[derive(Clone)]
pub struct OpenFrameClientUpdateService {
    directory_manager: DirectoryManager,
    client_info_service: OpenFrameClientInfoService,
}

impl OpenFrameClientUpdateService {
    pub fn new(directory_manager: DirectoryManager, client_info_service: OpenFrameClientInfoService) -> Self {
        Self {
            directory_manager,
            client_info_service,
        }
    }

    // TODO: add version timestamp and process race conditions
    pub async fn process_update(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let new_version = &message.version;
        info!("Processing OpenFrame client update to version: {}", new_version);
        
        // Set update status to updating
        self.client_info_service.set_update_status(ClientUpdateStatus::Updating, Some(new_version.clone())).await
            .context("Failed to set update status")?;
        
        // Get current binary path (where the service is running from)
        let current_binary_path = std::env::current_exe()
            .context("Failed to get current executable path")?;
        
        info!("Current OpenFrame binary path: {}", current_binary_path.display());
        
        // Store binary path in client info
        self.client_info_service.set_binary_path(current_binary_path.to_string_lossy().to_string()).await
            .context("Failed to store binary path")?;
        
        // Create backup of current binary
        let backup_path = current_binary_path.with_extension("backup");
        if current_binary_path.exists() {
            info!("Backing up current OpenFrame binary");
            fs::copy(&current_binary_path, &backup_path)
                .await
                .with_context(|| "Failed to backup current OpenFrame binary")?;
        }

        // Mock download new binary (empty bytes for now)
        info!("Downloading new OpenFrame client binary for version: {}", new_version);
        let new_binary_bytes = self.get_new_binary_mock(new_version).await?;
        
        // Write new binary to temporary location first
        let temp_binary_path = current_binary_path.with_extension("new");
        File::create(&temp_binary_path)
            .await?
            .write_all(&new_binary_bytes)
            .await
            .with_context(|| "Failed to write new OpenFrame binary")?;

        // Set executable permissions
        #[cfg(target_family = "unix")]
        {
            let mut perms = fs::metadata(&temp_binary_path).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&temp_binary_path, perms)
                .await
                .with_context(|| "Failed to set executable permissions on new binary")?;
        }

        // Replace current binary with new one
        fs::rename(&temp_binary_path, &current_binary_path)
            .await
            .with_context(|| "Failed to replace current binary with new one")?;

        info!("OpenFrame client binary updated successfully to version: {}", new_version);
        
        // Update client info with new version
        self.client_info_service.update_version(new_version.clone()).await
            .context("Failed to update client version info")?;
        
        self.client_info_service.set_update_status(ClientUpdateStatus::Updated, None).await
            .context("Failed to set update status to completed")?;
        
        // Kill current process - OS service manager will restart with new binary
        // TODO: This is dirty solution and should be revised
        warn!("Terminating current OpenFrame process for binary update - OS service will restart automatically");
        
        // Exit with special code to indicate planned restart for update
        process::exit(42); // Special exit code for update restart
    }

    // Mock implementation - returns empty bytes
    async fn get_new_binary_mock(&self, version: &str) -> Result<Vec<u8>> {
        info!("Mock: downloading OpenFrame client binary for version: {}", version);
        
        // TODO: Implement actual binary download logic
        // This should download the new binary from the update server
        let mock_binary = vec![]; // Empty bytes for now
        
        info!("Mock: downloaded {} bytes for OpenFrame client version: {}", mock_binary.len(), version);
        Ok(mock_binary)
    }
}
