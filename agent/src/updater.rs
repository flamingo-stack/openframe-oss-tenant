use anyhow::Result;
use log::{error, info};
use semver::Version;
use std::path::PathBuf;
use tempfile::TempDir;
use velopack::{sources::HttpSource, UpdateCheck, UpdateManager, VelopackApp};

pub struct VelopackUpdater {
    update_channel: String,
    temp_dir: TempDir,
    current_version: Version,
    manager: UpdateManager,
}

impl VelopackUpdater {
    pub fn new(current_version: Version, update_channel: String) -> Result<Self> {
        // Initialize VelopackApp first
        VelopackApp::build().run();

        let temp_dir = tempfile::tempdir()?;
        let source = HttpSource::new("https://updates.openframe.org");
        let manager = UpdateManager::new(source, None, None)?;

        Ok(Self {
            update_channel,
            temp_dir,
            current_version,
            manager,
        })
    }

    pub fn check_for_updates(&self) -> Result<Option<UpdateInfo>> {
        match self.manager.check_for_updates()? {
            UpdateCheck::UpdateAvailable(updates) => {
                // In the new API, we just get the basic update information
                Ok(Some(UpdateInfo {
                    version: self.current_version.to_string(),
                    download_url: String::new(), // This is handled internally by Velopack now
                    release_notes: String::new(), // This is handled internally by Velopack now
                }))
            }
            _ => Ok(None),
        }
    }

    pub fn download_and_apply_update(&self, update_info: &UpdateInfo) -> Result<bool> {
        info!("Checking and downloading updates");

        match self.manager.check_for_updates()? {
            UpdateCheck::UpdateAvailable(updates) => {
                // Download the update
                self.manager.download_updates(&updates, None)?;

                // Apply the update and restart
                self.manager.apply_updates_and_restart(&updates)?;
                Ok(true)
            }
            _ => Ok(false),
        }
    }

    pub fn restart_to_apply_update(&self) -> Result<()> {
        match self.manager.check_for_updates()? {
            UpdateCheck::UpdateAvailable(updates) => {
                self.manager.apply_updates_and_restart(&updates)?;
            }
            _ => {}
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
