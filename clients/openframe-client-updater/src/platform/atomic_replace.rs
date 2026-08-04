use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use tracing::{info, warn};

use crate::config::updater_config::{REPLACE_MAX_RETRIES, REPLACE_RETRY_DELAY_MS};

/// Renames `target` to `backup_path`, then renames `new_binary` to `target`.
/// The caller persists `backup_path` before calling, so crash recovery can
/// find the backup even if this never returns.
pub fn replace(target: &Path, new_binary: &Path, backup_path: &Path) -> Result<()> {
    if target.exists() {
        rename_with_retry(target, backup_path)
            .with_context(|| format!("Failed to move {} to backup", target.display()))?;
        info!("Backed up current binary: {}", backup_path.display());
    } else {
        warn!(
            "No binary at {} — installing new binary directly",
            target.display()
        );
    }

    if let Err(e) = rename_with_retry(new_binary, target) {
        warn!("Failed to activate new binary, restoring backup: {:#}", e);
        if backup_path.exists() {
            if let Err(restore_err) = rename_with_retry(backup_path, target) {
                warn!("Restore also failed: {:#}", restore_err);
            }
        }
        return Err(anyhow!("Failed to activate new binary: {}", e));
    }

    info!("New binary activated: {}", target.display());
    Ok(())
}

pub fn restore(backup: &Path, target: &Path) -> Result<()> {
    if target.exists() {
        std::fs::remove_file(target)
            .with_context(|| format!("Failed to remove failed binary at {}", target.display()))?;
    }

    std::fs::rename(backup, target).with_context(|| {
        format!(
            "Failed to restore {} to {}",
            backup.display(),
            target.display()
        )
    })?;

    info!("Restored backup to: {}", target.display());
    Ok(())
}

/// Restores `source` to `target` by copy, leaving `source` in place.
/// Used for the last-known-good reserve, which must survive the rollback.
pub fn restore_copy(source: &Path, target: &Path) -> Result<()> {
    if target.exists() {
        std::fs::remove_file(target)
            .with_context(|| format!("Failed to remove failed binary at {}", target.display()))?;
    }

    std::fs::copy(source, target).with_context(|| {
        format!(
            "Failed to copy {} to {}",
            source.display(),
            target.display()
        )
    })?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o755);
        std::fs::set_permissions(target, perms)
            .with_context(|| format!("Failed to set permissions on {}", target.display()))?;
    }

    info!("Restored reserve copy to: {}", target.display());
    Ok(())
}

/// Writes bytes to a temp file in the same directory as `target` (same filesystem → atomic rename).
pub fn write_temp(bytes: &[u8], target: &Path) -> Result<PathBuf> {
    let dir = target
        .parent()
        .ok_or_else(|| anyhow!("Target path has no parent directory: {}", target.display()))?;

    let temp_path = dir.join(format!(
        ".openframe-client-update-{}.tmp",
        uuid::Uuid::new_v4()
    ));

    {
        use std::io::Write;
        let mut file = std::fs::File::create(&temp_path)
            .with_context(|| format!("Failed to create temp binary at {}", temp_path.display()))?;
        file.write_all(bytes)
            .with_context(|| format!("Failed to write temp binary to {}", temp_path.display()))?;
        file.sync_all()
            .with_context(|| format!("Failed to sync temp binary at {}", temp_path.display()))?;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o755);
        std::fs::set_permissions(&temp_path, perms)
            .with_context(|| format!("Failed to set permissions on {}", temp_path.display()))?;
        let dir_handle = std::fs::File::open(dir)
            .with_context(|| format!("Failed to open {} for directory sync", dir.display()))?;
        dir_handle
            .sync_all()
            .with_context(|| format!("Failed to sync directory {}", dir.display()))?;
    }

    info!(
        "Temp binary written: {} ({} bytes)",
        temp_path.display(),
        bytes.len()
    );
    Ok(temp_path)
}

pub fn backup_path_for(target: &Path) -> PathBuf {
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
    let filename = target
        .file_name()
        .map(|n| format!("{}.backup.{}", n.to_string_lossy(), timestamp))
        .unwrap_or_else(|| format!("backup.{}", timestamp));

    target.parent().unwrap_or(Path::new(".")).join(filename)
}

// On Windows, AV/SCM can hold the handle briefly after service stop — rename is the probe.
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

#[cfg(test)]
#[path = "atomic_replace_tests.rs"]
mod tests;
