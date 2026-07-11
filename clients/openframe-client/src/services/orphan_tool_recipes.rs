//! Fixed vendor coordinates for tools that may be present on an endpoint OUTSIDE OpenFrame's
//! management (an "orphan") — installed by the tool's own installer and absent from
//! `installed_tools.json`, so the registry-driven uninstall path can't remove them. Values are the
//! upstream installer defaults (see the `rmmagent` sources), NOT OpenFrame-managed paths.

/// Removal coordinates for one externally-managed tool, keyed by the `toolAgentId` used on the
/// `machine.<id>.tool-uninstall` subject. Fields are per-OS; only the current target's are read.
#[allow(dead_code)] // fields consumed under per-OS cfg blocks in OrphanPurgeService
pub struct OrphanRecipe {
    pub tool_agent_id: &'static str,
    pub display_name: &'static str,

    // Windows
    pub win_service: &'static str,
    pub win_program_dir: &'static str,
    pub win_uninstaller_glob: &'static str, // filename prefix, e.g. "unins" (Inno unins*.exe)
    pub win_registry_key: &'static str,     // under HKLM, 64-bit view

    // Linux (systemd)
    pub nix_service_unit: &'static str,

    // macOS (launchd label; plist is /Library/LaunchDaemons/<label>.plist)
    pub mac_service: &'static str,

    // Unix install/config dirs to purge (linux + macOS)
    pub unix_dirs: &'static [&'static str],
}

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

/// All known orphan recipes. Add a tool here to make it removable by both entry points.
pub static RECIPES: &[&OrphanRecipe] = &[&TACTICAL_RMM];

pub fn get(tool_agent_id: &str) -> Option<&'static OrphanRecipe> {
    RECIPES.iter().copied().find(|r| r.tool_agent_id == tool_agent_id)
}
