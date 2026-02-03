use anyhow::{Context, Result, anyhow};
use tracing::{info, warn, error};
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::models::update_state::{UpdateState, UpdatePhase};
use crate::service::FULL_SERVICE_NAME;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::services::github_download_service::GithubDownloadService;
use crate::services::update_state_service::UpdateStateService;
use crate::platform::updater_launcher::{self, UpdaterParams};
use std::path::PathBuf;
use uuid::Uuid;
use std::sync::Arc;
use tokio::sync::Mutex;
use semver::Version;

#[derive(Clone)]
pub struct OpenFrameClientUpdateService {
    client_info_service: OpenFrameClientInfoService,
    github_download_service: GithubDownloadService,
    update_state_service: UpdateStateService,
    /// Mutex to prevent concurrent updates (race condition protection)
    update_in_progress: Arc<Mutex<bool>>,
}

impl OpenFrameClientUpdateService {
    pub fn new(
        client_info_service: OpenFrameClientInfoService,
        github_download_service: GithubDownloadService,
        update_state_service: UpdateStateService,
    ) -> Self {
        Self {
            client_info_service,
            github_download_service,
            update_state_service,
            update_in_progress: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn process_update(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let requested_version = message.version.trim();
        info!("Received update request for version: {}", requested_version);

        // 1. Check if update is already in progress (race condition protection)
        {
            let mut update_lock = self.update_in_progress.lock().await;
            if *update_lock {
                warn!("Update already in progress, ignoring duplicate request for version: {}", requested_version);
                return Err(anyhow!("Update already in progress"));
            }
            // Set flag to indicate update is starting
            *update_lock = true;
            info!("Acquired update lock for version: {}", requested_version);
        }

        // Ensure lock is released on error or completion
        let update_result = self.process_update_internal(message).await;

        // Release lock
        {
            let mut update_lock = self.update_in_progress.lock().await;
            *update_lock = false;
            info!("Released update lock");
        }

        update_result
    }

    /// Internal update processing with version validation and safety checks
    async fn process_update_internal(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let requested_version = message.version.trim();

        // 2. Validate version format
        if !Self::is_valid_version(requested_version) {
            error!("Invalid version format: {}", requested_version);
            return Err(anyhow!("Invalid version format: {}", requested_version));
        }

        // 3. Parse requested version with semver to ensure valid format
        Self::parse_version(requested_version)
            .with_context(|| format!("Failed to parse requested version: {}", requested_version))?;

        // 4. Log current version for informational purposes
        let client_info = self.client_info_service.get().await
            .context("Failed to get current client info")?;

        if !client_info.current_version.is_empty() {
            info!(
                "Updating from version {} to {}",
                client_info.current_version, requested_version
            );
        } else {
            info!("No current version set, installing version: {}", requested_version);
        }

        // 5. Create update state for tracking
        let mut update_state = UpdateState::new(requested_version.to_string());
        self.update_state_service.save(&update_state).await
            .context("Failed to save initial update state")?;

        // 6. Set update status to updating
        self.client_info_service
            .set_update_status(ClientUpdateStatus::Updating, Some(requested_version.to_string()))
            .await
            .context("Failed to set update status")?;

        info!("Starting update to version {}", requested_version);

        // Execute update with status rollback
        let update_result = self.execute_update(&message, &mut update_state).await;

        // Handle errors: set status to Failed (cleanup already done in execute_update)
        if let Err(ref e) = update_result {
            error!("Update failed: {:#}", e);

            // Set status to Failed
            if let Err(status_err) = self.client_info_service
                .set_update_status(ClientUpdateStatus::Failed, Some(requested_version.to_string()))
                .await
            {
                error!("Failed to set update status to Failed: {:#}", status_err);
            }

            info!("Update failed, NATS will retry");
        }

        update_result
    }

    /// Execute the actual update process
    async fn execute_update(&self, message: &OpenFrameClientUpdateMessage, update_state: &mut UpdateState) -> Result<()> {
        // 1. Find the appropriate download configuration for current OS
        let download_config = self.github_download_service.find_config_for_current_os(&message.download_configurations)
            .context("Failed to find download configuration for current OS")?;

        info!("Using download configuration for OS: {}", download_config.os);

        // 2. Download and extract binary using GithubDownloadService
        update_state.set_phase(UpdatePhase::Downloading);
        self.update_state_service.save(update_state).await?;

        let binary_bytes = match self.github_download_service
            .download_and_extract(download_config)
            .await
        {
            Ok(bytes) => bytes,
            Err(e) => {
                error!("Download failed: {:#}", e);
                // Clear update state - download failed, nothing to cleanup
                self.update_state_service.clear().await?;
                return Err(e.context("Failed to download and extract update"));
            }
        };

        info!("Binary downloaded and extracted ({} bytes)", binary_bytes.len());

        // 3. Extract binary
        update_state.set_phase(UpdatePhase::Extracting);
        self.update_state_service.save(update_state).await?;

        // 4. Save binary to a temp archive for the updater
        // Note: The updater expects a ZIP, so we create one with the binary
        update_state.set_phase(UpdatePhase::PreparingUpdater);
        self.update_state_service.save(update_state).await?;

        let archive_path = match self.create_temp_archive(&binary_bytes, &download_config.target_file_name).await {
            Ok(path) => path,
            Err(e) => {
                error!("Failed to create archive: {:#}", e);
                // Clear update state - archive creation failed
                self.update_state_service.clear().await?;
                return Err(e.context("Failed to create temporary archive"));
            }
        };

        info!("Temporary archive created: {}", archive_path.display());

        // 5. Launch update process (platform-specific)
        update_state.set_phase(UpdatePhase::UpdaterLaunched);
        self.update_state_service.save(update_state).await?;

        let current_exe = std::env::current_exe()
            .context("Failed to get current executable path")?;

        let params = UpdaterParams {
            binary_path: archive_path.clone(),
            target_exe: current_exe,
            service_name: FULL_SERVICE_NAME.to_string(),
            update_state_path: self.update_state_service.get_state_file_path(),
        };

        let launch_result = updater_launcher::launch_updater(params).await;

        // If launch failed, cleanup archive and state
        if let Err(e) = launch_result {
            error!("Failed to launch updater: {:#}", e);
            // Cleanup archive
            if let Err(cleanup_err) = std::fs::remove_file(&archive_path) {
                warn!("Failed to remove archive after launch failure: {}", cleanup_err);
            }
            // Clear update state
            self.update_state_service.clear().await?;
            return Err(e);
        }

        // Update script will stop the service, so everything after this won't execute
        // NATS notification will be sent from recovery service after restart
        info!("Update process launched, service will be stopped by update script");
        Ok(())
    }
    
    /// Creates a temporary ZIP archive containing the binary for the updater script
    #[cfg(windows)]
    async fn create_temp_archive(&self, binary_bytes: &[u8], binary_name: &str) -> Result<PathBuf> {
        use std::io::Write;
        use zip::write::{FileOptions, ZipWriter};
        
        let temp_dir = std::env::temp_dir();
        let archive_path = temp_dir.join(format!("openframe-update-{}.zip", Uuid::new_v4()));
        
        let file = std::fs::File::create(&archive_path)
            .context("Failed to create temporary ZIP file")?;
        
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        
        zip.start_file(binary_name, options)
            .context("Failed to start file in ZIP")?;
        
        zip.write_all(binary_bytes)
            .context("Failed to write binary to ZIP")?;
        
        zip.finish()
            .context("Failed to finalize ZIP archive")?;
        
        Ok(archive_path)
    }
    
    /// On Unix, we can directly write the binary (no ZIP needed)
    #[cfg(unix)]
    async fn create_temp_archive(&self, binary_bytes: &[u8], binary_name: &str) -> Result<PathBuf> {
        let temp_dir = std::env::temp_dir();
        let binary_path = temp_dir.join(format!("openframe-update-{}-{}", Uuid::new_v4(), binary_name));
        
        tokio::fs::write(&binary_path, binary_bytes).await
            .context("Failed to write binary file")?;
        
        Ok(binary_path)
    }

    /// Parse version string into semver Version
    /// Supports formats like: "1.2.3", "v1.2.3", "1.2.3-beta", "1.2.3+build"
    fn parse_version(version: &str) -> Result<Version> {
        // Remove 'v' prefix if present
        let version = version.trim().trim_start_matches('v');

        Version::parse(version)
            .with_context(|| format!("Failed to parse version: {}", version))
    }

    /// Validate version format (basic semver check)
    fn is_valid_version(version: &str) -> bool {
        !version.is_empty()
            && version.chars().next().map(|c| c.is_ascii_digit() || c == 'v').unwrap_or(false)
            && version.trim_start_matches('v').chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '+')
    }
}
