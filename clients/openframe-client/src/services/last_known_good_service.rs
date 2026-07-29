use crate::platform::directories::DirectoryManager;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{debug, info, warn};

#[derive(Debug, Serialize, Deserialize)]
struct LastKnownGood {
    version: String,
}

#[derive(Clone)]
pub struct LastKnownGoodService {
    anchor_file_path: PathBuf,
    boot_marker_path: PathBuf,
    logs_dir: PathBuf,
    current_exe: PathBuf,
    reserve_path: PathBuf,
}

impl LastKnownGoodService {
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let anchor_file_path = directory_manager.secured_dir().join("last_known_good.json");
        let boot_marker_path = directory_manager.secured_dir().join("boot.marker");
        let logs_dir = directory_manager.logs_dir().to_path_buf();

        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        let current_exe =
            std::env::current_exe().context("Failed to get current executable path")?;

        let mut reserve = current_exe.clone().into_os_string();
        reserve.push(".lkg");
        let reserve_path = PathBuf::from(reserve);

        Ok(Self {
            anchor_file_path,
            boot_marker_path,
            logs_dir,
            current_exe,
            reserve_path,
        })
    }

    pub async fn load(&self) -> Result<Option<String>> {
        if !self.anchor_file_path.exists() {
            debug!(
                "No last-known-good file found at: {}",
                self.anchor_file_path.display()
            );
            return Ok(None);
        }

        let json_content = fs::read_to_string(&self.anchor_file_path).with_context(|| {
            format!(
                "Failed to read last-known-good file: {:?}",
                self.anchor_file_path
            )
        })?;

        let anchor: LastKnownGood = serde_json::from_str(&json_content)
            .context("Failed to deserialize last-known-good from JSON")?;

        Ok(Some(anchor.version))
    }

    fn copy_running_to_reserve(&self) -> Result<()> {
        let temp_reserve = self.reserve_path.with_extension("lkg.tmp");
        fs::copy(&self.current_exe, &temp_reserve).with_context(|| {
            format!(
                "Failed to copy running binary {} to temp reserve {}",
                self.current_exe.display(),
                temp_reserve.display()
            )
        })?;
        fs::rename(&temp_reserve, &self.reserve_path).with_context(|| {
            format!(
                "Failed to move temp reserve into place: {}",
                self.reserve_path.display()
            )
        })?;
        Ok(())
    }

    pub async fn promote(&self, version: &str) -> Result<()> {
        self.copy_running_to_reserve()?;

        let json_content = serde_json::to_string_pretty(&LastKnownGood {
            version: version.to_string(),
        })
        .context("Failed to serialize last-known-good to JSON")?;
        let temp_anchor = self.anchor_file_path.with_extension("json.tmp");
        fs::write(&temp_anchor, json_content).with_context(|| {
            format!(
                "Failed to write temp last-known-good file: {:?}",
                temp_anchor
            )
        })?;
        fs::rename(&temp_anchor, &self.anchor_file_path).with_context(|| {
            format!(
                "Failed to move last-known-good file into place: {:?}",
                self.anchor_file_path
            )
        })?;

        info!(
            "Last-known-good anchor set to {} (reserve: {})",
            version,
            self.reserve_path.display()
        );
        Ok(())
    }

    pub async fn seed_if_missing(&self) -> Result<()> {
        let running_version = env!("OPENFRAME_VERSION");
        let anchor = self.load().await.unwrap_or(None);

        match anchor {
            Some(ref anchor_version) if self.reserve_path.exists() => {
                debug!(
                    "Last-known-good anchor {} and reserve present, nothing to seed",
                    anchor_version
                );
                Ok(())
            }
            Some(ref anchor_version) if anchor_version == running_version => {
                info!(
                    "Reserve missing; rebuilding it from running binary (matches anchor {})",
                    anchor_version
                );
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
                info!(
                    "Seeding last-known-good anchor from running binary version {}",
                    running_version
                );
                self.promote(running_version).await
            }
        }
    }

    pub fn reserve_path(&self) -> &Path {
        &self.reserve_path
    }

    pub fn boot_marker_path(&self) -> &Path {
        &self.boot_marker_path
    }

    pub async fn write_boot_marker(&self) -> Result<()> {
        let temp_path = self.boot_marker_path.with_extension("marker.tmp");
        fs::write(&temp_path, env!("OPENFRAME_VERSION"))
            .with_context(|| format!("Failed to write temp boot marker: {:?}", temp_path))?;
        fs::rename(&temp_path, &self.boot_marker_path).with_context(|| {
            format!(
                "Failed to move boot marker into place: {:?}",
                self.boot_marker_path
            )
        })?;
        debug!("Boot marker written: {}", self.boot_marker_path.display());
        Ok(())
    }

    pub fn new_transcript_path(&self, target_version: &str) -> PathBuf {
        self.logs_dir.join(format!(
            "updater-{}-{}.log",
            target_version,
            chrono::Utc::now().format("%Y%m%d%H%M%S")
        ))
    }

    pub async fn prune_transcripts(&self, keep: usize) {
        let entries = match fs::read_dir(&self.logs_dir) {
            Ok(entries) => entries,
            Err(e) => {
                warn!("Failed to read logs dir for transcript pruning: {}", e);
                return;
            }
        };

        let mut transcripts: Vec<(std::time::SystemTime, PathBuf)> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                name.starts_with("updater-") && name.ends_with(".log")
            })
            .filter_map(|e| {
                e.metadata()
                    .ok()
                    .and_then(|m| m.modified().ok())
                    .map(|modified| (modified, e.path()))
            })
            .collect();

        if transcripts.len() <= keep {
            return;
        }

        transcripts.sort_by(|a, b| b.0.cmp(&a.0)); // newest first
        for (_, path) in transcripts.into_iter().skip(keep) {
            match fs::remove_file(&path) {
                Ok(_) => info!("Removed old updater transcript: {}", path.display()),
                Err(e) => warn!(
                    "Failed to remove old updater transcript {}: {}",
                    path.display(),
                    e
                ),
            }
        }
    }
}
