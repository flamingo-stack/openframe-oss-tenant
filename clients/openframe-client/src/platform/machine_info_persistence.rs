//! Persisted registration info that survives uninstall/reinstall cycles.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// Slot holding the single JSON record (registry value / plist key).
#[cfg(any(target_os = "windows", target_os = "macos"))]
const RECORD_KEY: &str = "MachineInfo";

/// Registration identity reused across reinstalls.
#[derive(Clone, Serialize, Deserialize)]
pub struct PersistedMachineInfo {
    pub machine_id: String,
    pub client_secret: String,
}

// Manual Debug so `{:?}` never leaks the live client secret.
impl std::fmt::Debug for PersistedMachineInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PersistedMachineInfo")
            .field("machine_id", &self.machine_id)
            .field("client_secret", &"<redacted>")
            .finish()
    }
}

/// Persists the machine info, overwriting any previous values.
pub fn write(machine_info: &PersistedMachineInfo) -> Result<()> {
    // Never persist a record `read()` would later reject as incomplete.
    ensure_complete(machine_info)?;
    write_impl(machine_info)?;
    info!("Persisted reinstall machine_info");
    Ok(())
}

/// Reads the persisted machine info.
///
/// - `Ok(Some(info))` — credentials found; reuse them to reinstall.
/// - `Ok(None)` — the store is confirmed missing, so a fresh install is safe.
/// - `Err(_)` — the store exists but could not be read (locked, corrupt,
///   partial, permission-denied)
pub fn read() -> Result<Option<PersistedMachineInfo>> {
    match read_once() {
        Err(e) if is_permission_denied(&e) => {
            warn!("Permission denied reading persisted machine info; repairing permissions and retrying");
            repair_permissions()
                .context("Failed to repair permissions on the machine info store")?;
            read_once().context("Read still failed after repairing store permissions")
        }
        other => other,
    }
}

/// JSON-encode the record.
fn serialize(info: &PersistedMachineInfo) -> Result<String> {
    serde_json::to_string(info).context("Failed to serialize machine info")
}

/// Decode and validate a JSON record.
fn deserialize(raw: &str) -> Result<PersistedMachineInfo> {
    let info: PersistedMachineInfo = serde_json::from_str(raw.trim())
        .context("Persisted machine info is corrupt (invalid JSON)")?;
    ensure_complete(&info)?;
    Ok(info)
}

/// Reject records missing either field.
fn ensure_complete(info: &PersistedMachineInfo) -> Result<()> {
    if info.machine_id.trim().is_empty() || info.client_secret.trim().is_empty() {
        anyhow::bail!("Persisted machine info is incomplete (empty field)");
    }
    Ok(())
}

/// True if any error in the chain is an OS permission-denied error.
pub fn is_permission_denied(err: &anyhow::Error) -> bool {
    err.chain().any(|cause| {
        cause.downcast_ref::<std::io::Error>().map_or(false, |io| {
            io.kind() == std::io::ErrorKind::PermissionDenied
        })
    })
}

// Windows: HKLM\SOFTWARE\OpenFrame, single REG_SZ value `MachineInfo`.

#[cfg(target_os = "windows")]
fn read_once() -> Result<Option<PersistedMachineInfo>> {
    use std::io::ErrorKind;
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = match hklm.open_subkey("SOFTWARE\\OpenFrame") {
        Ok(key) => key,
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e).context("Failed to open OpenFrame registry key"),
    };

    let record: std::io::Result<String> = key.get_value(RECORD_KEY);
    match record {
        Ok(raw) => Ok(Some(deserialize(&raw)?)),
        Err(e) if e.kind() == ErrorKind::NotFound => {
            anyhow::bail!("OpenFrame registry key exists but holds no machine info (corrupt or partial write)")
        }
        Err(e) => Err(e).context("Failed to read MachineInfo from registry"),
    }
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

    // Single atomic write.
    let record = serialize(machine_info)?;
    key.set_value(RECORD_KEY, &record)
        .context("Failed to write MachineInfo to registry")?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn repair_permissions() -> Result<()> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey_with_flags("SOFTWARE\\OpenFrame", KEY_ALL_ACCESS)
        .context("Failed to open OpenFrame registry key to repair its ACL")?;
    restrict_key_acl(&key).context("Failed to re-apply ACL to OpenFrame registry key")
}

/// Restricts the key's DACL to Administrators and SYSTEM.
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

        let result = RegSetKeySecurity(
            HKEY(key.raw_handle()),
            DACL_SECURITY_INFORMATION,
            descriptor,
        );
        // Free the descriptor allocated above; nothing actionable on failure.
        let _ = LocalFree(HLOCAL(descriptor.0));
        result.context("Failed to apply restrictive DACL to OpenFrame registry key")?;
    }

    Ok(())
}

// macOS: /Library/Preferences/com.openframe.client.plist, single key `MachineInfo`.

#[cfg(target_os = "macos")]
const PREFERENCES_DOMAIN: &str = "/Library/Preferences/com.openframe.client";

#[cfg(target_os = "macos")]
fn plist_path() -> String {
    format!("{}.plist", PREFERENCES_DOMAIN)
}

#[cfg(target_os = "macos")]
fn read_once() -> Result<Option<PersistedMachineInfo>> {
    let plist_path = plist_path();
    if !std::path::Path::new(&plist_path)
        .try_exists()
        .with_context(|| format!("Failed to check whether {} exists", plist_path))?
    {
        return Ok(None);
    }

    // The data is read via `defaults`, whose permission failures surface as a
    // generic subprocess error that `read()`'s repair path cannot recognize.
    // Probe readability directly first so a denied read yields a real
    // `io::ErrorKind::PermissionDenied`, which the repair path can act on.
    if let Err(e) = std::fs::File::open(&plist_path) {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            return Err(e).with_context(|| format!("Permission denied reading {}", plist_path));
        }
    }

    match read_default(RECORD_KEY)? {
        Some(raw) => Ok(Some(deserialize(&raw)?)),
        None => anyhow::bail!("plist exists but holds no machine info (corrupt or partial write)"),
    }
}

/// Reads a single `defaults` key; `Ok(None)` if absent.
#[cfg(target_os = "macos")]
fn read_default(key: &str) -> Result<Option<String>> {
    use std::process::Command;

    let output = Command::new("defaults")
        .args(["read", PREFERENCES_DOMAIN, key])
        .output()
        .with_context(|| format!("Failed to execute defaults read for {}", key))?;

    if output.status.success() {
        return Ok(Some(
            String::from_utf8_lossy(&output.stdout).trim().to_string(),
        ));
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("does not exist") {
        Ok(None)
    } else {
        anyhow::bail!("defaults read failed for {}: {}", key, stderr.trim());
    }
}

#[cfg(target_os = "macos")]
fn write_impl(machine_info: &PersistedMachineInfo) -> Result<()> {
    use std::process::Command;

    // Single atomic write.
    let record = serialize(machine_info)?;
    let status = Command::new("defaults")
        .args(["write", PREFERENCES_DOMAIN, RECORD_KEY, "-string", &record])
        .status()
        .context("Failed to execute defaults write for MachineInfo")?;
    if !status.success() {
        anyhow::bail!("defaults write failed for MachineInfo (status {})", status);
    }

    // `defaults` creates the plist group/other-readable, so there is a brief
    // window before we tighten it. Lock it to owner-only and verify; if it
    // cannot be secured, delete it rather than leave the client secret exposed.
    let plist_path = plist_path();
    if let Err(e) = secure_plist(&plist_path) {
        let _ = std::fs::remove_file(&plist_path);
        return Err(e);
    }

    Ok(())
}

/// Restricts the plist to owner read/write and verifies no group/other access remains.
#[cfg(target_os = "macos")]
fn secure_plist(plist_path: &str) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    std::fs::set_permissions(plist_path, std::fs::Permissions::from_mode(0o600))
        .with_context(|| format!("Failed to set permissions for {}", plist_path))?;

    let mode = std::fs::metadata(plist_path)
        .with_context(|| format!("Failed to stat {}", plist_path))?
        .permissions()
        .mode();
    if mode & 0o077 != 0 {
        anyhow::bail!(
            "{} is still group/other-accessible after chmod (mode {:o})",
            plist_path,
            mode
        );
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn repair_permissions() -> Result<()> {
    let plist_path = plist_path();
    if std::path::Path::new(&plist_path)
        .try_exists()
        .unwrap_or(false)
    {
        secure_plist(&plist_path)?;
    }
    Ok(())
}

// Linux: /etc/openframe/machine.json (single record), 0700 dir / 0600 file.

#[cfg(target_os = "linux")]
const CONFIG_DIR: &str = "/etc/openframe";
#[cfg(target_os = "linux")]
const RECORD_FILE: &str = "machine.json";

#[cfg(target_os = "linux")]
fn read_once() -> Result<Option<PersistedMachineInfo>> {
    let dir = std::path::Path::new(CONFIG_DIR);
    if !dir
        .try_exists()
        .with_context(|| format!("Failed to check whether {} exists", CONFIG_DIR))?
    {
        return Ok(None);
    }

    let record_path = dir.join(RECORD_FILE);
    if !record_path
        .try_exists()
        .with_context(|| format!("Failed to check whether {} exists", record_path.display()))?
    {
        anyhow::bail!(
            "{} exists but holds no machine info (corrupt or partial write)",
            CONFIG_DIR
        );
    }

    let raw = std::fs::read_to_string(&record_path)
        .with_context(|| format!("Failed to read {}", record_path.display()))?;
    Ok(Some(deserialize(&raw)?))
}

#[cfg(target_os = "linux")]
fn write_impl(machine_info: &PersistedMachineInfo) -> Result<()> {
    use std::io::Write;
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

    let dir = std::path::Path::new(CONFIG_DIR);
    std::fs::create_dir_all(dir).context("Failed to create /etc/openframe")?;
    std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700))
        .context("Failed to set permissions for CONFIG_DIR")?;

    let record = serialize(machine_info)?;

    // Atomic write: temp file, fsync, rename.
    let record_path = dir.join(RECORD_FILE);
    let tmp_path = dir.join(".machine.json.tmp");
    {
        let mut tmp = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&tmp_path)
            .with_context(|| format!("Failed to create {}", tmp_path.display()))?;
        tmp.write_all(record.as_bytes())
            .context("Failed to write machine info record")?;
        tmp.sync_all()
            .context("Failed to fsync machine info record")?;
    }
    std::fs::rename(&tmp_path, &record_path)
        .with_context(|| format!("Failed to move record into {}", record_path.display()))?;
    // Best-effort durability of the rename; the data is already safely fsynced.
    let _ = std::fs::File::open(dir).and_then(|d| d.sync_all());

    Ok(())
}

#[cfg(target_os = "linux")]
fn repair_permissions() -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    let dir = std::path::Path::new(CONFIG_DIR);
    if dir.try_exists().unwrap_or(false) {
        std::fs::set_permissions(dir, std::fs::Permissions::from_mode(0o700))
            .context("Failed to reset permissions on /etc/openframe")?;
    }
    let record_path = dir.join(RECORD_FILE);
    if record_path.try_exists().unwrap_or(false) {
        std::fs::set_permissions(&record_path, std::fs::Permissions::from_mode(0o600))
            .with_context(|| format!("Failed to reset permissions on {}", record_path.display()))?;
    }
    Ok(())
}
