use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use tracing::{info, warn};

use crate::config::updater_config::{REPLACE_MAX_RETRIES, REPLACE_RETRY_DELAY_MS};

/// Atomically replaces `target` with `new_binary`.
///
/// Steps:
///   1. Rename `target` → `<target>.backup.<timestamp>` (keeps old binary safe)
///   2. Rename `new_binary` → `target`
///
/// Returns the backup path so the caller can restore on failure.
///
/// On Windows, the rename in step 1 is used as a lock probe — if AV or SCM still
/// holds a handle the rename fails and we retry with backoff.
pub fn replace(target: &Path, new_binary: &Path) -> Result<PathBuf> {
    let backup_path = backup_path_for(target);

    // Step 1: move current binary to backup location (probe + backup in one operation)
    rename_with_retry(target, &backup_path)
        .with_context(|| format!("Failed to move {} to backup", target.display()))?;

    info!("Backed up current binary: {}", backup_path.display());

    // Step 2: move new binary into place
    if let Err(e) = std::fs::rename(new_binary, target) {
        // Activation failed — attempt to restore backup before returning the error
        warn!("Failed to activate new binary, restoring backup: {}", e);
        if let Err(restore_err) = std::fs::rename(&backup_path, target) {
            warn!("Restore also failed: {}", restore_err);
        }
        return Err(anyhow!("Failed to activate new binary: {}", e));
    }

    info!("New binary activated: {}", target.display());
    Ok(backup_path)
}

/// Restores `backup` back to `target`. Used in the rollback path.
pub fn restore(backup: &Path, target: &Path) -> Result<()> {
    // If the failed new binary is still at target, remove it first
    if target.exists() {
        std::fs::remove_file(target)
            .with_context(|| format!("Failed to remove failed binary at {}", target.display()))?;
    }

    std::fs::rename(backup, target)
        .with_context(|| format!("Failed to restore {} to {}", backup.display(), target.display()))?;

    info!("Restored backup to: {}", target.display());
    Ok(())
}

/// Writes binary bytes to a temporary file in the same directory as `target`.
/// Returns the temp file path. The caller is responsible for cleaning up on failure.
pub fn write_temp(bytes: &[u8], target: &Path) -> Result<PathBuf> {
    let dir = target
        .parent()
        .ok_or_else(|| anyhow!("Target path has no parent directory: {}", target.display()))?;

    let temp_path = dir.join(format!(
        ".openframe-client-update-{}.tmp",
        uuid::Uuid::new_v4()
    ));

    std::fs::write(&temp_path, bytes)
        .with_context(|| format!("Failed to write temp binary to {}", temp_path.display()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o755);
        std::fs::set_permissions(&temp_path, perms)
            .with_context(|| format!("Failed to set permissions on {}", temp_path.display()))?;
    }

    info!("Temp binary written: {} ({} bytes)", temp_path.display(), bytes.len());
    Ok(temp_path)
}

fn backup_path_for(target: &Path) -> PathBuf {
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
    let filename = target
        .file_name()
        .map(|n| format!("{}.backup.{}", n.to_string_lossy(), timestamp))
        .unwrap_or_else(|| format!("backup.{}", timestamp));

    target.parent().unwrap_or(Path::new(".")).join(filename)
}

/// On Windows, AV / Defender / SCM can hold a file handle briefly after the
/// service is reported stopped. We use rename as a probe: if it succeeds the
/// file is free; otherwise we wait and retry.
fn rename_with_retry(from: &Path, to: &Path) -> Result<()> {
    for attempt in 1..=REPLACE_MAX_RETRIES {
        match std::fs::rename(from, to) {
            Ok(()) => return Ok(()),
            Err(e) => {
                if attempt == REPLACE_MAX_RETRIES {
                    return Err(anyhow!(
                        "rename failed after {} attempts: {}",
                        REPLACE_MAX_RETRIES,
                        e
                    ));
                }
                warn!(
                    "rename attempt {}/{} failed ({}), retrying in {}ms",
                    attempt, REPLACE_MAX_RETRIES, e, REPLACE_RETRY_DELAY_MS
                );
                std::thread::sleep(std::time::Duration::from_millis(REPLACE_RETRY_DELAY_MS));
            }
        }
    }
    unreachable!()
}
