use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tracing::{debug, info, warn};
use crate::platform::directories::DirectoryManager;

#[derive(Debug, Serialize, Deserialize)]
struct LastKnownGood {
    version: String,
}

#[derive(Clone)]
pub struct LastKnownGoodService {
    anchor_file_path: PathBuf,
    boot_marker_path: PathBuf,
    current_exe: PathBuf,
    reserve_path: PathBuf,
}

impl LastKnownGoodService {
    /// Initializes the last-known-good service and prepares its secured storage directory.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(directory_manager: DirectoryManager) -> Result<()> {
    /// let service = LastKnownGoodService::new(directory_manager)?;
    /// # let _ = service;
    /// # Ok(())
    /// # }
    /// ```
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let anchor_file_path = directory_manager.secured_dir().join("last_known_good.json");
        let boot_marker_path = directory_manager.secured_dir().join("boot.marker");

        directory_manager.ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        let current_exe = std::env::current_exe()
            .context("Failed to get current executable path")?;

        let mut reserve = current_exe.clone().into_os_string();
        reserve.push(".lkg");
        let reserve_path = PathBuf::from(reserve);

        Ok(Self {
            anchor_file_path,
            boot_marker_path,
            current_exe,
            reserve_path,
        })
    }

    pub async fn load(&self) -> Result<Option<String>> {
        if !self.anchor_file_path.exists() {
            debug!("No last-known-good file found at: {}", self.anchor_file_path.display());
            return Ok(None);
        }

        let json_content = fs::read_to_string(&self.anchor_file_path)
            .with_context(|| format!("Failed to read last-known-good file: {:?}", self.anchor_file_path))?;

        let anchor: LastKnownGood = serde_json::from_str(&json_content)
            .context("Failed to deserialize last-known-good from JSON")?;

        Ok(Some(anchor.version))
    }

    fn copy_running_to_reserve(&self) -> Result<()> {
        let temp_reserve = self.reserve_path.with_extension("lkg.tmp");
        fs::copy(&self.current_exe, &temp_reserve)
            .with_context(|| format!(
                "Failed to copy running binary {} to temp reserve {}",
                self.current_exe.display(), temp_reserve.display()
            ))?;
        fs::rename(&temp_reserve, &self.reserve_path)
            .with_context(|| format!("Failed to move temp reserve into place: {}", self.reserve_path.display()))?;
        Ok(())
    }

    pub async fn promote(&self, version: &str) -> Result<()> {
        self.copy_running_to_reserve()?;

        let json_content = serde_json::to_string_pretty(&LastKnownGood { version: version.to_string() })
            .context("Failed to serialize last-known-good to JSON")?;
        let temp_anchor = self.anchor_file_path.with_extension("json.tmp");
        fs::write(&temp_anchor, json_content)
            .with_context(|| format!("Failed to write temp last-known-good file: {:?}", temp_anchor))?;
        fs::rename(&temp_anchor, &self.anchor_file_path)
            .with_context(|| format!("Failed to move last-known-good file into place: {:?}", self.anchor_file_path))?;

        info!(
            "Last-known-good anchor set to {} (reserve: {})",
            version, self.reserve_path.display()
        );
        Ok(())
    }

    /// Ensures the last-known-good anchor and reserve executable are initialized.
    ///
    /// Existing valid state is preserved. If the reserve is missing, it is rebuilt
    /// from the running executable; when the anchor is absent, both the anchor and
    /// reserve are seeded with the running version. Anchor loading failures are
    /// treated as if no anchor exists.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(service: &LastKnownGoodService) -> anyhow::Result<()> {
    /// service.seed_if_missing().await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn seed_if_missing(&self) -> Result<()> {
        let running_version = env!("OPENFRAME_VERSION");
        let anchor = self.load().await.unwrap_or(None);

        match anchor {
            Some(ref anchor_version) if self.reserve_path.exists() => {
                debug!("Last-known-good anchor {} and reserve present, nothing to seed", anchor_version);
                Ok(())
            }
            Some(ref anchor_version) if anchor_version == running_version => {
                info!("Reserve missing; rebuilding it from running binary (matches anchor {})", anchor_version);
                self.promote(running_version).await
            }
            Some(anchor_version) => {
                warn!(
                    "Rollback protection degraded: reserve missing, running {} below anchor {} — rebuilding reserve from running binary, anchor unchanged",
                    running_version, anchor_version
                );
                self.copy_running_to_reserve()
            }
            None => {
                info!("Seeding last-known-good anchor from running binary version {}", running_version);
                self.promote(running_version).await
            }
        }
    }

    /// Atomically writes the running version to the boot marker file.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(service: &LastKnownGoodService) -> anyhow::Result<()> {
    /// service.write_boot_marker().await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn write_boot_marker(&self) -> Result<()> {
        let temp_path = self.boot_marker_path.with_extension("marker.tmp");
        fs::write(&temp_path, env!("OPENFRAME_VERSION"))
            .with_context(|| format!("Failed to write temp boot marker: {:?}", temp_path))?;
        fs::rename(&temp_path, &self.boot_marker_path)
            .with_context(|| format!("Failed to move boot marker into place: {:?}", self.boot_marker_path))?;
        debug!("Boot marker written: {}", self.boot_marker_path.display());
        Ok(())
    }

}
