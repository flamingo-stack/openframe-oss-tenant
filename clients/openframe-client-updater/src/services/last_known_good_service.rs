use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::{debug, info};

use crate::platform::DirectoryManager;

#[derive(Debug, Serialize, Deserialize)]
struct LastKnownGood {
    version: String,
}

/// Last-known-good ratchet for the openframe-client binary, owned by the updater.
///
/// Same artifacts as the in-client implementation (Hotfix #2169), so existing
/// fleets carry their anchor over unchanged:
/// - `{secured}/last_known_good.json` — highest version that verified a boot
/// - `{client_exe}.lkg`               — reserve copy of that binary
/// - `{secured}/boot.marker`          — written by openframe-client on every
///   boot with its running version; the updater's health signal
///
/// The client keeps writing the boot marker (and seeding the anchor on its own
/// boots). The updater consumes the marker, enforces the downgrade guard, and
/// promotes the anchor after a verified update.
#[derive(Clone)]
pub struct LastKnownGoodService {
    anchor_file_path: PathBuf,
    boot_marker_path: PathBuf,
    client_exe: PathBuf,
    reserve_path: PathBuf,
}

impl LastKnownGoodService {
    pub fn new(directory_manager: &DirectoryManager, client_exe: PathBuf) -> Self {
        let secured = directory_manager.secured_dir();

        let mut reserve = client_exe.clone().into_os_string();
        reserve.push(".lkg");

        Self {
            anchor_file_path: secured.join("last_known_good.json"),
            boot_marker_path: secured.join("boot.marker"),
            client_exe,
            reserve_path: PathBuf::from(reserve),
        }
    }

    pub fn load_anchor(&self) -> Result<Option<String>> {
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

    /// Raise the anchor to `version` and refresh the reserve from the binary
    /// currently at the client path (the one that just verified its boot).
    pub fn promote(&self, version: &str) -> Result<()> {
        let temp_reserve = self.reserve_path.with_extension("lkg.tmp");
        fs::copy(&self.client_exe, &temp_reserve).with_context(|| {
            format!(
                "Failed to copy client binary {} to temp reserve {}",
                self.client_exe.display(),
                temp_reserve.display()
            )
        })?;
        fs::rename(&temp_reserve, &self.reserve_path).with_context(|| {
            format!(
                "Failed to move temp reserve into place: {}",
                self.reserve_path.display()
            )
        })?;

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

    /// Version the client reported on its most recent boot, if any.
    pub fn boot_marker_version(&self) -> Option<String> {
        let content = fs::read_to_string(&self.boot_marker_path).ok()?;
        let trimmed = content.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    }

    /// Last modification time of the boot marker. Each client boot rewrites the
    /// marker, so an mtime change during observation means the client restarted.
    pub fn boot_marker_mtime(&self) -> Option<std::time::SystemTime> {
        fs::metadata(&self.boot_marker_path)
            .and_then(|m| m.modified())
            .ok()
    }

    /// Remove the boot marker so the next marker observed is from the new binary.
    pub fn clear_boot_marker(&self) -> Result<()> {
        if self.boot_marker_path.exists() {
            fs::remove_file(&self.boot_marker_path).with_context(|| {
                format!(
                    "Failed to remove boot marker: {}",
                    self.boot_marker_path.display()
                )
            })?;
        }
        Ok(())
    }

    pub fn reserve_path(&self) -> &Path {
        &self.reserve_path
    }
}
