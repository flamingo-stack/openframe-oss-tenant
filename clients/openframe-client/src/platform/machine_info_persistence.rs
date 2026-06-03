//! Persisted registration info that survives uninstall/reinstall cycles.

use anyhow::{Context, Result};
use tracing::info;

const MACHINE_ID_KEY: &str = "MachineId";
const CLIENT_SECRET_KEY: &str = "ClientSecret";

/// Registration identity reused across reinstalls.
#[derive(Debug, Clone)]
pub struct PersistedMachineInfo {
    pub machine_id: String,
    pub client_secret: String,
}

/// Reads persisted machine info, returning `Some` only when every value is present.
pub fn read() -> Option<PersistedMachineInfo> {
    read_impl().ok()
}

/// Persists the machine info so a later reinstall can reuse the existing machine.
/// Overwrites any previously stored values.
pub fn write(machine_info: &PersistedMachineInfo) -> Result<()> {
    write_impl(machine_info)?;
    info!("Persisted reinstall machine_info");
    Ok(())
}

#[cfg(target_os = "windows")]
fn read_impl() -> Result<PersistedMachineInfo> {
    Ok(PersistedMachineInfo {
        machine_id: read_value(MACHINE_ID_KEY)?,
        client_secret: read_value(CLIENT_SECRET_KEY)?,
    })
}

#[cfg(target_os = "windows")]
fn read_value(name: &str) -> Result<String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey("SOFTWARE\\OpenFrame")
        .context("OpenFrame registry key not found")?;

    let value: String = key
        .get_value(name)
        .with_context(|| format!("Failed to read {} from registry", name))?;

    if value.is_empty() {
        anyhow::bail!("Registry value {} is empty", name);
    }
    Ok(value)
}

#[cfg(target_os = "windows")]
fn write_impl(machine_info: &PersistedMachineInfo) -> Result<()> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let (key, _) = hklm
        .create_subkey("SOFTWARE\\OpenFrame")
        .context("Failed to create registry key")?;

    restrict_key_acl(&key).context("Failed to secure OpenFrame registry key")?;

    key.set_value(MACHINE_ID_KEY, &machine_info.machine_id)
        .context("Failed to write MachineId to registry")?;
    key.set_value(CLIENT_SECRET_KEY, &machine_info.client_secret)
        .context("Failed to write ClientSecret to registry")?;

    Ok(())
}

/// Replaces the registry key's DACL so only `BUILTIN\Administrators` and
/// `NT AUTHORITY\SYSTEM` may access it.
#[cfg(target_os = "windows")]
fn restrict_key_acl(key: &winreg::RegKey) -> Result<()> {
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::Security::Authorization::{
        ConvertStringSecurityDescriptorToSecurityDescriptorW, SDDL_REVISION_1,
    };
    use windows::Win32::Security::{DACL_SECURITY_INFORMATION, PSECURITY_DESCRIPTOR};
    use windows::Win32::System::Registry::{RegSetKeySecurity, HKEY};

    // D:P              -> protected DACL; do not inherit the world-readable parent ACEs.
    // (A;OICI;KA;;;BA) -> Administrators: full control, inherited by any subkeys.
    // (A;OICI;KA;;;SY) -> SYSTEM:         full control, inherited by any subkeys.
    let sddl: Vec<u16> = "D:P(A;OICI;KA;;;BA)(A;OICI;KA;;;SY)\0"
        .encode_utf16()
        .collect();

    let mut descriptor = PSECURITY_DESCRIPTOR::default();
    unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            PCWSTR(sddl.as_ptr()),
            SDDL_REVISION_1,
            &mut descriptor,
            None,
        )
        .context("Failed to build registry security descriptor")?;

        // `create_subkey` opens with KEY_ALL_ACCESS, which includes WRITE_DAC, so the
        // existing handle is permitted to replace the DACL.
        let result = RegSetKeySecurity(HKEY(key.raw_handle()), DACL_SECURITY_INFORMATION, descriptor);
        let _ = LocalFree(HLOCAL(descriptor.0));
        result.context("Failed to apply restrictive DACL to OpenFrame registry key")?;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
const PREFERENCES_DOMAIN: &str = "/Library/Preferences/com.openframe.client";

#[cfg(target_os = "macos")]
fn read_impl() -> Result<PersistedMachineInfo> {
    Ok(PersistedMachineInfo {
        machine_id: read_value(MACHINE_ID_KEY)?,
        client_secret: read_value(CLIENT_SECRET_KEY)?,
    })
}

#[cfg(target_os = "macos")]
fn read_value(key: &str) -> Result<String> {
    use std::process::Command;

    let output = Command::new("defaults")
        .args(["read", PREFERENCES_DOMAIN, key])
        .output()
        .with_context(|| format!("Failed to execute defaults read for {}", key))?;

    if !output.status.success() {
        anyhow::bail!(
            "defaults read failed for {} (status {})",
            key,
            output.status
        );
    }

    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() {
        anyhow::bail!("defaults value for {} is empty", key);
    }
    Ok(value)
}

#[cfg(target_os = "macos")]
fn write_impl(machine_info: &PersistedMachineInfo) -> Result<()> {
    write_value(MACHINE_ID_KEY, &machine_info.machine_id)?;
    write_value(CLIENT_SECRET_KEY, &machine_info.client_secret)?;
    Ok(())
}

#[cfg(target_os = "macos")]
fn write_value(key: &str, value: &str) -> Result<()> {
    use std::process::Command;

    let status = Command::new("defaults")
        .args(["write", PREFERENCES_DOMAIN, key, "-string", value])
        .status()
        .with_context(|| format!("Failed to execute defaults write for {}", key))?;

    if !status.success() {
        anyhow::bail!("defaults write failed for {} (status {})", key, status);
    }
    Ok(())
}

#[cfg(target_os = "linux")]
const CONFIG_DIR: &str = "/etc/openframe";
#[cfg(target_os = "linux")]
const MACHINE_ID_FILE: &str = "machine_id";
#[cfg(target_os = "linux")]
const CLIENT_SECRET_FILE: &str = "client_secret";

#[cfg(target_os = "linux")]
fn read_impl() -> Result<PersistedMachineInfo> {
    Ok(PersistedMachineInfo {
        machine_id: read_value(MACHINE_ID_FILE)?,
        client_secret: read_value(CLIENT_SECRET_FILE)?,
    })
}

#[cfg(target_os = "linux")]
fn read_value(name: &str) -> Result<String> {
    let path = std::path::Path::new(CONFIG_DIR).join(name);
    let value = std::fs::read_to_string(&path)
        .with_context(|| format!("Failed to read {}", path.display()))?
        .trim()
        .to_string();

    if value.is_empty() {
        anyhow::bail!("{} is empty", path.display());
    }
    Ok(value)
}

#[cfg(target_os = "linux")]
fn write_impl(machine_info: &PersistedMachineInfo) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    let dir = std::path::Path::new(CONFIG_DIR);
    std::fs::create_dir_all(dir).context("Failed to create /etc/openframe")?;
    let _ = std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700));

    std::fs::write(dir.join(MACHINE_ID_FILE), &machine_info.machine_id)
        .context("Failed to write machine_id")?;

    let secret_path = dir.join(CLIENT_SECRET_FILE);
    std::fs::write(&secret_path, &machine_info.client_secret)
        .context("Failed to write client_secret")?;
    let _ = std::fs::set_permissions(&secret_path, std::fs::Permissions::from_mode(0o600));

    Ok(())
}
