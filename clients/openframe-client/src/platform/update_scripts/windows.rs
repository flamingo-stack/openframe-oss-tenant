//! Windows PowerShell update script for self-update functionality

pub const UPDATE_SCRIPT_WINDOWS: &str = r#"
param(
    [string]$ArchivePath,
    [string]$ServiceName,
    [string]$TargetExe,
    [string]$UpdateStatePath,
    [string]$TargetVersion,
    [string]$BootMarkerPath,
    [string]$LkgPath,
    [string]$TranscriptPath,
    [int]$BootMarkerWaitSecs = 90,
    [switch]$RollbackOnly
)

$ErrorActionPreference = 'Stop'

if ($TranscriptPath) {
    try { Start-Transcript -Path $TranscriptPath -Force | Out-Null } catch { }
}

$PrevPath = "$TargetExe.prev"
$TempExtract = $null
$SwapReached = $false

function Set-UpdatePhase {
    param([string]$Phase)
    if ($UpdateStatePath -and (Test-Path $UpdateStatePath)) {
        try {
            $stateContent = Get-Content -Path $UpdateStatePath -Raw | ConvertFrom-Json
            $stateContent.phase = $Phase
            $stateTmp = "$UpdateStatePath.tmp"
            $stateContent | ConvertTo-Json -Depth 10 | Set-Content -Path $stateTmp -Force
            Move-Item -Path $stateTmp -Destination $UpdateStatePath -Force
            Write-Output "Update state phase set to '$Phase'"
        }
        catch {
            Write-Output "Failed to stamp update phase '$Phase': $_"
        }
    }
}

function Restore-Reserve {
    if ($LkgPath -and (Test-Path $LkgPath)) {
        $restoreSource = $LkgPath
        Write-Output "Restoring from last-known-good reserve: $LkgPath"
    }
    elseif (Test-Path $PrevPath) {
        $restoreSource = $PrevPath
        Write-Output "Restoring from pre-swap copy: $PrevPath"
    }
    else {
        throw "No reserve available for rollback (checked '$LkgPath' and '$PrevPath')"
    }
    if (Test-Path $TargetExe) {
        try { Move-Item -Path $TargetExe -Destination "$TargetExe.bad" -Force -ErrorAction Stop } catch { }
    }
    Copy-Item -Path $restoreSource -Destination $TargetExe -Force -ErrorAction Stop
    Remove-Item -Path "$TargetExe.bad" -Force -ErrorAction SilentlyContinue
}

function Test-AgentUninstalled {
    return (-not $RollbackOnly) -and $UpdateStatePath -and (-not (Test-Path $UpdateStatePath))
}

try {
    Write-Output "Updater starting: target version '$TargetVersion', target exe '$TargetExe'"

    if ($RollbackOnly) {
        $SwapReached = $true
        throw "Rollback-only mode requested"
    }

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
    Move-Item -Path $TargetExe -Destination $PrevPath -Force -ErrorAction Stop
    $SwapReached = $true

    Copy-Item -Path $NewExe.FullName -Destination $TargetExe -Force -ErrorAction Stop

    if ($BootMarkerPath -and (Test-Path $BootMarkerPath)) {
        Remove-Item -Path $BootMarkerPath -Force -ErrorAction Stop
    }

    # Start service
    Start-Service -Name $ServiceName -ErrorAction Stop

    # Verify service started
    Start-Sleep -Seconds 3
    $service = Get-Service -Name $ServiceName -ErrorAction Stop

    if ($service.Status -ne 'Running') {
        throw "Service failed to start"
    }

    $markerOk = $false
    if ($BootMarkerPath -and $TargetVersion) {
        $elapsed = 0
        while ($elapsed -lt $BootMarkerWaitSecs) {
            if (Test-Path $BootMarkerPath) {
                $markerVersion = Get-Content -Path $BootMarkerPath -Raw -ErrorAction SilentlyContinue
                if ($markerVersion) { $markerVersion = $markerVersion.Trim() }
                if ($markerVersion -eq $TargetVersion) {
                    $markerOk = $true
                    break
                }
                if ($markerVersion) {
                    Write-Output "Boot marker reports '$markerVersion', expected '$TargetVersion' — wrong binary booted"
                    break
                }
            }
            Start-Sleep -Seconds 2
            $elapsed += 2
        }
    }
    else {
        Write-Output "No boot marker path/target version provided, skipping boot check"
        $markerOk = $true
    }

    if (-not $markerOk) {
        throw "New binary did not report target version '$TargetVersion' within $BootMarkerWaitSecs seconds"
    }

    Write-Output "Boot marker matched target version '$TargetVersion'"

    Set-UpdatePhase -Phase "verifying"

    # Cleanup
    Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue

    exit 0
}
catch {
    Write-Output "Updater failed: $_"

    if (Test-AgentUninstalled) {
        Write-Output "Update state file is gone (agent uninstalled mid-update) — standing down without touching the service"
        if ($TempExtract -and (Test-Path $TempExtract)) {
            Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
        }
        if ($ArchivePath -and (Test-Path $ArchivePath)) {
            Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }

    if ($SwapReached) {
        try {
            $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -ne 'Stopped') {
                Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
                $rbStop = 0
                while ((Get-Service -Name $ServiceName).Status -ne 'Stopped' -and $rbStop -lt 30) {
                    Start-Sleep -Seconds 1
                    $rbStop++
                }
                Start-Sleep -Seconds 2
            }

            $restored = $false
            for ($restoreAttempt = 1; $restoreAttempt -le 3; $restoreAttempt++) {
                try {
                    Restore-Reserve
                    $restored = $true
                    break
                }
                catch {
                    Write-Output "Restore attempt $restoreAttempt failed: $_"
                    Start-Sleep -Seconds 2
                }
            }
            if (-not $restored) {
                throw "All restore attempts failed"
            }

            Start-Service -Name $ServiceName -ErrorAction Stop
            $rbElapsed = 0
            while ((Get-Service -Name $ServiceName).Status -ne 'Running' -and $rbElapsed -lt 30) {
                Start-Sleep -Seconds 1
                $rbElapsed++
            }
            if ((Get-Service -Name $ServiceName).Status -ne 'Running') {
                throw "Service did not reach Running state after rollback"
            }

            Set-UpdatePhase -Phase "rolled_back"
            Write-Output "Rollback complete, service restarted"
        }
        catch {
            Write-Output "Rollback failed: $_"
            try {
                if ((Get-Service -Name $ServiceName -ErrorAction Stop).Status -ne 'Running') {
                    Start-Service -Name $ServiceName -ErrorAction Stop
                    Write-Output "Service restarted with the binary currently in place"
                }
            }
            catch {
                Write-Output "Failed to restart service after failed rollback: $_"
            }
        }
    }
    else {
        Write-Output "Failure happened before the binary swap, no rollback needed"
        try {
            $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -ne 'Running') {
                Start-Service -Name $ServiceName -ErrorAction Stop
                Write-Output "Service restarted with the untouched binary"
            }
        }
        catch {
            Write-Output "Failed to restart service after pre-swap failure: $_"
        }
    }

    # Cleanup temp files even on failure
    if ($TempExtract -and (Test-Path $TempExtract)) {
        Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
    }
    if ($ArchivePath -and (Test-Path $ArchivePath)) {
        Remove-Item -Path $ArchivePath -Force -ErrorAction SilentlyContinue
    }

    exit 1
}
finally {
    if ($TranscriptPath) {
        try { Stop-Transcript | Out-Null } catch { }
    }
}
"#;
