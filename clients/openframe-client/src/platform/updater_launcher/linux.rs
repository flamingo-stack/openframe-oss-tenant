use anyhow::{Result, anyhow};
use tracing::info;

use super::UpdaterParams;

/// Launch updater on Linux
/// TODO: Implement using systemd
pub async fn launch_updater(_params: UpdaterParams) -> Result<()> {
    info!("Launching Linux shell updater");

    // TODO: Implement Linux updater with systemd
    Err(anyhow!("Linux updater not yet implemented. Use systemd service restart instead."))
}
