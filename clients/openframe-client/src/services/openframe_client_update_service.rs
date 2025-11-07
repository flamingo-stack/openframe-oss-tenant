use anyhow::{Context, Result, anyhow};
use tracing::{info, warn, error};
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::platform::DirectoryManager;
use std::path::PathBuf;
use std::process;
use reqwest;
use uuid::Uuid;

/// PowerShell script for updating OpenFrame client on Windows
/// This script stops the service, replaces the binary, and restarts the service
const UPDATE_SCRIPT: &str = r#"
param(
    [string]$ArchivePath,
    [string]$ServiceName,
    [string]$TargetExe
)

Write-Host "🔄 OpenFrame Updater started"
Write-Host "📦 Archive: $ArchivePath"
Write-Host "🎯 Target: $TargetExe"

try {
    # 1. Stop the service
    Write-Host "🛑 Stopping service: $ServiceName"
    Stop-Service -Name $ServiceName -Force -ErrorAction Stop
    Start-Sleep -Seconds 2

    # 2. Wait for service to fully stop
    $timeout = 30
    $elapsed = 0
    while ((Get-Service -Name $ServiceName -ErrorAction SilentlyContinue).Status -ne 'Stopped' -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
    }

    if ($elapsed -ge $timeout) {
        Write-Host "❌ Service did not stop in time"
        exit 1
    }

    Write-Host "✅ Service stopped"
    Start-Sleep -Seconds 1

    # 3. Create backup
    $BackupPath = "$TargetExe.backup"
    Write-Host "💾 Creating backup: $BackupPath"
    Copy-Item -Path $TargetExe -Destination $BackupPath -Force

    # 4. Extract archive
    Write-Host "📂 Extracting archive..."
    $TempExtract = Join-Path $env:TEMP "openframe-update-$(New-Guid)"
    Expand-Archive -Path $ArchivePath -DestinationPath $TempExtract -Force

    # 5. Find new executable
    $NewExe = Get-ChildItem -Path $TempExtract -Filter "*.exe" -Recurse | Select-Object -First 1

    if (-not $NewExe) {
        Write-Host "❌ No executable found in archive"
        throw "No executable found in archive"
    }

    Write-Host "📄 Found executable: $($NewExe.FullName)"

    # 6. Replace binary
    Write-Host "🔄 Replacing binary..."
    Copy-Item -Path $NewExe.FullName -Destination $TargetExe -Force

    # 7. Start service
    Write-Host "▶️ Starting service: $ServiceName"
    Start-Service -Name $ServiceName -ErrorAction Stop

    # 8. Verify service started
    Start-Sleep -Seconds 3
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -ne 'Running') {
        Write-Host "❌ Service failed to start! Rolling back..."
        Copy-Item -Path $BackupPath -Destination $TargetExe -Force
        Start-Service -Name $ServiceName -ErrorAction Stop
        throw "Service failed to start after update"
    }

    Write-Host "✅ Service started successfully"

    # 9. Cleanup
    Write-Host "🧹 Cleaning up..."
    Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $BackupPath -Force -ErrorAction SilentlyContinue

    Write-Host "✅ Update complete!"
    exit 0
}
catch {
    Write-Host "❌ Update failed: $_"
    
    # Attempt rollback if backup exists
    if (Test-Path $BackupPath) {
        Write-Host "🔙 Attempting rollback..."
        Copy-Item -Path $BackupPath -Destination $TargetExe -Force -ErrorAction SilentlyContinue
        Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
    }
    
    exit 1
}
"#;

#[derive(Clone)]
pub struct OpenFrameClientUpdateService {
    directory_manager: DirectoryManager,
    client_info_service: OpenFrameClientInfoService,
    update_base_url: String,
}

impl OpenFrameClientUpdateService {
    pub fn new(
        directory_manager: DirectoryManager, 
        client_info_service: OpenFrameClientInfoService,
        update_base_url: String,
    ) -> Self {
        Self {
            directory_manager,
            client_info_service,
            update_base_url,
        }
    }

    // TODO: add version timestamp and process race conditions
    pub async fn process_update(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let requested_version = message.version.trim();
        info!("📩 Received update request for version: {}", requested_version);
        
        // Validate version format
        if !Self::is_valid_version(requested_version) {
            error!("⚠️ Invalid version format: {}", requested_version);
            return Err(anyhow!("Invalid version format: {}", requested_version));
        }
        
        // Set update status to updating
        self.client_info_service
            .set_update_status(ClientUpdateStatus::Updating, Some(requested_version.to_string()))
            .await
            .context("Failed to set update status")?;
        
        info!("🧩 Starting update to version {}", requested_version);
        
        // 1. Download update archive
        let archive_path = self.download_update(requested_version).await
            .context("Failed to download update")?;
        
        info!("✅ Update downloaded to: {}", archive_path.display());
        
        // 2. Launch update process (Windows: PowerShell, Unix: shell script)
        #[cfg(windows)]
        {
            self.launch_windows_updater(archive_path).await?;
        }
        
        #[cfg(unix)]
        {
            self.launch_unix_updater(archive_path).await?;
        }
        
        // 3. Update will happen in separate process, current process exits
        info!("🚀 Update process launched, current service will stop");
        
        // Note: We don't update client_info_service here because the updater script
        // will restart the service with the new version
        process::exit(0);
    }
    
    /// Download update archive from server
    async fn download_update(&self, version: &str) -> Result<PathBuf> {
        info!("⬇️ Downloading update for version: {}", version);
        
        // Construct download URL based on platform
        // Format: https://updates.openframe.org/releases/openframe-client-v1.2.3-windows-x64.zip
        let platform = std::env::consts::OS;
        let arch = std::env::consts::ARCH;
        let filename = format!("openframe-client-{}-{}-{}.zip", version, platform, arch);
        let download_url = format!("{}/{}", self.update_base_url.trim_end_matches('/'), filename);
        
        info!("📥 Downloading from: {}", download_url);
        
        // Download to temp directory
        let temp_dir = std::env::temp_dir();
        let archive_path = temp_dir.join(format!("openframe-update-{}.zip", Uuid::new_v4()));
        
        // Download with reqwest
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(300)) // 5 min timeout
            .build()?;
        
        let response = client.get(&download_url)
            .send()
            .await
            .context("Failed to send download request")?;
        
        if !response.status().is_success() {
            return Err(anyhow!(
                "Download failed with status: {} - URL: {}", 
                response.status(),
                download_url
            ));
        }
        
        let bytes = response.bytes().await
            .context("Failed to read response bytes")?;
        
        info!("📦 Downloaded {} bytes", bytes.len());
        
        // Write to file
        tokio::fs::write(&archive_path, bytes).await
            .context("Failed to write archive file")?;
        
        info!("✅ Archive saved to: {}", archive_path.display());
        
        Ok(archive_path)
    }
    
    /// Launch PowerShell updater script on Windows
    #[cfg(windows)]
    async fn launch_windows_updater(&self, archive_path: PathBuf) -> Result<()> {
        info!("🪟 Launching Windows PowerShell updater");
        
        // Save PowerShell script to temp file
        let script_path = std::env::temp_dir().join(format!(
            "openframe-updater-{}.ps1",
            Uuid::new_v4()
        ));
        
        tokio::fs::write(&script_path, UPDATE_SCRIPT).await
            .context("Failed to write PowerShell script")?;
        
        info!("📝 PowerShell script saved to: {}", script_path.display());
        
        // Get current executable path
        let current_exe = std::env::current_exe()
            .context("Failed to get current executable path")?;
        
        // Service name
        let service_name = "com.openframe.client";
        
        // Launch PowerShell with the script
        let child = process::Command::new("powershell.exe")
            .arg("-ExecutionPolicy").arg("Bypass")
            .arg("-NoProfile")
            .arg("-File").arg(&script_path)
            .arg("-ArchivePath").arg(&archive_path)
            .arg("-ServiceName").arg(service_name)
            .arg("-TargetExe").arg(&current_exe)
            .creation_flags(0x08000000) // CREATE_NO_WINDOW - no console window
            .spawn()
            .context("Failed to spawn PowerShell updater")?;
        
        info!("✅ PowerShell updater launched (PID: {})", child.id());
        
        Ok(())
    }
    
    /// Launch shell script updater on Unix systems
    #[cfg(unix)]
    async fn launch_unix_updater(&self, archive_path: PathBuf) -> Result<()> {
        info!("🐧 Launching Unix shell updater");
        
        // TODO: Implement Unix updater with shell script or binary copy
        // For now, return error as not implemented
        Err(anyhow!("Unix updater not yet implemented. Use systemd service restart instead."))
    }
    
    /// Validate version format (basic semver check)
    fn is_valid_version(version: &str) -> bool {
        !version.is_empty() 
            && version.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
            && version.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-')
    }
}
