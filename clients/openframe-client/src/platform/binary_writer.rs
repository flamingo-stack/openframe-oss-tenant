use anyhow::{Context, Result};
use std::path::Path;
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use tracing::{info, warn};

#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;

// Windows ERROR_SHARING_VIOLATION. AV minifilters and other Windows file system
// filter drivers can briefly hold a handle on a freshly-modified or
// recently-stopped binary, causing File::create to fail with this code.
// Retrying with a short backoff almost always succeeds once the scan window closes.
#[cfg(target_os = "windows")]
pub(crate) const SHARING_VIOLATION_OS_ERROR: i32 = 32;

#[cfg(target_os = "windows")]
pub(crate) const WRITE_MAX_RETRIES: u32 = 20;

#[cfg(target_os = "windows")]
pub(crate) const WRITE_RETRY_DELAY: std::time::Duration =
    std::time::Duration::from_millis(500);

pub async fn write_executable(bytes: &[u8], path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await
            .with_context(|| format!("Failed to create directory: {}", parent.display()))?;
    }

    let mut file = create_file_with_retry(path).await?;
    file.write_all(bytes)
        .await
        .with_context(|| format!("Failed to write file: {}", path.display()))?;
    file.flush()
        .await
        .with_context(|| format!("Failed to flush file: {}", path.display()))?;
    drop(file); // Close handle before set_executable_permissions touches metadata.

    set_executable_permissions(path).await?;

    info!("Binary written: {} ({} bytes)", path.display(), bytes.len());
    Ok(())
}

// Open the target for write, retrying on Windows ERROR_SHARING_VIOLATION (32).
// This is the common failure mode when an AV scan, the indexer, or a recently
// stopped service still holds a handle on the file. Up to 10 s of backoff
// (20 attempts × 500 ms) is enough to cover almost all real-world scan windows
// without hanging on a genuinely broken machine.
#[cfg(target_os = "windows")]
async fn create_file_with_retry(path: &Path) -> Result<File> {
    for attempt in 1..=WRITE_MAX_RETRIES {
        match File::create(path).await {
            Ok(f) => {
                if attempt > 1 {
                    info!(
                        "File::create succeeded on attempt {} for {}",
                        attempt,
                        path.display()
                    );
                }
                return Ok(f);
            }
            Err(e)
                if e.raw_os_error() == Some(SHARING_VIOLATION_OS_ERROR)
                    && attempt < WRITE_MAX_RETRIES =>
            {
                warn!(
                    "File locked (attempt {}/{}) on {}: {}. Retrying in {}ms",
                    attempt,
                    WRITE_MAX_RETRIES,
                    path.display(),
                    e,
                    WRITE_RETRY_DELAY.as_millis()
                );
                tokio::time::sleep(WRITE_RETRY_DELAY).await;
            }
            Err(e) => {
                return Err(e).with_context(|| {
                    format!("Failed to create file: {}", path.display())
                });
            }
        }
    }
    unreachable!()
}

#[cfg(not(target_os = "windows"))]
async fn create_file_with_retry(path: &Path) -> Result<File> {
    File::create(path)
        .await
        .with_context(|| format!("Failed to create file: {}", path.display()))
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

    #[cfg(target_os = "windows")]
    {
        set_safe_executable_acl(path).await?;
    }

    #[cfg(all(not(target_family = "unix"), not(target_os = "windows")))]
    {
        let _ = path; // unsupported platform — no-op
    }

    Ok(())
}

// On Windows, write a restrictive ACL that satisfies osquery's `kSafePermissions`
// check (`shutdown.cpp:80` Ref #1382). Without this call the file inherits the
// ACL of its parent directory under `C:\ProgramData\OpenFrame\`, which typically
// grants `BUILTIN\Users: Modify` — and osquery refuses to run any osqueryd whose
// binary is writable by a non-administrative principal, producing the crash
// loop observed on CSW-LT-SALES01.
//
// This is the root-cause fix for that crash. Every executable written by
// `write_executable` (binaries and executable assets alike) inherits the safe
// ACL because `set_executable_permissions` is called by `write_executable` on
// every successful write.
//
// We use icacls.exe rather than the Win32 security API because the same
// shell-out pattern already exists in `platform/uninstall.rs::force_remove_directory`,
// so this doesn't introduce a new dependency surface. Two spawns per executable
// is negligible compared to the file I/O already done.
//
// Principals are referenced by well-known SID so the call is locale-independent
// (works on installs where "Users" is translated):
//   S-1-5-18      LocalSystem
//   S-1-5-32-544  BUILTIN\Administrators
//   S-1-5-32-545  BUILTIN\Users
//   S-1-5-11      Authenticated Users (removed defensively)
//   S-1-1-0       Everyone (removed defensively)
#[cfg(target_os = "windows")]
async fn set_safe_executable_acl(path: &Path) -> Result<()> {
    use tokio::process::Command;

    let path_str = path.to_string_lossy().to_string();

    // Step 1: break inheritance, copying the inherited ACEs to explicit. After
    // this the file's ACL is independent of the parent directory's ACL, so any
    // later change to ProgramData inheritance cannot reintroduce a Users:M ACE.
    let out = Command::new("icacls")
        .args(&[path_str.as_str(), "/inheritance:r"])
        .output()
        .await
        .with_context(|| {
            format!("Failed to spawn icacls /inheritance:r for {}", path_str)
        })?;
    if !out.status.success() {
        return Err(anyhow::anyhow!(
            "icacls /inheritance:r failed for {}: stdout={} stderr={}",
            path_str,
            String::from_utf8_lossy(&out.stdout),
            String::from_utf8_lossy(&out.stderr),
        ));
    }

    // Step 2: replace ACEs for the three principals we want and strip the two
    // we don't. `/grant:r` replaces the user's ACE (rather than adding a second
    // ACE on top). `/remove:g` removes only Grant ACEs (leaving any Deny ACEs
    // an administrator may have set in place).
    let out = Command::new("icacls")
        .args(&[
            path_str.as_str(),
            "/grant:r", "*S-1-5-18:(F)",      // SYSTEM: FullControl
            "/grant:r", "*S-1-5-32-544:(F)",  // Administrators: FullControl
            "/grant:r", "*S-1-5-32-545:(RX)", // Users: ReadAndExecute
            "/remove:g", "*S-1-5-11",         // Authenticated Users (any grant)
            "/remove:g", "*S-1-1-0",          // Everyone (any grant)
        ])
        .output()
        .await
        .with_context(|| {
            format!("Failed to spawn icacls /grant for {}", path_str)
        })?;
    if !out.status.success() {
        return Err(anyhow::anyhow!(
            "icacls /grant failed for {}: stdout={} stderr={}",
            path_str,
            String::from_utf8_lossy(&out.stdout),
            String::from_utf8_lossy(&out.stderr),
        ));
    }

    info!("Applied safe executable ACL to {}", path_str);
    Ok(())
}
