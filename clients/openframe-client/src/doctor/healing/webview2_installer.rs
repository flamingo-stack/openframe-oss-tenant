use super::HealOutcome;

/// Microsoft's permalink to the Evergreen WebView2 bootstrapper.
#[cfg(windows)]
const BOOTSTRAPPER_URL: &str = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";

/// The bootstrapper downloads the full runtime during install, so allow plenty of time.
#[cfg(windows)]
const INSTALL_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(600);

#[cfg(windows)]
const DOWNLOAD_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(120);

/// Guards the PowerShell signature probe against hanging.
#[cfg(windows)]
const SIGNATURE_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(60);

/// Runtime registration can land after the bootstrapper exits, so re-check this many times.
#[cfg(windows)]
const VERIFY_ATTEMPTS: u32 = 12;

#[cfg(windows)]
const VERIFY_POLL_INTERVAL: std::time::Duration = std::time::Duration::from_secs(5);

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

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
    use anyhow::{bail, Context};
    use tracing::info;

    // Staged in the ACL-restricted secured dir under an unguessable name so no other local user can swap the bytes.
    let installer_path = crate::platform::DirectoryManager::new().secured_dir().join(format!(
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

    if let Err(e) = verify_microsoft_signature(&installer_path).await {
        let _ = tokio::fs::remove_file(&installer_path).await;
        return Err(e);
    }

    // Running elevated (agent is SYSTEM), the bootstrapper installs machine-wide automatically.
    info!("Running silent WebView2 install");
    // kill_on_drop only reaps the bootstrapper on timeout; its updater child may still finish in the background (caught by the verification poll).
    let run = tokio::time::timeout(
        INSTALL_TIMEOUT,
        tokio::process::Command::new(&installer_path)
            .args(["/silent", "/install"])
            .creation_flags(CREATE_NO_WINDOW)
            .kill_on_drop(true)
            .status(),
    )
    .await;

    let healed = wait_for_machine_wide().await;
    let _ = tokio::fs::remove_file(&installer_path).await;
    if healed {
        return Ok(());
    }

    let status = run
        .context("WebView2 installer timed out")?
        .context("Failed to run WebView2 installer")?;
    if !status.success() {
        bail!("WebView2 installer exited with {}", status);
    }
    bail!("Installer succeeded but machine-wide WebView2 runtime still not detected")
}

/// Rejects the download unless it carries a valid Microsoft Authenticode signature.
#[cfg(windows)]
async fn verify_microsoft_signature(path: &std::path::Path) -> anyhow::Result<()> {
    use anyhow::{anyhow, bail, Context};

    let powershell = crate::platform::get_powershell_path().map_err(|e| anyhow!(e))?;
    let script = format!(
        "$s = Get-AuthenticodeSignature -LiteralPath '{}'; \
         if ($s.Status -eq 'Valid' -and $s.SignerCertificate.Subject -like '*O=Microsoft Corporation*') {{ exit 0 }}; \
         Write-Output \"status=$($s.Status) subject=$($s.SignerCertificate.Subject)\"; exit 1",
        path.display()
    );

    let output = tokio::time::timeout(
        SIGNATURE_TIMEOUT,
        tokio::process::Command::new(powershell)
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(CREATE_NO_WINDOW)
            .kill_on_drop(true)
            .output(),
    )
    .await
    .context("Authenticode verification timed out")?
    .context("Failed to run Authenticode verification")?;

    if !output.status.success() {
        bail!(
            "WebView2 bootstrapper failed Authenticode verification: {}",
            String::from_utf8_lossy(&output.stdout).trim()
        );
    }
    Ok(())
}

/// Polls the registry check so registration landing shortly after the installer finishes still counts.
#[cfg(windows)]
async fn wait_for_machine_wide() -> bool {
    use crate::doctor::{checks::check_webview2_runtime, CheckStatus};

    for attempt in 0..VERIFY_ATTEMPTS {
        if check_webview2_runtime().map_or(false, |r| r.status == CheckStatus::Pass) {
            return true;
        }
        if attempt + 1 < VERIFY_ATTEMPTS {
            tokio::time::sleep(VERIFY_POLL_INTERVAL).await;
        }
    }
    false
}
