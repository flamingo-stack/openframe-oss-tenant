use anyhow::Result;
use std::path::Path;

#[cfg(target_os = "windows")]
pub async fn ensure_writable(path: &Path) -> Result<()> {
    use tokio::process::Command;
    use tracing::{info, warn};

    let path_str = path.to_string_lossy().to_string();
    info!("Ensuring path is writable: {}", path_str);

    if let Ok(output) = Command::new("attrib")
        .args(["-R", "-S", "-H", "/S", "/D"])
        .arg(&path_str)
        .output()
        .await
    {
        if !output.status.success() {
            warn!("attrib did not clear attributes for {}", path_str);
        }
    }

    if let Ok(output) = Command::new("takeown")
        .arg("/F")
        .arg(&path_str)
        .args(["/R", "/D", "Y"])
        .output()
        .await
    {
        if !output.status.success() {
            warn!("takeown did not take ownership of {}", path_str);
        }
    }

    if let Ok(output) = Command::new("icacls")
        .arg(&path_str)
        .args(["/grant", "*S-1-5-32-544:F", "*S-1-5-18:F", "/T", "/C", "/Q"])
        .output()
        .await
    {
        if !output.status.success() {
            warn!("icacls did not grant permissions for {}", path_str);
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub async fn ensure_writable(_path: &Path) -> Result<()> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub async fn harden_executable(path: &Path) -> Result<()> {
    use tokio::process::Command;
    use tracing::{info, warn};

    let path_str = path.to_string_lossy().to_string();
    info!("Hardening executable to admin-only permissions: {}", path_str);

    if let Ok(output) = Command::new("takeown")
        .arg("/F")
        .arg(&path_str)
        .arg("/A")
        .output()
        .await
    {
        if !output.status.success() {
            warn!("takeown did not set Administrators owner for {}", path_str);
        }
    }

    if let Ok(output) = Command::new("icacls")
        .arg(&path_str)
        .args([
            "/inheritance:r",
            "/grant:r",
            "*S-1-5-18:(F)",
            "*S-1-5-32-544:(F)",
            "*S-1-5-32-545:(RX)",
        ])
        .output()
        .await
    {
        if !output.status.success() {
            warn!("icacls did not harden permissions for {}", path_str);
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub async fn harden_executable(_path: &Path) -> Result<()> {
    Ok(())
}
