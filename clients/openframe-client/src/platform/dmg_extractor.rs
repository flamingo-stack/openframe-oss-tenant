use anyhow::{anyhow, Context, Result};
use bytes::Bytes;
use std::path::Path;
use tracing::{info, warn};

#[cfg(target_os = "macos")]
use tokio::fs;
#[cfg(target_os = "macos")]
use tokio::process::Command;

#[derive(Clone)]
pub struct DmgExtractor;

impl DmgExtractor {
    pub fn new() -> Self {
        Self
    }

    #[cfg(target_os = "macos")]
    pub async fn extract_all(&self, dmg_bytes: Bytes, target_dir: &Path, source_path: Option<&str>) -> Result<()> {
        info!("[DMG] extract_all: target_dir={}, source_path={:?}, dmg size={} bytes",
            target_dir.display(), source_path, dmg_bytes.len());

        let temp_dir = std::env::temp_dir();
        let dmg_id = uuid::Uuid::new_v4();
        let dmg_path = temp_dir.join(format!("{}.dmg", dmg_id));
        let mount_point = temp_dir.join(format!("mnt_{}", dmg_id));

        info!("[DMG] temp dmg_path={}, mount_point={}", dmg_path.display(), mount_point.display());

        fs::write(&dmg_path, &dmg_bytes).await
            .with_context(|| format!("Failed to write DMG to temp file: {}", dmg_path.display()))?;
        info!("[DMG] DMG written to temp file ({} bytes)", dmg_bytes.len());

        self.mount(&dmg_path, &mount_point).await
            .with_context(|| "Failed to mount DMG")?;

        let source = match source_path {
            Some(path) => {
                let s = mount_point.join(path);
                info!("[DMG] Using source_path within mount: {}", s.display());
                s
            },
            None => {
                info!("[DMG] No source_path, copying entire mount point");
                mount_point.clone()
            },
        };

        if let Some(name) = source.file_name() {
            let dest = target_dir.join(name);
            if dest.is_symlink() {
                info!("[DMG] Removing existing symlink: {}", dest.display());
                let _ = fs::remove_file(&dest).await;
            } else if dest.exists() {
                info!("[DMG] Removing existing directory: {}", dest.display());
                let _ = fs::remove_dir_all(&dest).await;
            }
        }

        info!("[DMG] Copying: {} -> {}", source.display(), target_dir.display());

        let result = self.copy_recursive(&source, target_dir).await
            .with_context(|| format!("Failed to copy from {} to {}", source.display(), target_dir.display()));

        match &result {
            Ok(()) => info!("[DMG] Copy successful"),
            Err(e) => warn!("[DMG] Copy failed: {:#}", e),
        }

        if let Err(e) = self.unmount(&mount_point).await {
            warn!("[DMG] Failed to unmount: {:#}", e);
        }
        if let Err(e) = fs::remove_file(&dmg_path).await {
            warn!("[DMG] Failed to remove temp DMG file: {:#}", e);
        }

        if result.is_ok() {
            if let Some(name) = source.file_name() {
                let copied = target_dir.join(name);
                info!("[DMG] Verifying copied item: {}, exists={}", copied.display(), copied.exists());
            }
        }

        result
    }

    #[cfg(not(target_os = "macos"))]
    pub async fn extract_all(&self, _dmg_bytes: Bytes, target_dir: &Path, _source_path: Option<&str>) -> Result<()> {
        Err(anyhow!("DMG extraction is only supported on macOS. Target: {}", target_dir.display()))
    }

    #[cfg(target_os = "macos")]
    async fn mount(&self, dmg_path: &Path, mount_point: &Path) -> Result<()> {
        fs::create_dir_all(mount_point).await
            .with_context(|| format!("Failed to create mount point: {}", mount_point.display()))?;

        info!("[DMG] Mounting: hdiutil attach -nobrowse -readonly -mountpoint {} {}",
            mount_point.display(), dmg_path.display());

        let output = Command::new("hdiutil")
            .args(["attach", "-nobrowse", "-readonly", "-mountpoint"])
            .arg(mount_point)
            .arg(dmg_path)
            .output()
            .await
            .context("Failed to execute hdiutil attach")?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        info!("[DMG] hdiutil attach exit={}, stdout={}, stderr={}", output.status, stdout.trim(), stderr.trim());

        if !output.status.success() {
            return Err(anyhow!("hdiutil attach failed (exit {}): {}", output.status, stderr));
        }

        info!("[DMG] Mounted successfully at {}", mount_point.display());
        Ok(())
    }

    #[cfg(target_os = "macos")]
    async fn unmount(&self, mount_point: &Path) -> Result<()> {
        info!("[DMG] Unmounting: hdiutil detach {}", mount_point.display());

        let output = Command::new("hdiutil")
            .args(["detach", "-quiet"])
            .arg(mount_point)
            .output()
            .await
            .context("Failed to execute hdiutil detach")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow!("hdiutil detach failed: {}", stderr));
        }

        let _ = fs::remove_dir(mount_point).await;

        info!("[DMG] Unmounted successfully");
        Ok(())
    }

    #[cfg(target_os = "macos")]
    async fn copy_recursive(&self, source: &Path, target: &Path) -> Result<()> {
        info!("[DMG] Running: cp -R {} {}", source.display(), target.display());

        let output = Command::new("cp")
            .args(["-R"])
            .arg(source)
            .arg(target)
            .output()
            .await
            .context("Failed to execute cp -R")?;

        let stderr = String::from_utf8_lossy(&output.stderr);
        if !output.status.success() {
            return Err(anyhow!("cp -R failed (exit {}): {}", output.status, stderr));
        }

        info!("[DMG] cp -R completed successfully");
        Ok(())
    }
}

impl Default for DmgExtractor {
    fn default() -> Self {
        Self::new()
    }
}
