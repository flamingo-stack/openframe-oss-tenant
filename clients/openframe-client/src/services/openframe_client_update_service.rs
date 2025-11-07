use anyhow::{Context, Result, anyhow};
use tracing::{info, warn, error};
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::platform::DirectoryManager;
use std::process;
use self_update::cargo_crate_version;

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
        let requested_version = message.version.trim();
        info!("📩 Received update request for version: {}", requested_version);
        
        // Validate version format
        if !Self::is_valid_version(requested_version) {
            error!("⚠️ Invalid version format: {}", requested_version);
            return Err(anyhow!("Invalid version format: {}", requested_version));
        }
        
        // Get current version
        let current_version = cargo_crate_version!();
        info!("📌 Current version: {}", current_version);
        
        // Check if already on requested version
        if current_version == requested_version {
            info!("✅ Already running requested version {}", requested_version);
            return Ok(());
        }
        
        // Set update status to updating
        self.client_info_service
            .set_update_status(ClientUpdateStatus::Updating, Some(requested_version.to_string()))
            .await
            .context("Failed to set update status")?;
        
        info!("🧩 Requested update to version {}", requested_version);
        
        // Perform the update in a blocking task since self_update is synchronous
        let version = requested_version.to_string();
        let client_info_service = self.client_info_service.clone();
        
        let update_result = tokio::task::spawn_blocking(move || {
            Self::download_and_apply_update(&version)
        })
        .await
        .context("Update task panicked")?;
        
        match update_result {
            Ok(status) => {
                info!("✅ Update applied successfully: {}", status.version());
                
                // Update client info with new version
                client_info_service
                    .update_version(requested_version.to_string())
                    .await
                    .context("Failed to update client version info")?;
                
                client_info_service
                    .set_update_status(ClientUpdateStatus::Updated, None)
                    .await
                    .context("Failed to set update status to completed")?;
                
                // Exit to allow service manager to restart with new binary
                warn!("🔄 Update complete, restarting with new version...");
                process::exit(42); // Special exit code for update restart
            }
            Err(e) => {
                error!("❌ Update failed: {:#}", e);
                client_info_service
                    .set_update_status(ClientUpdateStatus::Failed, Some(e.to_string()))
                    .await
                    .ok(); // Don't fail if we can't update status
                Err(e)
            }
        }
    }
    
    /// Download and apply update from GitHub releases
    fn download_and_apply_update(version: &str) -> Result<self_update::Status> {
        info!("⬇️ Downloading version {} from GitHub releases...", version);
        
        let status = self_update::backends::github::Update::configure()
            .repo_owner("openframe")
            .repo_name("openframe-client") // TODO: Make configurable
            .bin_name("openframe-client")
            .target_version_tag(version)
            .show_download_progress(true)
            .no_confirm(true)
            .current_version(cargo_crate_version!())
            .build()
            .context("Failed to configure update")?
            .update()
            .context("Failed to download and apply update")?;
        
        info!("✅ Successfully applied update to version: {}", status.version());
        Ok(status)
    }
    
    /// Validate version format (basic semver check)
    fn is_valid_version(version: &str) -> bool {
        !version.is_empty() 
            && version.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
            && version.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
    }
}
