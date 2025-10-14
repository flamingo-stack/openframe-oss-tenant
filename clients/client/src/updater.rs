use anyhow::Result;
use semver::Version;
use std::path::PathBuf;
use tempfile::TempDir;
use tracing::{error, info};
use velopack::{sources::HttpSource, UpdateCheck, UpdateManager, VelopackApp};

pub struct VelopackUpdater {
    update_channel: String,
    temp_dir: TempDir,
    current_version: Version,
    manager: UpdateManager,
    update_url: Option<String>,
}

impl VelopackUpdater {
    pub fn new(
        current_version: Version,
        update_channel: String,
        update_url: Option<String>,
    ) -> Result<Self> {
        info!(
            "Initializing VelopackUpdater with version {} on channel {}",
            current_version, update_channel
        );

        // Initialize VelopackApp
        info!("Starting VelopackApp");
        VelopackApp::build().run();

        let temp_dir = tempfile::tempdir()?;
        info!(
            "Created temporary directory at: {}",
            temp_dir.path().display()
        );

        // If no update URL is provided, create a dummy manager that will always return no updates
        let manager = if let Some(ref url) = update_url {
            info!("Configuring update manager with URL: {}", url);
            let source = HttpSource::new(url);
            UpdateManager::new(source, None, None)?
        } else {
            info!("No update URL configured, updates will be disabled");
            let source = HttpSource::new("http://localhost"); // Dummy URL that won't be used
            UpdateManager::new(source, None, None)?
        };

        Ok(Self {
            update_channel,
            temp_dir,
            current_version,
            manager,
            update_url,
        })
    }

    pub fn check_for_updates(&self) -> Result<Option<UpdateInfo>> {
        if let Some(url) = &self.update_url {
            info!("Checking for updates from {}", url);
            match self.manager.check_for_updates()? {
                UpdateCheck::UpdateAvailable(updates) => {
                    info!("Update available: {:?}", updates);
                    Ok(Some(UpdateInfo {
                        version: self.current_version.to_string(),
                        download_url: String::new(),
                        release_notes: String::new(),
                    }))
                }
                _ => {
                    info!("No updates available");
                    Ok(None)
                }
            }
        } else {
            error!("No update URL configured");
            Ok(None)
        }
    }

    pub fn download_and_apply_update(&self, update_info: &UpdateInfo) -> Result<bool> {
        info!(
            "Downloading and applying update to version {}",
            update_info.version
        );

        match self.manager.check_for_updates()? {
            UpdateCheck::UpdateAvailable(updates) => {
                info!("Downloading update...");
                self.manager.download_updates(&updates, None)?;

                info!("Applying update and preparing to restart...");
                self.manager.apply_updates_and_restart(&updates)?;
                Ok(true)
            }
            _ => {
                info!("No updates available to apply");
                Ok(false)
            }
        }
    }

    pub fn restart_to_apply_update(&self) -> Result<()> {
        info!("Attempting to restart to apply update");
        match self.manager.check_for_updates()? {
            UpdateCheck::UpdateAvailable(updates) => {
                info!("Update available, restarting to apply...");
                self.manager.apply_updates_and_restart(&updates)?;
            }
            _ => {
                info!("No updates available to apply during restart");
            }
        }
        Ok(())
    }

    fn get_download_path(&self) -> PathBuf {
        self.temp_dir.path().to_path_buf()
    }
}

#[derive(Debug, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub download_url: String,
    pub release_notes: String,
}
