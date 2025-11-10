use anyhow::{Context, Result, anyhow};
use tracing::{info, warn, error};
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::services::github_download_service::GithubDownloadService;
use crate::services::InstalledAgentMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::platform::DirectoryManager;
use std::path::PathBuf;
use std::process;
use uuid::Uuid;

/// PowerShell script for updating OpenFrame client on Windows
/// This script stops the service, replaces the binary, and restarts the service
const UPDATE_SCRIPT: &str = r#"
param(
    [string]$ArchivePath,
    [string]$ServiceName,
    [string]$TargetExe
)

Write-Host "OpenFrame Updater started"
Write-Host "Archive: $ArchivePath"
Write-Host "Target: $TargetExe"

try {
    # 1. Stop the service
    Write-Host "Stopping service: $ServiceName"
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
        Write-Host "ERROR: Service did not stop in time"
        exit 1
    }

    Write-Host "Service stopped"
    Start-Sleep -Seconds 1

    # 3. Create backup
    $BackupPath = "$TargetExe.backup"
    Write-Host "Creating backup: $BackupPath"
    Copy-Item -Path $TargetExe -Destination $BackupPath -Force

    # 4. Extract archive
    Write-Host "Extracting archive..."
    $TempExtract = Join-Path $env:TEMP "openframe-update-$(New-Guid)"
    Expand-Archive -Path $ArchivePath -DestinationPath $TempExtract -Force

    # 5. Find new executable
    $NewExe = Get-ChildItem -Path $TempExtract -Filter "*.exe" -Recurse | Select-Object -First 1

    if (-not $NewExe) {
        Write-Host "ERROR: No executable found in archive"
        throw "No executable found in archive"
    }

    Write-Host "Found executable: $($NewExe.FullName)"

    # 6. Replace binary
    Write-Host "Replacing binary..."
    Copy-Item -Path $NewExe.FullName -Destination $TargetExe -Force

    # 7. Start service
    Write-Host "Starting service: $ServiceName"
    Start-Service -Name $ServiceName -ErrorAction Stop

    # 8. Verify service started
    Start-Sleep -Seconds 3
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -ne 'Running') {
        Write-Host "ERROR: Service failed to start! Rolling back..."
        Copy-Item -Path $BackupPath -Destination $TargetExe -Force
        Start-Service -Name $ServiceName -ErrorAction Stop
        throw "Service failed to start after update"
    }

    Write-Host "Service started successfully"

    # 9. Cleanup
    Write-Host "Cleaning up..."
    Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $BackupPath -Force -ErrorAction SilentlyContinue

    Write-Host "Update complete!"
    exit 0
}
catch {
    Write-Host "ERROR: Update failed: $_"
    
    # Attempt rollback if backup exists
    if (Test-Path $BackupPath) {
        Write-Host "Attempting rollback..."
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
    github_download_service: GithubDownloadService,
    config_service: AgentConfigurationService,
    installed_agent_publisher: InstalledAgentMessagePublisher,
}

impl OpenFrameClientUpdateService {
    pub fn new(
        directory_manager: DirectoryManager, 
        client_info_service: OpenFrameClientInfoService,
        github_download_service: GithubDownloadService,
        config_service: AgentConfigurationService,
        installed_agent_publisher: InstalledAgentMessagePublisher,
    ) -> Self {
        Self {
            directory_manager,
            client_info_service,
            github_download_service,
            config_service,
            installed_agent_publisher,
        }
    }

    // TODO: add version timestamp and process race conditions
    pub async fn process_update(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let requested_version = message.version.trim();
        info!("Received update request for version: {}", requested_version);
        
        // Validate version format
        if !Self::is_valid_version(requested_version) {
            error!("Invalid version format: {}", requested_version);
            return Err(anyhow!("Invalid version format: {}", requested_version));
        }
        
        // Set update status to updating
        self.client_info_service
            .set_update_status(ClientUpdateStatus::Updating, Some(requested_version.to_string()))
            .await
            .context("Failed to set update status")?;
        
        info!("Starting update to version {}", requested_version);
        
        // 1. Find the appropriate download configuration for current OS
        let download_config = GithubDownloadService::find_config_for_current_os(&message.download_configurations)
            .context("Failed to find download configuration for current OS")?;
        
        info!("Using download configuration for OS: {}", download_config.os);
        
        // 2. Download and extract binary using GithubDownloadService
        let binary_bytes = self.github_download_service
            .download_and_extract(download_config)
            .await
            .context("Failed to download and extract update")?;
        
        info!("Binary downloaded and extracted ({} bytes)", binary_bytes.len());
        
        // 3. Save binary to a temp archive for the updater
        // Note: The updater expects a ZIP, so we create one with the binary
        let archive_path = self.create_temp_archive(&binary_bytes, &download_config.agent_file_name).await
            .context("Failed to create temporary archive")?;
        
        info!("Temporary archive created: {}", archive_path.display());
        
        // 4. Launch update process (Windows: PowerShell, Unix: shell script)
        #[cfg(windows)]
        {
            self.launch_windows_updater(archive_path).await?;
        }
        
        #[cfg(unix)]
        {
            self.launch_unix_updater(archive_path).await?;
        }
        
        // 5. Publish installed agent message before exiting
        info!("Publishing installed agent message for openframe-client update to version: {}", requested_version);
        match self.config_service.get_machine_id().await {
            Ok(machine_id) => {
                if let Err(e) = self.installed_agent_publisher
                    .publish(machine_id, "openframe-client".to_string(), requested_version.to_string())
                    .await
                {
                    warn!("Failed to publish installed agent message for openframe-client: {:#}", e);
                    // Don't fail update if publishing fails
                }
            }
            Err(e) => {
                warn!("Failed to get machine_id for installed agent message: {:#}", e);
                // Don't fail update if publishing fails
            }
        }
        
        // 6. Update will happen in separate process, current process exits
        info!("Update process launched, current service will stop");
        Ok(())
    }
    
    /// Creates a temporary ZIP archive containing the binary for the updater script
    #[cfg(windows)]
    async fn create_temp_archive(&self, binary_bytes: &[u8], binary_name: &str) -> Result<PathBuf> {
        use std::io::Write;
        use zip::write::{FileOptions, ZipWriter};
        
        let temp_dir = std::env::temp_dir();
        let archive_path = temp_dir.join(format!("openframe-update-{}.zip", Uuid::new_v4()));
        
        let file = std::fs::File::create(&archive_path)
            .context("Failed to create temporary ZIP file")?;
        
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        
        zip.start_file(binary_name, options)
            .context("Failed to start file in ZIP")?;
        
        zip.write_all(binary_bytes)
            .context("Failed to write binary to ZIP")?;
        
        zip.finish()
            .context("Failed to finalize ZIP archive")?;
        
        Ok(archive_path)
    }
    
    /// On Unix, we can directly write the binary (no ZIP needed)
    #[cfg(unix)]
    async fn create_temp_archive(&self, binary_bytes: &[u8], binary_name: &str) -> Result<PathBuf> {
        let temp_dir = std::env::temp_dir();
        let binary_path = temp_dir.join(format!("openframe-update-{}-{}", Uuid::new_v4(), binary_name));
        
        tokio::fs::write(&binary_path, binary_bytes).await
            .context("Failed to write binary file")?;
        
        Ok(binary_path)
    }
    
    /// Launch PowerShell updater script on Windows
    #[cfg(windows)]
    async fn launch_windows_updater(&self, archive_path: PathBuf) -> Result<()> {
        info!("Launching Windows PowerShell updater");
        
        // Save PowerShell script to temp file
        let script_path = std::env::temp_dir().join(format!(
            "openframe-updater-{}.ps1",
            Uuid::new_v4()
        ));
        
        tokio::fs::write(&script_path, UPDATE_SCRIPT).await
            .context("Failed to write PowerShell script")?;
        
        info!("PowerShell script saved to: {}", script_path.display());
        
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
        
        info!("PowerShell updater launched (PID: {})", child.id());
        
        Ok(())
    }
    
    /// Launch shell script updater on Unix systems
    #[cfg(unix)]
    async fn launch_unix_updater(&self, archive_path: PathBuf) -> Result<()> {
        info!("Launching Unix shell updater");
        
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
