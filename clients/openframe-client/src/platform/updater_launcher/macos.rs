use anyhow::{Context, Result, anyhow};
use std::process::Command;
use std::os::unix::fs::PermissionsExt;
use tracing::info;
use uuid::Uuid;

use super::UpdaterParams;
use crate::platform::update_scripts::{UPDATE_SCRIPT_MACOS, UPDATER_PLIST_TEMPLATE};

/// Launch bash updater script on macOS
/// Creates a temporary launchd job to ensure the script survives service stop
pub async fn launch_updater(params: UpdaterParams) -> Result<()> {
    info!("Launching macOS bash updater");

    let script_path = std::env::temp_dir().join(format!(
        "openframe-updater-{}.sh",
        Uuid::new_v4()
    ));

    tokio::fs::write(&script_path, UPDATE_SCRIPT_MACOS).await
        .context("Failed to write bash script")?;

    // Make script executable
    let mut perms = std::fs::metadata(&script_path)?.permissions();
    perms.set_mode(0o755);
    std::fs::set_permissions(&script_path, perms)
        .context("Failed to set script executable permissions")?;

    info!("Bash script saved to: {}", script_path.display());

    info!("Launching updater with: binary={}, service={}, target={}, state={}",
        params.binary_path.display(), params.service_name, params.target_exe.display(), params.update_state_path);

    // Create a temporary plist to run the update script as a one-shot launchd job
    // This ensures the script survives when our service is stopped
    let plist_path = std::env::temp_dir().join("com.openframe.updater.plist");

    // Remove any leftover updater job from a previous failed update
    let _ = Command::new("launchctl")
        .arg("remove")
        .arg("com.openframe.updater")
        .output();

    let plist_content = UPDATER_PLIST_TEMPLATE
        .replace("{SCRIPT_PATH}", &script_path.to_string_lossy())
        .replace("{BINARY_PATH}", &params.binary_path.to_string_lossy())
        .replace("{SERVICE_LABEL}", &params.service_name)
        .replace("{TARGET_EXE}", &params.target_exe.to_string_lossy())
        .replace("{UPDATE_STATE_PATH}", &params.update_state_path);

    std::fs::write(&plist_path, &plist_content)
        .context("Failed to write updater plist")?;

    info!("Updater plist created at: {}", plist_path.display());

    // Load the plist to start the updater job
    let output = Command::new("launchctl")
        .arg("load")
        .arg(&plist_path)
        .output()
        .context("Failed to load updater plist")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("Failed to load updater plist: {}", stderr));
    }

    info!("macOS bash updater launched via launchd");

    Ok(())
}
