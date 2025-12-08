use anyhow::{Context, Result, anyhow};
use tracing::{info, warn, error};
use crate::models::openframe_client_update_message::OpenFrameClientUpdateMessage;
use crate::models::openframe_client_info::ClientUpdateStatus;
use crate::models::update_state::{UpdateState, UpdatePhase};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
use crate::service::FULL_SERVICE_NAME;
use crate::services::openframe_client_info_service::OpenFrameClientInfoService;
use crate::services::github_download_service::GithubDownloadService;
use crate::services::InstalledAgentMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::update_state_service::UpdateStateService;
use crate::services::update_cleanup_service::UpdateCleanupService;
use crate::platform::DirectoryManager;
#[cfg(windows)]
use crate::platform::get_powershell_path;
use std::path::PathBuf;
use std::process;
use uuid::Uuid;
use std::sync::Arc;
use tokio::sync::Mutex;
use semver::Version;

/// PowerShell script for updating OpenFrame client on Windows
/// This script stops the service, replaces the binary, and restarts the service
const UPDATE_SCRIPT: &str = r#"
param(
    [string]$ArchivePath,
    [string]$ServiceName,
    [string]$TargetExe,
    [string]$UpdateStatePath
)

# Setup logging
$LogFile = Join-Path $env:TEMP "openframe-update-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
}

$ErrorActionPreference = 'Stop'

Write-Log "=== OpenFrame Updater Started ==="
Write-Log "Log file: $LogFile"
Write-Log "Archive: $ArchivePath"
Write-Log "Target: $TargetExe"
Write-Log "Service: $ServiceName"

$BackupPath = $null
$TempExtract = $null

try {
    # 0. Validate inputs
    if (-not (Test-Path $ArchivePath)) {
        throw "Archive file not found: $ArchivePath"
    }
    if (-not (Test-Path $TargetExe)) {
        throw "Target executable not found: $TargetExe"
    }

    $archiveSize = (Get-Item $ArchivePath).Length
    Write-Log "Archive size: $archiveSize bytes"
    if ($archiveSize -lt 100KB) {
        throw "Archive too small ($archiveSize bytes), likely corrupted"
    }

    # 1. Stop the service
    Write-Log "Stopping service: $ServiceName"
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        throw "Service not found: $ServiceName"
    }

    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        Write-Log "Service stop command sent"
    }

    # 2. Wait for service to fully stop
    $timeout = 30
    $elapsed = 0
    while ((Get-Service -Name $ServiceName).Status -ne 'Stopped' -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
    }

    if ($elapsed -ge $timeout) {
        throw "Service did not stop within $timeout seconds"
    }

    Write-Log "Service stopped (took $elapsed seconds)"
    Start-Sleep -Seconds 2

    # 3. Create backup
    $BackupPath = "$TargetExe.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Log "Creating backup: $BackupPath"
    Copy-Item -Path $TargetExe -Destination $BackupPath -Force -ErrorAction Stop

    $backupSize = (Get-Item $BackupPath).Length
    Write-Log "Backup created: $backupSize bytes"

    # 4. Extract archive
    Write-Log "Extracting archive..."
    $TempExtract = Join-Path $env:TEMP "openframe-update-$(New-Guid)"
    Expand-Archive -Path $ArchivePath -DestinationPath $TempExtract -Force -ErrorAction Stop
    Write-Log "Archive extracted to: $TempExtract"

    # 5. Find new executable
    $NewExe = Get-ChildItem -Path $TempExtract -Filter "*.exe" -Recurse | Select-Object -First 1

    if (-not $NewExe) {
        throw "No executable found in archive"
    }

    $newExeSize = $NewExe.Length
    Write-Log "Found executable: $($NewExe.FullName) ($newExeSize bytes)"

    if ($newExeSize -lt 100KB) {
        throw "Extracted executable too small ($newExeSize bytes), likely corrupted"
    }

    # 6. Replace binary
    Write-Log "Replacing binary..."
    Copy-Item -Path $NewExe.FullName -Destination $TargetExe -Force -ErrorAction Stop

    $updatedSize = (Get-Item $TargetExe).Length
    Write-Log "Binary replaced: $updatedSize bytes"

    # 7. Mark update as completed by updating state to Completed phase BEFORE starting service
    if ($UpdateStatePath -and (Test-Path $UpdateStatePath)) {
        try {
            Write-Log "Updating state to Completed phase: $UpdateStatePath"
            $stateContent = Get-Content -Path $UpdateStatePath -Raw | ConvertFrom-Json
            $stateContent.phase = "completed"
            $stateContent | ConvertTo-Json -Depth 10 | Set-Content -Path $UpdateStatePath -Force
            Write-Log "Successfully updated state to Completed phase"
        }
        catch {
            Write-Log "Warning: Failed to update state to Completed: $_"
        }
    } else {
        Write-Log "Warning: UpdateStatePath not provided or does not exist"
    }

    # 8. Start service
    Write-Log "Starting service: $ServiceName"
    Start-Service -Name $ServiceName -ErrorAction Stop

    # 9. Verify service started
    Start-Sleep -Seconds 3
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -ne 'Running') {
        throw "Service status is '$($service.Status)' (expected 'Running')"
    }

    Write-Log "Service started successfully"

    # 10. Cleanup
    Write-Log "Cleaning up temporary files..."
    Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue

    Write-Log "=== Update completed successfully ==="
    exit 0
}
catch {
    Write-Log "ERROR: Update failed: $_"
    Write-Log "Error at line: $($_.InvocationInfo.ScriptLineNumber)"

    # Attempt rollback if backup exists
    if ($BackupPath -and (Test-Path $BackupPath)) {
        Write-Log "Attempting rollback from backup..."
        try {
            Copy-Item -Path $BackupPath -Destination $TargetExe -Force -ErrorAction Stop
            Write-Log "Binary rolled back successfully"

            Write-Log "Attempting to start service..."
            Start-Service -Name $ServiceName -ErrorAction Stop

            Start-Sleep -Seconds 3
            $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -eq 'Running') {
                Write-Log "Service started after rollback"
            } else {
                Write-Log "WARNING: Service may not be running after rollback"
            }
        }
        catch {
            Write-Log "ERROR during rollback: $_"
            Write-Log "Manual intervention required!"
        }
    } else {
        Write-Log "No backup available for rollback"
    }

    # Cleanup temp files even on failure
    if ($TempExtract -and (Test-Path $TempExtract)) {
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Log "=== Update failed ==="
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
    update_state_service: UpdateStateService,
    cleanup_service: UpdateCleanupService,
    /// Mutex to prevent concurrent updates (race condition protection)
    update_in_progress: Arc<Mutex<bool>>,
}

impl OpenFrameClientUpdateService {
    pub fn new(
        directory_manager: DirectoryManager,
        client_info_service: OpenFrameClientInfoService,
        github_download_service: GithubDownloadService,
        config_service: AgentConfigurationService,
        installed_agent_publisher: InstalledAgentMessagePublisher,
        update_state_service: UpdateStateService,
        cleanup_service: UpdateCleanupService,
    ) -> Self {
        Self {
            directory_manager,
            client_info_service,
            github_download_service,
            config_service,
            installed_agent_publisher,
            update_state_service,
            cleanup_service,
            update_in_progress: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn process_update(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let requested_version = message.version.trim();
        info!("Received update request for version: {}", requested_version);

        // 1. Check if update is already in progress (race condition protection)
        {
            let mut update_lock = self.update_in_progress.lock().await;
            if *update_lock {
                warn!("Update already in progress, ignoring duplicate request for version: {}", requested_version);
                return Err(anyhow!("Update already in progress"));
            }
            // Set flag to indicate update is starting
            *update_lock = true;
            info!("Acquired update lock for version: {}", requested_version);
        }

        // Ensure lock is released on error or completion
        let update_result = self.process_update_internal(message).await;

        // Release lock
        {
            let mut update_lock = self.update_in_progress.lock().await;
            *update_lock = false;
            info!("Released update lock");
        }

        update_result
    }

    /// Internal update processing with version validation and safety checks
    async fn process_update_internal(&self, message: OpenFrameClientUpdateMessage) -> Result<()> {
        let requested_version = message.version.trim();

        // 2. Validate version format
        if !Self::is_valid_version(requested_version) {
            error!("Invalid version format: {}", requested_version);
            return Err(anyhow!("Invalid version format: {}", requested_version));
        }

        // 3. Parse requested version with semver to ensure valid format
        Self::parse_version(requested_version)
            .with_context(|| format!("Failed to parse requested version: {}", requested_version))?;

        // 4. Log current version for informational purposes
        let client_info = self.client_info_service.get().await
            .context("Failed to get current client info")?;

        if !client_info.current_version.is_empty() {
            info!(
                "Updating from version {} to {}",
                client_info.current_version, requested_version
            );
        } else {
            info!("No current version set, installing version: {}", requested_version);
        }

        // 5. Create update state for tracking
        let mut update_state = UpdateState::new(requested_version.to_string());
        self.update_state_service.save(&update_state).await
            .context("Failed to save initial update state")?;

        // 6. Set update status to updating
        self.client_info_service
            .set_update_status(ClientUpdateStatus::Updating, Some(requested_version.to_string()))
            .await
            .context("Failed to set update status")?;

        info!("Starting update to version {}", requested_version);

        // Execute update with status rollback
        let update_result = self.execute_update(&message, requested_version, &mut update_state).await;

        // Handle errors: set status to Failed (cleanup already done in execute_update)
        if let Err(ref e) = update_result {
            error!("Update failed: {:#}", e);

            // Set status to Failed
            if let Err(status_err) = self.client_info_service
                .set_update_status(ClientUpdateStatus::Failed, Some(requested_version.to_string()))
                .await
            {
                error!("Failed to set update status to Failed: {:#}", status_err);
            }

            info!("Update failed, NATS will retry");
        }

        update_result
    }

    /// Execute the actual update process
    async fn execute_update(&self, message: &OpenFrameClientUpdateMessage, requested_version: &str, update_state: &mut UpdateState) -> Result<()> {
        // 1. Find the appropriate download configuration for current OS
        let download_config = GithubDownloadService::find_config_for_current_os(&message.download_configurations)
            .context("Failed to find download configuration for current OS")?;

        info!("Using download configuration for OS: {}", download_config.os);

        // 2. Download and extract binary using GithubDownloadService
        update_state.set_phase(UpdatePhase::Downloading);
        self.update_state_service.save(update_state).await?;

        let binary_bytes = match self.github_download_service
            .download_and_extract(download_config)
            .await
        {
            Ok(bytes) => bytes,
            Err(e) => {
                error!("Download failed: {:#}", e);
                // Clear update state - download failed, nothing to cleanup
                self.update_state_service.clear().await?;
                return Err(e.context("Failed to download and extract update"));
            }
        };

        info!("Binary downloaded and extracted ({} bytes)", binary_bytes.len());

        // 3. Extract binary
        update_state.set_phase(UpdatePhase::Extracting);
        self.update_state_service.save(update_state).await?;

        // 4. Save binary to a temp archive for the updater
        // Note: The updater expects a ZIP, so we create one with the binary
        update_state.set_phase(UpdatePhase::PreparingUpdater);
        self.update_state_service.save(update_state).await?;

        let archive_path = match self.create_temp_archive(&binary_bytes, &download_config.agent_file_name).await {
            Ok(path) => path,
            Err(e) => {
                error!("Failed to create archive: {:#}", e);
                // Clear update state - archive creation failed
                self.update_state_service.clear().await?;
                return Err(e.context("Failed to create temporary archive"));
            }
        };

        info!("Temporary archive created: {}", archive_path.display());

        // 5. Launch update process (Windows: PowerShell, Unix: shell script)
        let launch_result = {
            #[cfg(windows)]
            {
                self.launch_windows_updater(archive_path.clone(), update_state).await
            }

            #[cfg(unix)]
            {
                self.launch_unix_updater(archive_path.clone(), update_state).await
            }
        };

        // If launch failed, cleanup archive and state
        if let Err(e) = launch_result {
            error!("Failed to launch updater: {:#}", e);
            // Cleanup archive
            if let Err(cleanup_err) = std::fs::remove_file(&archive_path) {
                warn!("Failed to remove archive after launch failure: {}", cleanup_err);
            }
            // Clear update state
            self.update_state_service.clear().await?;
            return Err(e);
        }

        // PowerShell will stop the service, so everything after this won't execute
        // NATS notification will be sent from recovery service after restart
        info!("Update process launched, service will be stopped by PowerShell");
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
    async fn launch_windows_updater(&self, archive_path: PathBuf, update_state: &mut UpdateState) -> Result<()> {
        use std::os::windows::process::CommandExt;

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

        // Mark updater as launched
        update_state.set_phase(UpdatePhase::UpdaterLaunched);
        self.update_state_service.save(update_state).await?;

        // Service name - use unified constant for all platforms
        let service_name = FULL_SERVICE_NAME;

        // Get update state file path
        let update_state_path = self.update_state_service.get_state_file_path();

        let ps_path = get_powershell_path().map_err(|e| anyhow!(e))?;
        info!("Using PowerShell: {}", ps_path);

        let child = process::Command::new(&ps_path)
            .arg("-ExecutionPolicy").arg("Bypass")
            .arg("-NoProfile")
            .arg("-File").arg(&script_path)
            .arg("-ArchivePath").arg(&archive_path)
            .arg("-ServiceName").arg(service_name)
            .arg("-TargetExe").arg(&current_exe)
            .arg("-UpdateStatePath").arg(&update_state_path)
            .creation_flags(0x08000000)
            .spawn()
            .context("Failed to spawn PowerShell updater")?;

        info!("PowerShell updater launched (PID: {})", child.id());

        Ok(())
    }
    
    /// Launch shell script updater on Unix systems
    #[cfg(unix)]
    async fn launch_unix_updater(&self, archive_path: PathBuf, update_state: &mut UpdateState) -> Result<()> {
        info!("Launching Unix shell updater");

        // Mark updater as launched
        update_state.set_phase(UpdatePhase::UpdaterLaunched);
        self.update_state_service.save(update_state).await?;

        // TODO: Implement Unix updater with shell script or binary copy
        // For now, return error as not implemented
        Err(anyhow!("Unix updater not yet implemented. Use systemd service restart instead."))
    }
    
    /// Parse version string into semver Version
    /// Supports formats like: "1.2.3", "v1.2.3", "1.2.3-beta", "1.2.3+build"
    fn parse_version(version: &str) -> Result<Version> {
        // Remove 'v' prefix if present
        let version = version.trim().trim_start_matches('v');

        Version::parse(version)
            .with_context(|| format!("Failed to parse version: {}", version))
    }

    /// Validate version format (basic semver check)
    fn is_valid_version(version: &str) -> bool {
        !version.is_empty()
            && version.chars().next().map(|c| c.is_ascii_digit() || c == 'v').unwrap_or(false)
            && version.trim_start_matches('v').chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '+')
    }
}
