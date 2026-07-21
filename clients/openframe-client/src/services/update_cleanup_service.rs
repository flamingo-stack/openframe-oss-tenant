use anyhow::{Context, Result};
use std::fs;
use std::path::PathBuf;
use tracing::{info, warn};

#[derive(Clone)]
pub struct UpdateCleanupService {
    exe_path: PathBuf,
}

impl UpdateCleanupService {
    pub fn new() -> Result<Self> {
        let exe_path = std::env::current_exe()
            .context("Failed to get current executable path")?;

        Ok(Self { exe_path })
    }

    pub async fn cleanup_all(&self) {
        let mut cleaned = 0;

        match self.cleanup_all_old_backups().await {
            Ok(count) => cleaned += count,
            Err(e) => warn!("Failed to cleanup old backups: {:#}", e),
        }

        match self.cleanup_all_old_logs().await {
            Ok(count) => cleaned += count,
            Err(e) => warn!("Failed to cleanup old logs: {:#}", e),
        }

        if cleaned > 0 {
            info!("Cleanup: removed {} old files", cleaned);
        }
    }

    async fn cleanup_all_old_backups(&self) -> Result<usize> {
        let exe_dir = self.exe_path.parent()
            .context("Failed to get executable directory")?;

        let exe_name = self.exe_path.file_name()
            .context("Failed to get executable name")?
            .to_string_lossy();

        let backup_pattern = format!("{}.backup.", exe_name);

        let mut cleaned = 0;
        if let Ok(entries) = fs::read_dir(exe_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let file_name = entry.file_name().to_string_lossy().to_string();
                if file_name.starts_with(&backup_pattern) {
                    match fs::remove_file(entry.path()) {
                        Ok(_) => {
                            info!("Removed old backup: {}", entry.path().display());
                            cleaned += 1;
                        }
                        Err(e) => {
                            warn!("Failed to remove backup {}: {}", entry.path().display(), e);
                        }
                    }
                }
            }
        }

        Ok(cleaned)
    }

    async fn cleanup_all_old_logs(&self) -> Result<usize> {
        let temp_dir = std::env::temp_dir();

        let mut cleaned = 0;
        if let Ok(entries) = fs::read_dir(&temp_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("openframe-update-") && name.ends_with(".log") {
                    match fs::remove_file(entry.path()) {
                        Ok(_) => {
                            info!("Removed old log: {}", entry.path().display());
                            cleaned += 1;
                        }
                        Err(e) => {
                            warn!("Failed to remove log {}: {}", entry.path().display(), e);
                        }
                    }
                }
            }
        }

        Ok(cleaned)
    }
}
