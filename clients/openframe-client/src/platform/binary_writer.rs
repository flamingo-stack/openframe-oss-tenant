use anyhow::{Context, Result};
use std::path::Path;
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tracing::info;

#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;

pub async fn write_executable(bytes: &[u8], path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }

    File::create(path)
        .await
        .with_context(|| format!("Failed to create file: {}", path.display()))?
        .write_all(bytes)
        .await
        .with_context(|| format!("Failed to write file: {}", path.display()))?;

    set_executable_permissions(path).await?;

    info!("Binary written: {} ({} bytes)", path.display(), bytes.len());
    Ok(())
}

pub async fn set_executable_permissions(path: &Path) -> Result<()> {
    #[cfg(target_family = "unix")]
    {
        let mut perms = fs::metadata(path)
            .await
            .with_context(|| format!("Failed to get metadata: {}", path.display()))?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms)
            .await
            .with_context(|| format!("Failed to set permissions: {}", path.display()))?;
    }

    #[cfg(not(target_family = "unix"))]
    {
        let _ = path; // suppress unused warning
    }

    Ok(())
}
