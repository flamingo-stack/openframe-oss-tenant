//! Registry-independent removal of orphaned tools.
//!
//! The normal uninstall path ([`crate::services::ToolUninstallService`]) can only remove tools
//! OpenFrame installed itself, because it looks them up in the local `installed_tools.json`
//! registry. A tool installed *outside* OpenFrame management (an "orphan" — e.g. a Tactical RMM
//! agent left behind from a previous product) is absent from that registry, so the native
//! `tool-uninstall` message silently no-ops while the agent keeps hammering the gateway forever.
//!
//! This service closes that gap. It removes an orphan by its fixed vendor coordinates (see
//! [`crate::services::orphan_tool_recipes`]) instead of an OpenFrame-managed path, via two entry
//! points:
//!   * [`OrphanPurgeService::purge_if_orphan`] — driven by the `tool-uninstall` NATS message when
//!     the tool is not in the registry (keeps the server-side dispatch audit trail).
//!   * [`OrphanPurgeService::reconcile_all`] — runs at startup and removes any known orphan present
//!     on this host but not managed by OpenFrame, with no dependency on a NATS re-dispatch. This
//!     reaches every box that self-updates to a client build containing it.
//!
//! Every step is best-effort and idempotent: "service already gone" / "directory already gone" are
//! treated as success, so re-running is safe.

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

    /// Message-driven entry point. Called for a `tool_agent_id` that is NOT in the local registry.
    ///
    /// * `Ok(true)`  — we have a recipe for this tool (it was purged, or it was already absent).
    ///                 The caller should treat the uninstall as done and ACK the message.
    /// * `Ok(false)` — no recipe; not an orphan we know how to remove. Caller keeps the existing
    ///                 "not installed, nothing to do" behaviour.
    /// * `Err(_)`    — a removal step failed while the tool was present; caller should leave the
    ///                 message un-ACKed for redelivery.
    pub async fn purge_if_orphan(&self, tool_agent_id: &str) -> Result<bool> {
        let Some(recipe) = orphan_tool_recipes::get(tool_agent_id) else {
            return Ok(false);
        };

        if !Self::is_present(recipe).await {
            info!(
                "Orphan purge: {} not present on this host, nothing to remove",
                recipe.display_name
            );
            return Ok(true);
        }

        info!("Orphan purge: removing unmanaged {}", recipe.display_name);
        self.purge(recipe).await?;
        Ok(true)
    }

    /// Startup reconcile. For every known recipe: if the tool is present on this host but OpenFrame
    /// does not manage it, remove it. Never returns an error — purely best-effort background work.
    pub async fn reconcile_all(&self) {
        for recipe in orphan_tool_recipes::RECIPES.iter().copied() {
            if !Self::is_present(recipe).await {
                continue;
            }

            match self
                .installed_tools_service
                .get_by_tool_agent_id(recipe.tool_agent_id)
                .await
            {
                Ok(Some(_)) => {
                    // OpenFrame installed and manages this one — the normal uninstall path owns it.
                    info!(
                        "Orphan reconcile: {} present but OpenFrame-managed, leaving it alone",
                        recipe.display_name
                    );
                }
                Ok(None) => {
                    warn!(
                        "Orphan reconcile: {} present but UNMANAGED by OpenFrame — purging",
                        recipe.display_name
                    );
                    if let Err(e) = self.purge(recipe).await {
                        warn!(
                            "Orphan reconcile: purge of {} failed (will retry next start): {:#}",
                            recipe.display_name, e
                        );
                    }
                }
                Err(e) => warn!(
                    "Orphan reconcile: registry check for {} failed: {:#}",
                    recipe.display_name, e
                ),
            }
        }
    }

    /// Is the tool actually installed on this host right now?
    async fn is_present(recipe: &OrphanRecipe) -> bool {
        #[cfg(target_os = "windows")]
        {
            use tokio::process::Command;
            match Command::new("sc").args(["query", recipe.win_service]).output().await {
                Ok(out) => out.status.success(),
                // sc unavailable for some reason — fall back to the install dir.
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

    /// Remove the tool by its fixed vendor coordinates. Idempotent; individual steps log and
    /// continue on failure so a partially-removed install still makes progress.
    async fn purge(&self, recipe: &OrphanRecipe) -> Result<()> {
        #[cfg(target_os = "windows")]
        {
            use tokio::process::Command;

            // 1. Stop, force-kill, and delete the SCM service (allow_delete = true).
            if let Err(e) =
                crate::platform::system_service::stop_service(recipe.win_service, true).await
            {
                warn!("Orphan purge: stop/delete service {} failed (continuing): {:#}",
                      recipe.win_service, e);
            }

            // 2. Run the vendor's silent uninstaller (Inno Setup) if it is on disk.
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
                    // Inno relaunches itself from a temp copy and returns immediately; give it time
                    // to finish before we sweep the directory.
                    tokio::time::sleep(std::time::Duration::from_secs(15)).await;
                }
            }

            // 3. Purge the vendor registry key (64-bit view).
            delete_registry_key_hklm_64(recipe.win_registry_key);

            // 4. Force-remove the install directory (handles locked/read-only files).
            if program_dir.exists() {
                if let Err(e) = crate::platform::remove_directory_with_retry(program_dir, 5).await {
                    warn!("Orphan purge: failed to remove {} (continuing): {:#}",
                          recipe.win_program_dir, e);
                }
            }

            Ok(())
        }

        #[cfg(target_os = "macos")]
        {
            use tokio::process::Command;

            let plist = format!("/Library/LaunchDaemons/{}.plist", recipe.mac_service);

            // 1. Unload the launchd daemon (launchctl unload via system_service) + hard bootout.
            if let Err(e) =
                crate::platform::system_service::stop_service(recipe.mac_service, true).await
            {
                warn!("Orphan purge: unload {} failed (continuing): {:#}", plist, e);
            }
            let _ = Command::new("sudo")
                .args(["launchctl", "bootout", &format!("system/{}", recipe.mac_service)])
                .output()
                .await;

            // 2. Remove the plist.
            let _ = Command::new("sudo").args(["rm", "-f", &plist]).output().await;

            // 3. Purge install/config directories.
            for dir in recipe.unix_dirs {
                if std::path::Path::new(dir).exists() {
                    if let Err(e) =
                        crate::platform::remove_directory_with_retry(std::path::Path::new(dir), 5).await
                    {
                        warn!("Orphan purge: failed to remove {} (continuing): {:#}", dir, e);
                    }
                }
            }

            Ok(())
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            use tokio::process::Command;

            let unit = recipe.nix_service_unit; // e.g. "tacticalagent.service"
            let service_name = unit.trim_end_matches(".service");

            // 1. Stop the unit (system_service::stop_service only stops on Linux)...
            if let Err(e) =
                crate::platform::system_service::stop_service(service_name, true).await
            {
                warn!("Orphan purge: stop {} failed (continuing): {:#}", unit, e);
            }
            // ...then disable it and remove the unit files so it never starts again.
            let _ = Command::new("sudo").args(["systemctl", "disable", unit]).output().await;
            for base in ["/etc/systemd/system", "/lib/systemd/system", "/usr/lib/systemd/system"] {
                let _ = Command::new("sudo")
                    .args(["rm", "-f"])
                    .arg(format!("{}/{}", base, unit))
                    .output()
                    .await;
            }
            let _ = Command::new("sudo").args(["systemctl", "daemon-reload"]).output().await;

            // 2. Purge install/config directories.
            for dir in recipe.unix_dirs {
                if std::path::Path::new(dir).exists() {
                    if let Err(e) =
                        crate::platform::remove_directory_with_retry(std::path::Path::new(dir), 5).await
                    {
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
    let entries = std::fs::read_dir(program_dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy().to_lowercase();
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

    // Split "SOFTWARE\TacticalRMM" into parent ("SOFTWARE") + leaf ("TacticalRMM") so we can open
    // the parent with the 64-bit flag and recursively drop the leaf.
    let (parent, leaf) = match subkey.rsplit_once('\\') {
        Some((p, l)) => (p, l),
        None => ("", subkey),
    };

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let parent_key = match hklm.open_subkey_with_flags(
        parent,
        KEY_READ | KEY_WRITE | KEY_WOW64_64KEY,
    ) {
        Ok(k) => k,
        Err(_) => {
            // Parent absent -> nothing to delete.
            return;
        }
    };

    match parent_key.delete_subkey_all(leaf) {
        Ok(()) => info!("Orphan purge: deleted registry key HKLM\\{}", subkey),
        Err(e) => warn!("Orphan purge: could not delete HKLM\\{} (may be absent): {:#}", subkey, e),
    }
}
