//! Registry-independent removal of orphaned tools.
//!
//! [`ToolUninstallService`](crate::services::ToolUninstallService) can only remove tools OpenFrame
//! installed itself (they must be in `installed_tools.json`). A tool installed outside OpenFrame
//! management — e.g. a Tactical RMM agent left from a previous product that keeps hammering the
//! gateway — is absent from that registry, so the native uninstall no-ops. This service removes
//! such orphans by their fixed vendor coordinates ([`orphan_tool_recipes`]), via two entry points:
//! `purge_if_orphan` (driven by the tool-uninstall NATS message) and `reconcile_all` (startup).
//! Every step is best-effort and idempotent.

use anyhow::Result;
use tracing::{info, warn};

use crate::services::orphan_tool_recipes::{self, OrphanRecipe};
use crate::services::InstalledToolsService;

#[derive(Clone)]
pub struct OrphanPurgeService {
    installed_tools_service: InstalledToolsService,
}

impl OrphanPurgeService {
    pub fn new(installed_tools_service: InstalledToolsService) -> Self {
        Self { installed_tools_service }
    }

    /// Called for a `tool_agent_id` not found in the local registry.
    /// `Ok(true)` = we have a recipe (purged, or already absent) → caller ACKs.
    /// `Ok(false)` = no recipe → caller keeps the "nothing to do" behaviour.
    /// `Err(_)` = a step failed while the tool was present → caller leaves the message for redelivery.
    pub async fn purge_if_orphan(&self, tool_agent_id: &str) -> Result<bool> {
        let Some(recipe) = orphan_tool_recipes::get(tool_agent_id) else {
            return Ok(false);
        };

        if !Self::is_present(recipe).await {
            info!("Orphan purge: {} not present on this host, nothing to remove", recipe.display_name);
            return Ok(true);
        }

        info!("Orphan purge: removing unmanaged {}", recipe.display_name);
        self.purge(recipe).await?;
        Ok(true)
    }

    /// Startup reconcile: purge any known recipe that is present on this host but not managed by
    /// OpenFrame. Best-effort; never errors.
    pub async fn reconcile_all(&self) {
        for recipe in orphan_tool_recipes::RECIPES.iter().copied() {
            if !Self::is_present(recipe).await {
                continue;
            }

            match self.installed_tools_service.get_by_tool_agent_id(recipe.tool_agent_id).await {
                // OpenFrame manages this install — the normal uninstall path owns it.
                Ok(Some(_)) => info!("Orphan reconcile: {} present but OpenFrame-managed, skipping", recipe.display_name),
                Ok(None) => {
                    warn!("Orphan reconcile: {} present but UNMANAGED — purging", recipe.display_name);
                    if let Err(e) = self.purge(recipe).await {
                        warn!("Orphan reconcile: purge of {} failed (retry next start): {:#}", recipe.display_name, e);
                    }
                }
                Err(e) => warn!("Orphan reconcile: registry check for {} failed: {:#}", recipe.display_name, e),
            }
        }
    }

    async fn is_present(recipe: &OrphanRecipe) -> bool {
        #[cfg(target_os = "windows")]
        {
            use tokio::process::Command;
            match Command::new("sc").args(["query", recipe.win_service]).output().await {
                Ok(out) => out.status.success(),
                Err(_) => std::path::Path::new(recipe.win_program_dir).exists(),
            }
        }
        #[cfg(target_os = "macos")]
        {
            let plist = format!("/Library/LaunchDaemons/{}.plist", recipe.mac_service);
            std::path::Path::new(&plist).exists()
                || recipe.unix_dirs.iter().any(|d| std::path::Path::new(d).exists())
        }
        #[cfg(all(unix, not(target_os = "macos")))]
        {
            recipe.unix_dirs.iter().any(|d| std::path::Path::new(d).exists())
        }
    }

    /// Remove the tool by its fixed vendor coordinates. Steps log and continue on failure.
    async fn purge(&self, recipe: &OrphanRecipe) -> Result<()> {
        #[cfg(target_os = "windows")]
        {
            use tokio::process::Command;

            // Stop + force-kill + delete the SCM service.
            if let Err(e) = crate::platform::system_service::stop_service(recipe.win_service, true).await {
                warn!("Orphan purge: stop/delete service {} failed (continuing): {:#}", recipe.win_service, e);
            }

            // Run the vendor's silent Inno uninstaller if present.
            let program_dir = std::path::Path::new(recipe.win_program_dir);
            if program_dir.exists() {
                if let Some(uninstaller) = find_windows_uninstaller(program_dir, recipe.win_uninstaller_glob) {
                    info!("Orphan purge: running silent uninstaller {}", uninstaller.display());
                    let run = Command::new("cmd")
                        .arg("/C")
                        .arg(&uninstaller)
                        .args(["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"])
                        .output()
                        .await;
                    if let Err(e) = run {
                        warn!("Orphan purge: uninstaller launch failed (continuing): {:#}", e);
                    }
                    // Inno relaunches from a temp copy and returns immediately.
                    tokio::time::sleep(std::time::Duration::from_secs(15)).await;
                }
            }

            delete_registry_key_hklm_64(recipe.win_registry_key);

            if program_dir.exists() {
                if let Err(e) = crate::platform::remove_directory_with_retry(program_dir, 5).await {
                    warn!("Orphan purge: failed to remove {} (continuing): {:#}", recipe.win_program_dir, e);
                }
            }

            Ok(())
        }

        #[cfg(target_os = "macos")]
        {
            use tokio::process::Command;

            let plist = format!("/Library/LaunchDaemons/{}.plist", recipe.mac_service);

            if let Err(e) = crate::platform::system_service::stop_service(recipe.mac_service, true).await {
                warn!("Orphan purge: unload {} failed (continuing): {:#}", plist, e);
            }
            let _ = Command::new("sudo")
                .args(["launchctl", "bootout", &format!("system/{}", recipe.mac_service)])
                .output()
                .await;
            let _ = Command::new("sudo").args(["rm", "-f", &plist]).output().await;

            for dir in recipe.unix_dirs {
                if std::path::Path::new(dir).exists() {
                    if let Err(e) = crate::platform::remove_directory_with_retry(std::path::Path::new(dir), 5).await {
                        warn!("Orphan purge: failed to remove {} (continuing): {:#}", dir, e);
                    }
                }
            }

            Ok(())
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            use tokio::process::Command;

            let unit = recipe.nix_service_unit;
            let service_name = unit.trim_end_matches(".service");

            // stop_service only stops on Linux; disable + remove the unit so it never restarts.
            if let Err(e) = crate::platform::system_service::stop_service(service_name, true).await {
                warn!("Orphan purge: stop {} failed (continuing): {:#}", unit, e);
            }
            let _ = Command::new("sudo").args(["systemctl", "disable", unit]).output().await;
            for base in ["/etc/systemd/system", "/lib/systemd/system", "/usr/lib/systemd/system"] {
                let _ = Command::new("sudo").args(["rm", "-f"]).arg(format!("{}/{}", base, unit)).output().await;
            }
            let _ = Command::new("sudo").args(["systemctl", "daemon-reload"]).output().await;

            for dir in recipe.unix_dirs {
                if std::path::Path::new(dir).exists() {
                    if let Err(e) = crate::platform::remove_directory_with_retry(std::path::Path::new(dir), 5).await {
                        warn!("Orphan purge: failed to remove {} (continuing): {:#}", dir, e);
                    }
                }
            }

            Ok(())
        }
    }
}

/// Find the Inno Setup uninstaller (`unins*.exe`) inside `program_dir`.
#[cfg(target_os = "windows")]
fn find_windows_uninstaller(program_dir: &std::path::Path, prefix: &str) -> Option<std::path::PathBuf> {
    for entry in std::fs::read_dir(program_dir).ok()?.flatten() {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name.starts_with(prefix) && name.ends_with(".exe") {
            return Some(entry.path());
        }
    }
    None
}

/// Recursively delete `HKLM\<subkey>` in the native 64-bit registry view. Missing key = success.
#[cfg(target_os = "windows")]
fn delete_registry_key_hklm_64(subkey: &str) {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WRITE, KEY_WOW64_64KEY};
    use winreg::RegKey;

    let (parent, leaf) = subkey.rsplit_once('\\').unwrap_or(("", subkey));

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let parent_key = match hklm.open_subkey_with_flags(parent, KEY_READ | KEY_WRITE | KEY_WOW64_64KEY) {
        Ok(k) => k,
        Err(_) => return, // parent absent -> nothing to delete
    };

    match parent_key.delete_subkey_all(leaf) {
        Ok(()) => info!("Orphan purge: deleted registry key HKLM\\{}", subkey),
        Err(e) => warn!("Orphan purge: could not delete HKLM\\{} (may be absent): {:#}", subkey, e),
    }
}
