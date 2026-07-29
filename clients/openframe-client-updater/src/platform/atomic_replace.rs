use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use tracing::{info, warn};

use crate::config::updater_config::{REPLACE_MAX_RETRIES, REPLACE_RETRY_DELAY_MS};

/// Replaces the target binary with a new binary while preserving the original at a timestamped backup path.
///
/// If activation fails, the function attempts to restore the original binary. On success, returns
/// the backup path for potential later restoration.
///
/// # Examples
///
/// ```
/// use std::fs;
///
/// let dir = std::env::temp_dir().join(format!("atomic-replace-{}", std::process::id()));
/// fs::create_dir_all(&dir).unwrap();
/// let target = dir.join("app");
/// let new_binary = dir.join("app.new");
/// fs::write(&target, b"old").unwrap();
/// fs::write(&new_binary, b"new").unwrap();
///
/// let backup = replace(&target, &new_binary).unwrap();
///
/// assert_eq!(fs::read(&target).unwrap(), b"new");
/// assert_eq!(fs::read(backup).unwrap(), b"old");
///
/// fs::remove_dir_all(dir).unwrap();
/// ```
pub fn replace(target: &Path, new_binary: &Path) -> Result<PathBuf> {
    let backup_path = backup_path_for(target);

    rename_with_retry(target, &backup_path)
        .with_context(|| format!("Failed to move {} to backup", target.display()))?;

    info!("Backed up current binary: {}", backup_path.display());

    if let Err(e) = std::fs::rename(new_binary, target) {
        warn!("Failed to activate new binary, restoring backup: {}", e);
        if let Err(restore_err) = std::fs::rename(&backup_path, target) {
            warn!("Restore also failed: {}", restore_err);
        }
        return Err(anyhow!("Failed to activate new binary: {}", e));
    }

    info!("New binary activated: {}", target.display());
    Ok(backup_path)
}

/// Restores a backup file to the target path, replacing any existing target.
///
/// # Parameters
///
/// * `backup` - Path to the backup file to restore.
/// * `target` - Path where the backup should be restored.
///
/// # Examples
///
/// ```
/// # use std::fs;
/// # use std::path::PathBuf;
/// # let dir = std::env::temp_dir().join("openframe-restore-example");
/// # let _ = fs::remove_dir_all(&dir);
/// # fs::create_dir_all(&dir)?;
/// # let backup = dir.join("backup");
/// # let target = dir.join("target");
/// # fs::write(&backup, b"previous binary")?;
/// restore(&backup, &target)?;
/// assert_eq!(fs::read(&target)?, b"previous binary");
/// # fs::remove_dir_all(dir)?;
/// # Ok::<(), Box<dyn std::error::Error>>(())
/// ```
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

/// Restores a target binary by copying a reserve file while preserving the reserve.
///
/// On Unix, the restored target is assigned executable permissions.
///
/// # Examples
///
/// ```no_run
/// use std::path::Path;
///
/// restore_copy(
///     Path::new("/path/to/last-known-good"),
///     Path::new("/path/to/target"),
/// )?;
/// # Ok::<(), anyhow::Error>(())
/// ```
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

/// Writes bytes to a uniquely named temporary file beside `target`, making it suitable for a later atomic rename.
///
/// On Unix, the temporary file is made executable and the containing directory is synchronized.
///
/// # Errors
///
/// Returns an error if the target has no parent directory or if creating, writing, synchronizing, or configuring the temporary file fails.
///
/// # Examples
///
/// ```
/// let target = std::env::temp_dir().join("openframe-client");
/// let temp = write_temp(b"binary contents", &target).unwrap();
///
/// assert_eq!(std::fs::read(&temp).unwrap(), b"binary contents");
/// std::fs::remove_file(temp).unwrap();
/// ```
pub
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

/// Builds a timestamped backup path in the target's parent directory.
///
/// # Examples
///
/// ```
/// use std::path::Path;
///
/// let backup = backup_path_for(Path::new("app"));
/// assert!(backup
///     .file_name()
///     .unwrap()
///     .to_string_lossy()
///     .starts_with("app.backup."));
/// ```
fn backup_path_for(target: &Path) -> PathBuf {
    let timestamp = chrono::Utc::now().format("%Y%m%d%H%M%S");
    let filename = target
        .file_name()
        .map(|n| format!("{}.backup.{}", n.to_string_lossy(), timestamp))
        .unwrap_or_else(|| format!("backup.{}", timestamp));

    target.parent().unwrap_or(Path::new(".")).join(filename)
}

// On Windows, AV/SCM can hold the handle briefly after service stop — rename is the probe.
/// Renames a file, retrying failed attempts before returning an error.
///
/// # Errors
///
/// Returns an error if the rename fails on every configured attempt.
///
/// # Examples
///
/// ```
/// let dir = std::env::temp_dir();
/// let from = dir.join(format!("rename-source-{}", std::process::id()));
/// let to = dir.join(format!("rename-target-{}", std::process::id()));
///
/// std::fs::write(&from, b"content").unwrap();
/// rename_with_retry(&from, &to).unwrap();
///
/// assert!(to.exists());
/// std::fs::remove_file(to).unwrap();
/// ```
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
