use anyhow::{anyhow, Context, Result};
use std::os::windows::process::CommandExt;
use std::process::Command;
use tracing::info;
use uuid::Uuid;

use super::UpdaterParams;
use crate::config::update_config::BOOT_MARKER_WAIT_SECS;
use crate::platform::get_powershell_path;
use crate::platform::update_scripts::UPDATE_SCRIPT_WINDOWS;

/// Launch PowerShell updater script on Windows
/// Uses CREATE_NO_WINDOW flag to run detached from console
pub async fn launch_updater(params: UpdaterParams) -> Result<()> {
    info!("Launching Windows PowerShell updater");

    // Save PowerShell script to temp file
    let script_path =
        std::env::temp_dir().join(format!("openframe-updater-{}.ps1", Uuid::new_v4()));

    // UTF-8 BOM: without it Windows PowerShell 5.1 reads the file as ANSI, and
    // any multi-byte character can decode into a smart quote that breaks parsing.
    tokio::fs::write(&script_path, format!("\u{FEFF}{}", UPDATE_SCRIPT_WINDOWS))
        .await
        .context("Failed to write PowerShell script")?;

    info!("PowerShell script saved to: {}", script_path.display());

    let ps_path = get_powershell_path().map_err(|e| anyhow!(e))?;
    info!("Using PowerShell: {}", ps_path);

    let mut command = Command::new(&ps_path);
    command
        .arg("-ExecutionPolicy")
        .arg("Bypass")
        .arg("-NoProfile")
        .arg("-File")
        .arg(&script_path)
        .arg("-ArchivePath")
        .arg(&params.binary_path)
        .arg("-ServiceName")
        .arg(&params.service_name)
        .arg("-TargetExe")
        .arg(&params.target_exe)
        .arg("-UpdateStatePath")
        .arg(&params.update_state_path)
        .arg("-TargetVersion")
        .arg(&params.target_version)
        .arg("-BootMarkerPath")
        .arg(&params.boot_marker_path)
        .arg("-LkgPath")
        .arg(&params.lkg_path)
        .arg("-TranscriptPath")
        .arg(&params.transcript_path)
        .arg("-BootMarkerWaitSecs")
        .arg(BOOT_MARKER_WAIT_SECS.to_string())
        .creation_flags(0x08000000); // CREATE_NO_WINDOW
    if params.rollback_only {
        command.arg("-RollbackOnly");
    }
    let child = command
        .spawn()
        .context("Failed to spawn PowerShell updater")?;

    info!("PowerShell updater launched (PID: {})", child.id());

    Ok(())
}
