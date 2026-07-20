//! Windows PowerShell update script. After the swap it waits for the new binary's
//! boot marker; if that never matches, it rolls back, preferring the verified
//! `.lkg` reserve over the pre-swap `.prev` copy. Success is never stamped here —
//! the agent verifies itself after restart. All output goes to a transcript log.

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

# Single-slot pre-swap safety copy.
$PrevPath = "$TargetExe.prev"
$TempExtract = $null
# Roll back only if we got far enough to touch the target exe.
$SwapReached = $false

function Set-UpdatePhase {
    param([string]$Phase)
    if ($UpdateStatePath -and (Test-Path $UpdateStatePath)) {
        try {
            $stateContent = Get-Content -Path $UpdateStatePath -Raw | ConvertFrom-Json
            $stateContent.phase = $Phase
            # Temp + move: the agent also reads/writes this file around restart.
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
    # Prefer the verified last-known-good reserve; fall back to the pre-swap copy.
    if ($LkgPath -and (Test-Path $LkgPath)) {
        Write-Output "Restoring from last-known-good reserve: $LkgPath"
        Copy-Item -Path $LkgPath -Destination $TargetExe -Force -ErrorAction Stop
    }
    elseif (Test-Path $PrevPath) {
        Write-Output "Restoring from pre-swap copy: $PrevPath"
        Copy-Item -Path $PrevPath -Destination $TargetExe -Force -ErrorAction Stop
    }
    else {
        throw "No reserve available for rollback (checked '$LkgPath' and '$PrevPath')"
    }
}

try {
    Write-Output "Updater starting: target version '$TargetVersion', target exe '$TargetExe'"

    if ($RollbackOnly) {
        # Layer-2 rollback (crash-loop guard): no archive, no swap — jump straight
        # into the hardened catch path to restore the reserve and restart.
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

    Copy-Item -Path $TargetExe -Destination $PrevPath -Force -ErrorAction Stop
    $SwapReached = $true

    # Replace binary. Deliberately no phase="completed" stamp — the agent verifies
    # itself after restart.
    Copy-Item -Path $NewExe.FullName -Destination $TargetExe -Force -ErrorAction Stop

    # Delete any stale marker from the OLD binary; the wait below must only see the
    # NEW binary's write. Already past the swap, so a throw lands in rollback.
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

    # Wait for the NEW binary to report its baked version via the boot marker.
    # (Pre-ratchet targets never write one and time out into rollback.)
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
                # The marker is written atomically (temp + rename), so a non-empty
                # mismatch means the wrong binary booted — fail into rollback now.
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
        # Legacy invocation without marker plumbing: service-running is the signal.
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

    if ($SwapReached) {
        try {
            $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -ne 'Stopped') {
                # Rollback can trigger while the service is running (boot-marker
                # timeout), so wait for a real stop before touching the exe.
                Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
                $rbStop = 0
                while ((Get-Service -Name $ServiceName).Status -ne 'Stopped' -and $rbStop -lt 30) {
                    Start-Sleep -Seconds 1
                    $rbStop++
                }
                Start-Sleep -Seconds 2
            }

            # The process may release the exe a moment after SCM reports Stopped.
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

            # The restart must succeed before we report a successful rollback.
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
            # Never leave the agent down: start whatever binary is in place.
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
        # Binary untouched, but the service may already be stopped — bring it back.
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
