use super::HealOutcome;

/// Microsoft's permalink to the Evergreen WebView2 bootstrapper.
#[cfg(windows)]
const BOOTSTRAPPER_URL: &str = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

/// The bootstrapper downloads the full runtime during install, so allow plenty of time.
#[cfg(windows)]
const INSTALL_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(600);

#[cfg(windows)]
const DOWNLOAD_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(120);

/// Installs the WebView2 Runtime machine-wide and re-runs the registry check to verify.
#[cfg(windows)]
pub async fn install() -> HealOutcome {
    match try_install().await {
        Ok(()) => HealOutcome::Healed,
        Err(e) => HealOutcome::Failed(format!("{e:#}")),
    }
}

#[cfg(not(windows))]
pub async fn install() -> HealOutcome {
    HealOutcome::Failed("WebView2 install is only applicable on Windows".to_string())
}

#[cfg(windows)]
async fn try_install() -> anyhow::Result<()> {
    use crate::doctor::{checks::check_webview2_runtime, CheckStatus};
    use anyhow::{bail, Context};
    use tracing::info;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    // Unguessable name: a fixed name in the shared temp dir could be pre-created or swapped by a local user.
    let installer_path = std::env::temp_dir().join(format!(
        "MicrosoftEdgeWebView2Setup-{}.exe",
        uuid::Uuid::new_v4()
    ));

    info!("Downloading WebView2 bootstrapper from {}", BOOTSTRAPPER_URL);
    let bytes = reqwest::Client::builder()
        .timeout(DOWNLOAD_TIMEOUT)
        .build()
        .context("Failed to create HTTP client")?
        .get(BOOTSTRAPPER_URL)
        .send()
        .await
        .context("Failed to download WebView2 bootstrapper")?
        .error_for_status()
        .context("WebView2 bootstrapper download failed")?
        .bytes()
        .await
        .context("Failed to read WebView2 bootstrapper body")?;
    tokio::fs::write(&installer_path, &bytes)
        .await
        .with_context(|| format!("Failed to write {}", installer_path.display()))?;

    // Running elevated (agent is SYSTEM), the bootstrapper installs machine-wide automatically.
    info!("Running silent WebView2 install");
    // kill_on_drop only reaps the bootstrapper on timeout; its updater child may still finish in the background (harmless: next startup re-checks).
    let run = tokio::time::timeout(
        INSTALL_TIMEOUT,
        tokio::process::Command::new(&installer_path)
            .args(["/silent", "/install"])
            .creation_flags(CREATE_NO_WINDOW)
            .kill_on_drop(true)
            .status(),
    )
    .await;

    let _ = tokio::fs::remove_file(&installer_path).await;

    let status = run
        .context("WebView2 installer timed out")?
        .context("Failed to run WebView2 installer")?;
    if !status.success() {
        bail!("WebView2 installer exited with {}", status);
    }

    match check_webview2_runtime() {
        Some(result) if result.status == CheckStatus::Pass => Ok(()),
        _ => bail!("Installer succeeded but machine-wide WebView2 runtime still not detected"),
    }
}
