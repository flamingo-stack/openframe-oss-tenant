# OpenFrame Client Update Script
# Works locally and remotely (via PSRemoting, RMM tools, etc.)
#
# Usage:
#   Local:  .\quick-update.ps1
#   Remote: Invoke-Command -ComputerName PC01 -FilePath .\quick-update.ps1
#   RMM:    Run as system with -Silent flag

[CmdletBinding()]
param(
    [string]$InstallPath = "$env:ProgramFiles\OpenFrame",
    [string]$LogPath = "$env:ProgramData\OpenFrame\Logs",
    [switch]$Silent,
    [switch]$NoRestart,
    [switch]$CreateBackup,
    [int]$MaxRetries = 3,
    [int]$TimeoutSeconds = 300
)

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# Configuration
$script:Config = @{
    GitHubReleaseUrl = "https://github.com/flamingo-stack/openframe-oss-tenant/releases/latest/download/openframe-client.exe"
    ClientExecutable = "openframe-client.exe"
    ProcessName = "openframe-client"
    Version = "1.0.0"
}

# Initialize logging
function Initialize-Logging {
    if (-not (Test-Path $LogPath)) {
        New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $script:LogFile = Join-Path $LogPath "update_$timestamp.log"
}

# Logging function
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'SUCCESS', 'WARNING', 'ERROR')]
        [string]$Level = 'INFO',
        [switch]$NoConsole
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Write to log file
    Add-Content -Path $script:LogFile -Value $logMessage -ErrorAction SilentlyContinue

    # Write to console if not silent
    if (-not $Silent -and -not $NoConsole) {
        $color = switch ($Level) {
            'INFO'    { 'Cyan' }
            'SUCCESS' { 'Green' }
            'WARNING' { 'Yellow' }
            'ERROR'   { 'Red' }
        }
        Write-Host $logMessage -ForegroundColor $color
    }
}

# Check if running in remote session
function Test-RemoteSession {
    return $null -ne $env:PSComputerName -or
           $null -ne $env:SSH_CONNECTION -or
           [bool]$env:SESSIONNAME -match "^RDP-"
}

# Stop OpenFrame client processes
function Stop-ClientProcesses {
    Write-Log "Checking for running OpenFrame client processes..."

    try {
        $processes = Get-Process -Name $Config.ProcessName -ErrorAction SilentlyContinue

        if ($processes) {
            Write-Log "Found $($processes.Count) running process(es). Stopping..." -Level WARNING

            foreach ($process in $processes) {
                try {
                    $process | Stop-Process -Force -ErrorAction Stop
                    Write-Log "Stopped process ID: $($process.Id)" -Level SUCCESS
                }
                catch {
                    Write-Log "Failed to stop process $($process.Id): $_" -Level ERROR
                    throw
                }
            }

            # Wait for processes to fully terminate
            Start-Sleep -Seconds 2

            # Verify all stopped
            $remaining = Get-Process -Name $Config.ProcessName -ErrorAction SilentlyContinue
            if ($remaining) {
                throw "Failed to stop all processes. $($remaining.Count) still running."
            }
        }
        else {
            Write-Log "No running processes found"
        }

        return $true
    }
    catch {
        Write-Log "Error stopping processes: $_" -Level ERROR
        return $false
    }
}

# Create backup if requested
function Backup-Client {
    param([string]$SourcePath)

    if (-not $CreateBackup) {
        Write-Log "Backup skipped (not requested)"
        return $true
    }

    if (-not (Test-Path $SourcePath)) {
        Write-Log "No existing client to backup" -Level WARNING
        return $true
    }

    try {
        $backupDir = Join-Path $InstallPath "Backup"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        }

        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupPath = Join-Path $backupDir "$($Config.ClientExecutable).$timestamp.bak"

        Copy-Item -Path $SourcePath -Destination $backupPath -Force
        Write-Log "Backup created: $backupPath" -Level SUCCESS

        # Keep only last 5 backups
        Get-ChildItem -Path $backupDir -Filter "*.bak" |
            Sort-Object LastWriteTime -Descending |
            Select-Object -Skip 5 |
            Remove-Item -Force

        return $true
    }
    catch {
        Write-Log "Backup failed: $_" -Level ERROR
        return $false
    }
}

# Download client with retry logic
function Get-ClientFromGitHub {
    param([string]$DestinationPath)

    Write-Log "Downloading from: $($Config.GitHubReleaseUrl)"

    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Log "Download attempt $i of $MaxRetries..."

            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

            $webRequest = [System.Net.HttpWebRequest]::Create($Config.GitHubReleaseUrl)
            $webRequest.Timeout = $TimeoutSeconds * 1000

            Invoke-WebRequest -Uri $Config.GitHubReleaseUrl `
                              -OutFile $DestinationPath `
                              -UseBasicParsing `
                              -TimeoutSec $TimeoutSeconds `
                              -ErrorAction Stop

            if (Test-Path $DestinationPath) {
                $fileSize = (Get-Item $DestinationPath).Length / 1MB
                Write-Log "Downloaded successfully: $([math]::Round($fileSize, 2)) MB" -Level SUCCESS
                return $true
            }
        }
        catch {
            Write-Log "Download attempt $i failed: $_" -Level WARNING
            if ($i -lt $MaxRetries) {
                $waitTime = [math]::Pow(2, $i)
                Write-Log "Waiting $waitTime seconds before retry..."
                Start-Sleep -Seconds $waitTime
            }
        }
    }

    Write-Log "Download failed after $MaxRetries attempts" -Level ERROR
    return $false
}

# Install the client
function Install-Client {
    param(
        [string]$SourcePath,
        [string]$TargetPath
    )

    try {
        Write-Log "Installing client to: $TargetPath"

        $targetDir = Split-Path -Parent $TargetPath
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            Write-Log "Created installation directory: $targetDir"
        }

        Copy-Item -Path $SourcePath -Destination $TargetPath -Force -ErrorAction Stop

        if (Test-Path $TargetPath) {
            $fileInfo = Get-Item $TargetPath
            Write-Log "Installation successful" -Level SUCCESS
            Write-Log "File size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
            Write-Log "Last modified: $($fileInfo.LastWriteTime)"
            return $true
        }
        else {
            Write-Log "Installation failed: Target file not found" -Level ERROR
            return $false
        }
    }
    catch {
        Write-Log "Installation error: $_" -Level ERROR
        return $false
    }
}

# Verify installation
function Test-ClientInstallation {
    param([string]$ClientPath)

    try {
        if (-not (Test-Path $ClientPath)) {
            return $false
        }

        $fileInfo = Get-Item $ClientPath
        if ($fileInfo.Length -lt 1MB) {
            Write-Log "Warning: Client file seems too small ($($fileInfo.Length) bytes)" -Level WARNING
            return $false
        }

        return $true
    }
    catch {
        return $false
    }
}

# Main execution
function Main {
    $exitCode = 0

    try {
        Initialize-Logging

        Write-Log "========================================" -Level INFO
        Write-Log "OpenFrame Client Update Script v$($Config.Version)" -Level INFO
        Write-Log "========================================" -Level INFO
        Write-Log "Installation Path: $InstallPath"
        Write-Log "Log Path: $LogFile"
        Write-Log "Silent Mode: $Silent"
        Write-Log "Remote Session: $(Test-RemoteSession)"
        Write-Log "========================================" -Level INFO

        # Step 1: Stop running processes
        Write-Log "Step 1: Stopping client processes..."
        if (-not (Stop-ClientProcesses)) {
            throw "Failed to stop client processes"
        }

        # Step 2: Backup existing client
        $targetPath = Join-Path $InstallPath $Config.ClientExecutable
        Write-Log "Step 2: Backup..."
        if (-not (Backup-Client -SourcePath $targetPath)) {
            if ($CreateBackup) {
                throw "Backup failed and was required"
            }
        }

        # Step 3: Download new version
        Write-Log "Step 3: Downloading latest version..."
        $tempFile = Join-Path $env:TEMP "openframe-client-update-$(Get-Date -Format 'yyyyMMddHHmmss').exe"

        if (-not (Get-ClientFromGitHub -DestinationPath $tempFile)) {
            throw "Download failed"
        }

        # Step 4: Install
        Write-Log "Step 4: Installing..."
        if (-not (Install-Client -SourcePath $tempFile -TargetPath $targetPath)) {
            throw "Installation failed"
        }

        # Step 5: Verify
        Write-Log "Step 5: Verifying installation..."
        if (-not (Test-ClientInstallation -ClientPath $targetPath)) {
            throw "Installation verification failed"
        }

        # Step 6: Cleanup
        Write-Log "Step 6: Cleaning up..."
        try {
            Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
            Write-Log "Temporary files removed"
        }
        catch {
            Write-Log "Cleanup warning: $_" -Level WARNING
        }

        # Step 7: Restart client if requested
        if (-not $NoRestart -and -not (Test-RemoteSession)) {
            Write-Log "Step 7: Restarting client..."
            try {
                Start-Process -FilePath $targetPath -ErrorAction Stop
                Write-Log "Client started successfully" -Level SUCCESS
            }
            catch {
                Write-Log "Failed to start client: $_" -Level WARNING
            }
        }
        else {
            Write-Log "Step 7: Client restart skipped"
        }

        Write-Log "========================================" -Level SUCCESS
        Write-Log "UPDATE COMPLETED SUCCESSFULLY" -Level SUCCESS
        Write-Log "========================================" -Level SUCCESS
        Write-Log "Client location: $targetPath"
        Write-Log "Log file: $LogFile"

        $exitCode = 0
    }
    catch {
        Write-Log "========================================" -Level ERROR
        Write-Log "UPDATE FAILED" -Level ERROR
        Write-Log "========================================" -Level ERROR
        Write-Log "Error: $_" -Level ERROR
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level ERROR -NoConsole
        Write-Log "Log file: $LogFile" -Level ERROR

        $exitCode = 1
    }
    finally {
        Write-Log "Exit code: $exitCode"
        exit $exitCode
    }
}

# Execute
Main