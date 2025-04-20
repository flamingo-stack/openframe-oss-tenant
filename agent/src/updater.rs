use anyhow::Result;
use semver::Version;
use std::path::PathBuf;
use tempfile::TempDir;
use tracing::{error, info};
use velopack::{UpdateManager, UpdateOptions};

#[derive(Debug)]
pub struct UpdateInfo {
    pub version: Version,
    pub download_url: String,
    pub release_notes: Option<String>,
}

pub struct VelopackUpdater {
    channel: String,
    temp_dir: TempDir,
    current_version: Version,
    manager: UpdateManager,
}

impl VelopackUpdater {
    pub fn new(channel: &str) -> Result<Self> {
        let manager = UpdateManager::new(UpdateOptions {
            urls: vec!["https://releases.openframe.org".to_string()],
            channel: Some(channel.to_string()),
            ..Default::default()
        })?;

        Ok(Self {
            channel: channel.to_string(),
            temp_dir: TempDir::new()?,
            current_version: Version::new(0, 1, 0),
            manager,
        })
    }

    pub async fn check_for_updates(&self) -> Result<Option<UpdateInfo>> {
        info!("Checking for updates on channel: {}", self.channel);

        match self.manager.check_for_updates()? {
            Some(update) => {
                let version = Version::parse(&update.version)?;
                Ok(Some(UpdateInfo {
                    version,
                    download_url: update.release_notes_url.unwrap_or_default(),
                    release_notes: update.release_notes,
                }))
            }
            None => {
                info!("No updates available");
                Ok(None)
            }
        }
    }

    pub async fn download_and_apply_update(&self, update: UpdateInfo) -> Result<()> {
        info!("Downloading update version {}", update.version);

        match self.manager.download()? {
            true => {
                info!("Update downloaded successfully");
                if let Err(e) = self.manager.apply() {
                    error!("Failed to apply update: {}", e);
                    return Err(e.into());
                }
                info!("Update applied successfully. Restart required.");
                Ok(())
            }
            false => {
                error!("Failed to download update");
                Ok(())
            }
        }
    }

    pub fn restart_to_apply_update(&self) -> Result<()> {
        info!("Restarting to apply update...");
        self.manager.restart()?;
        Ok(())
    }

    fn get_download_path(&self) -> PathBuf {
        self.temp_dir.path().join("update.zip")
    }
}
