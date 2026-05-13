#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Installs or uninstalls the OpenFrame Client Updater service on Windows.

.PARAMETER ServerUrl
    Base URL of the OpenFrame server (e.g. openframe.example.com). Used to download the binary.

.PARAMETER Uninstall
    Uninstall the updater service and remove the binary.

.PARAMETER NodeId
    Optional machine identifier passed through for diagnostics.
#>
param(
    [string]$ServerUrl = "",
    [switch]$Uninstall,
    [string]$NodeId = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ServiceName    = "com.openframe.client-updater"
$InstallDir     = "$env:ProgramFiles\OpenFrame\bin"
$BinaryName     = "openframe-client-updater.exe"
$BinaryPath     = Join-Path $InstallDir $BinaryName
$DataDir        = "$env:ProgramData\OpenFrame"
$AgentConfigPath = Join-Path $DataDir "secured\agent_config.json"

function Write-Log($Message) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] $Message"
}

function Test-AdminPrivilege {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-AdminPrivilege)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

# ── Uninstall ─────────────────────────────────────────────────────────────────
if ($Uninstall) {
    Write-Log "Uninstalling OpenFrame Client Updater..."

    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        & sc.exe delete $ServiceName | Out-Null
        Write-Log "Service removed."
    } else {
        Write-Log "Service not found — skipping."
    }

    if (Test-Path $BinaryPath) {
        Remove-Item -Path $BinaryPath -Force
        Write-Log "Binary removed: $BinaryPath"
    }

    Write-Log "Uninstall complete."
    exit 0
}

# ── Install ───────────────────────────────────────────────────────────────────
if (-not $ServerUrl) {
    Write-Error "-ServerUrl is required for installation."
    exit 1
}

# Verify main client has registered (agent_config.json with machine_id must exist)
if (-not (Test-Path $AgentConfigPath)) {
    Write-Error "agent_config.json not found at $AgentConfigPath. Install and start openframe-client first."
    exit 1
}

$agentConfig = Get-Content $AgentConfigPath -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($agentConfig.machine_id)) {
    Write-Error "machine_id is empty in agent_config.json. Ensure openframe-client has completed registration."
    exit 1
}

Write-Log "Main client registered (machine_id: $($agentConfig.machine_id)). Proceeding."

# Download binary
$DownloadUrl = "https://$ServerUrl/openframe_public/$BinaryName"
$TempPath    = Join-Path $env:TEMP $BinaryName

Write-Log "Downloading from $DownloadUrl ..."
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempPath -UseBasicParsing
} catch {
    Write-Error "Download failed: $_"
    exit 1
}

if ((Get-Item $TempPath).Length -lt 102400) {
    Write-Error "Downloaded file is too small — download may have failed."
    exit 1
}

# Place binary
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path $TempPath -Destination $BinaryPath -Force
Remove-Item -Path $TempPath -Force
Write-Log "Binary installed to $BinaryPath"

# Register service via the binary's own install command
Write-Log "Registering service..."
& $BinaryPath install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Service registration failed (exit code $LASTEXITCODE)."
    exit 1
}

Write-Log "OpenFrame Client Updater installed successfully."
