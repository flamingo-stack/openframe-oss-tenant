//! Fixed vendor coordinates for tools that may be present on an endpoint OUTSIDE OpenFrame's
//! management (an "orphan"): installed by the tool's own installer, never recorded in
//! `installed_tools.json`, and therefore invisible to the registry-driven uninstall path in
//! [`crate::services::ToolUninstallService`].
//!
//! An orphaned Tactical RMM agent is the motivating case: it lives at the upstream default
//! location (`C:\Program Files\TacticalAgent`, service `tacticalrmm`), keeps reconnecting to the
//! gateway forever, and the native `tool-uninstall` message no-ops on it because OpenFrame has no
//! registry record to drive removal. The values below are the upstream installer defaults (see the
//! `rmmagent` sources: service names in `agent/agent.go`, uninstall paths in `agent_windows.go` /
//! `agent_unix.go`) — NOT OpenFrame-managed paths.

/// Removal coordinates for one externally-managed tool, keyed by the `toolAgentId` used on the
/// `machine.<id>.tool-uninstall` NATS subject (so a native uninstall dispatch maps straight onto a
/// recipe). Fields are per-OS; only the ones for the current target are read at runtime.
#[allow(dead_code)] // fields are consumed under per-OS cfg blocks in OrphanPurgeService
pub struct OrphanRecipe {
    /// Matches `ToolUninstallMessage.tool_agent_id` and the local registry key.
    pub tool_agent_id: &'static str,
    /// Human-readable name for logs.
    pub display_name: &'static str,

    // --- Windows ---
    /// SCM service name (e.g. `tacticalrmm`).
    pub win_service: &'static str,
    /// Install directory (e.g. `C:\Program Files\TacticalAgent`).
    pub win_program_dir: &'static str,
    /// Glob for the silent uninstaller inside `win_program_dir` (Inno Setup `unins*.exe`).
    pub win_uninstaller_glob: &'static str,
    /// Registry subkey to purge under `HKLM` (64-bit view), e.g. `SOFTWARE\TacticalRMM`.
    pub win_registry_key: &'static str,

    // --- Linux (systemd) ---
    /// systemd unit, e.g. `tacticalagent.service`.
    pub nix_service_unit: &'static str,

    // --- macOS (launchd) ---
    /// launchd label; the plist is `/Library/LaunchDaemons/<label>.plist`.
    pub mac_service: &'static str,

    // --- Unix filesystem cleanup (linux + macOS) ---
    pub unix_dirs: &'static [&'static str],
}

/// Tactical RMM agent (amidaware fork). Coordinates from the upstream installer defaults.
pub static TACTICAL_RMM: OrphanRecipe = OrphanRecipe {
    tool_agent_id: "tacticalrmm-agent",
    display_name: "Tactical RMM Agent",
    win_service: "tacticalrmm",
    win_program_dir: r"C:\Program Files\TacticalAgent",
    win_uninstaller_glob: "unins",
    win_registry_key: r"SOFTWARE\TacticalRMM",
    nix_service_unit: "tacticalagent.service",
    mac_service: "tacticalagent",
    unix_dirs: &["/opt/tacticalagent", "/etc/tacticalagent"],
};

/// All known orphan recipes. Add a tool here to make it removable by both the message-driven and
/// startup-reconcile paths.
pub static RECIPES: &[&OrphanRecipe] = &[&TACTICAL_RMM];

/// Look up a recipe by its `toolAgentId`. Returns `None` for tools we have no removal recipe for
/// (the caller then falls back to the normal "not installed, nothing to do" behaviour).
pub fn get(tool_agent_id: &str) -> Option<&'static OrphanRecipe> {
    RECIPES.iter().copied().find(|r| r.tool_agent_id == tool_agent_id)
}
