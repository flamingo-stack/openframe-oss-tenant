//! Persistent machine ID storage that survives uninstall/reinstall cycles.

use anyhow::{Context, Result};
use tracing::info;

const MACHINE_ID_KEY: &str = "MachineId";

pub fn read() -> Option<String> {
    read_impl().ok().flatten()
}

pub fn write(machine_id: &str) -> Result<()> {
    write_impl(machine_id)
}

#[cfg(target_os = "windows")]
fn read_impl() -> Result<Option<String>> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let Ok(key) = hklm.open_subkey("SOFTWARE\\OpenFrame") else {
        return Ok(None);
    };

    match key.get_value::<String, _>(MACHINE_ID_KEY) {
        Ok(id) if !id.is_empty() => Ok(Some(id)),
        _ => Ok(None),
    }
}

#[cfg(target_os = "windows")]
fn write_impl(machine_id: &str) -> Result<()> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let (key, _) = hklm
        .create_subkey("SOFTWARE\\OpenFrame")
        .context("Failed to create registry key")?;

    key.set_value(MACHINE_ID_KEY, &machine_id)
        .context("Failed to write MachineId to registry")?;

    info!("Persisted machine_id to registry");
    Ok(())
}

#[cfg(target_os = "macos")]
fn read_impl() -> Result<Option<String>> {
    use std::process::Command;

    let output = Command::new("defaults")
        .args(["read", "/Library/Preferences/com.openframe.client", MACHINE_ID_KEY])
        .output()
        .context("Failed to execute defaults read")?;

    if output.status.success() {
        let id = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !id.is_empty() {
            return Ok(Some(id));
        }
    }
    Ok(None)
}

#[cfg(target_os = "macos")]
fn write_impl(machine_id: &str) -> Result<()> {
    use std::process::Command;

    let status = Command::new("defaults")
        .args(["write", "/Library/Preferences/com.openframe.client", MACHINE_ID_KEY, "-string", machine_id])
        .status()
        .context("Failed to execute defaults write")?;

    if !status.success() {
        anyhow::bail!("defaults write failed: {}", status);
    }

    info!("Persisted machine_id to system preferences");
    Ok(())
}

#[cfg(target_os = "linux")]
fn read_impl() -> Result<Option<String>> {
    let path = std::path::Path::new("/etc/openframe/machine_id");
    if !path.exists() {
        return Ok(None);
    }

    let id = std::fs::read_to_string(path)
        .context("Failed to read /etc/openframe/machine_id")?
        .trim()
        .to_string();

    Ok(if id.is_empty() { None } else { Some(id) })
}

#[cfg(target_os = "linux")]
fn write_impl(machine_id: &str) -> Result<()> {
    let dir = std::path::Path::new("/etc/openframe");
    if !dir.exists() {
        std::fs::create_dir_all(dir).context("Failed to create /etc/openframe")?;
    }

    std::fs::write(dir.join("machine_id"), machine_id)
        .context("Failed to write /etc/openframe/machine_id")?;

    info!("Persisted machine_id to /etc/openframe/machine_id");
    Ok(())
}
