//! Windows PowerShell update script for self-update functionality

pub const UPDATE_SCRIPT_WINDOWS: &str = r#"
param(
    [string]$ArchivePath,
    [string]$ServiceName,
    [string]$TargetExe,
    [string]$UpdateStatePath
)

$ErrorActionPreference = 'Stop'

$BackupPath = $null
$TempExtract = $null

try {
    # Validate inputs
    if (-not (Test-Path $ArchivePath)) {
        throw "Archive file not found: $ArchivePath"
    }
    if (-not (Test-Path $TargetExe)) {
        throw "Target executable not found: $TargetExe"
    }

    $archiveSize = (Get-Item $ArchivePath).Length
    if ($archiveSize -lt 100KB) {
        throw "Archive too small ($archiveSize bytes), likely corrupted"
    }

    # Stop the service
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if (-not $service) {
        throw "Service not found: $ServiceName"
    }

    if ($service.Status -ne 'Stopped') {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
    }

    # Wait for service to fully stop
    $timeout = 30
    $elapsed = 0
    while ((Get-Service -Name $ServiceName).Status -ne 'Stopped' -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
    }

    if ($elapsed -ge $timeout) {
        throw "Service did not stop within $timeout seconds"
    }

    Start-Sleep -Seconds 2

    # Create backup
    $BackupPath = "$TargetExe.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item -Path $TargetExe -Destination $BackupPath -Force -ErrorAction Stop

    # Extract archive
    $TempExtract = Join-Path $env:TEMP "openframe-update-$(New-Guid)"
    Expand-Archive -Path $ArchivePath -DestinationPath $TempExtract -Force -ErrorAction Stop

    # Find new executable
    $NewExe = Get-ChildItem -Path $TempExtract -Filter "*.exe" -Recurse | Select-Object -First 1

    if (-not $NewExe) {
        throw "No executable found in archive"
    }

    if ($NewExe.Length -lt 100KB) {
        throw "Extracted executable too small, likely corrupted"
    }

    # Replace binary
    Copy-Item -Path $NewExe.FullName -Destination $TargetExe -Force -ErrorAction Stop

    # Mark update as completed
    if ($UpdateStatePath -and (Test-Path $UpdateStatePath)) {
        try {
            $stateContent = Get-Content -Path $UpdateStatePath -Raw | ConvertFrom-Json
            $stateContent.phase = "completed"
            $stateContent | ConvertTo-Json -Depth 10 | Set-Content -Path $UpdateStatePath -Force
        }
        catch {
            # Ignore state update errors
        }
    }

    # Start service
    Start-Service -Name $ServiceName -ErrorAction Stop

    # Verify service started
    Start-Sleep -Seconds 3
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -ne 'Running') {
        throw "Service failed to start"
    }

    # Cleanup
    Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue

    exit 0
}
catch {
    # Attempt rollback if backup exists
    if ($BackupPath -and (Test-Path $BackupPath)) {
        try {
            Copy-Item -Path $BackupPath -Destination $TargetExe -Force -ErrorAction Stop
            Start-Service -Name $ServiceName -ErrorAction SilentlyContinue
        }
        catch {
            # Rollback failed
        }
    }

    # Cleanup temp files even on failure
    if ($TempExtract -and (Test-Path $TempExtract)) {
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }

    exit 1
}
"#;
