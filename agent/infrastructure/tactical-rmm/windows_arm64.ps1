#
# windows_arm64.ps1
#
# Purpose:
#   - Install Tactical RMM agent on Windows ARM64
#   - Uses AMD64 binary with Windows on ARM64 emulation
#   - Simple flow: check if installed, uninstall if yes, install from binary
#   - Automatically configures the agent to use ws:// protocol instead of wss:// for WebSockets
#
# Usage Examples:
#   1) Interactive mode:
#      .\windows_arm64.ps1
#   2) Provide all args:
#      .\windows_arm64.ps1 -OrgName "OpenFrame" -RmmUrl "http://localhost:8000" -AuthKey "your-key" -ClientId "1" -SiteId "1"
#
# Requirements:
#   - Windows ARM64
#   - PowerShell 5.1 or higher
#   - Administrator privileges for installing dependencies and services
#

############################
# Parse Script Arguments
############################

param (
    [string]$OrgName,
    [string]$Email,
    [string]$RmmUrl,
    [string]$AuthKey,
    [string]$ClientId = "1",
    [string]$SiteId = "1",
    [string]$AgentType = "workstation",
    [string]$LogPath = "C:\logs\tactical.log",
    [switch]$Help
)

# Ensure script is running with administrator privileges
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script requires administrator privileges. Please restart as administrator." -ForegroundColor Red
    exit 1
}

############################
# Default / Config
############################

$RMMAGENT_REPO = "https://github.com/amidaware/rmmagent.git"
$RMMAGENT_BRANCH = "master"
$OUTPUT_BINARY = "rmmagent-windows-arm64.exe"
$AMD64_BINARY = "tacticalagent-v2.9.0-windows-amd64.exe"
$AMD64_BINARY_PATH = Join-Path (Split-Path -Parent $PSCommandPath) "binaries\$AMD64_BINARY"

# We'll store user-provided or prompted values in these variables:
$script:OrgName = if ([string]::IsNullOrEmpty($OrgName) -or $OrgName -eq $true -or $OrgName -eq "True") { "" } else { $OrgName }
$script:ContactEmail = if ([string]::IsNullOrEmpty($Email) -or $Email -eq $true -or $Email -eq "True") { "" } else { $Email }
$script:RmmServerUrl = if ([string]::IsNullOrEmpty($RmmUrl) -or $RmmUrl -eq $true -or $RmmUrl -eq "True") { "" } else { $RmmUrl }
$script:AgentAuthKey = if ([string]::IsNullOrEmpty($AuthKey) -or $AuthKey -eq $true -or $AuthKey -eq "True") { "" } else { $AuthKey }
$script:AgentLogPath = if ([string]::IsNullOrEmpty($LogPath) -or $LogPath -eq $true -or $LogPath -eq "True") { "" } else { $LogPath }
# Ensure BuildFolder has a default that's not the variable name itself
$script:BuildFolder = if ([string]::IsNullOrEmpty($BuildFolder) -or $BuildFolder -eq "$true") { "rmmagent" } else { $BuildFolder }
$SkipRun = $SkipRun -or $false

# Initialize parameters with defaults if not provided
# Parse ClientId and SiteId as integers since that's what the agent expects
# Use proper integer parsing with TryParse for ClientId
$tempClientId = 1
if (-not ([string]::IsNullOrEmpty($ClientId) -or $ClientId -eq $true -or $ClientId -eq "True")) {
    $tempValue = 0
    if ([int]::TryParse($ClientId, [ref]$tempValue)) {
        $tempClientId = $tempValue
    }
}
[int]$script:ClientId = $tempClientId

# Use proper integer parsing with TryParse for SiteId
$tempSiteId = 1
if (-not ([string]::IsNullOrEmpty($SiteId) -or $SiteId -eq $true -or $SiteId -eq "True")) {
    $tempValue = 0
    if ([int]::TryParse($SiteId, [ref]$tempValue)) {
        $tempSiteId = $tempValue
    }
}
[int]$script:SiteId = $tempSiteId
[string]$script:AgentType = if ([string]::IsNullOrEmpty($AgentType) -or $AgentType -eq $true -or $AgentType -eq "True") { "workstation" } else { "$AgentType" }

# Ensure AgentType has a default value
if ([string]::IsNullOrEmpty($AgentType)) {
    $AgentType = "workstation"
}

# Function to display help
function Show-Help {
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "Windows ARM64 Tactical RMM Agent Installer" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script installs the Tactical RMM agent on Windows ARM64 systems."
    Write-Host "It uses the AMD64 binary with Windows on ARM64 emulation."
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\windows_arm64.ps1 [parameters]"
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -OrgName        Organization name"
    Write-Host "  -Email          Contact email"
    Write-Host "  -RmmUrl         URL of the RMM server"
    Write-Host "  -AuthKey        Authentication key for the RMM server"
    Write-Host "  -ClientId       Client ID (default: 1)"
    Write-Host "  -SiteId         Site ID (default: 1)"
    Write-Host "  -AgentType      Agent type (default: workstation)"
    Write-Host "  -LogPath        Log file path (default: C:\logs\tactical.log)"
    Write-Host "  -Help           Display this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  # Interactive mode (will prompt for missing values):"
    Write-Host "  .\windows_arm64.ps1"
    Write-Host ""
    Write-Host "  # Non-interactive mode with all parameters:"
    Write-Host "  .\windows_arm64.ps1 -OrgName 'OpenFrame' -Email 'admin@example.com' -RmmUrl 'http://rmm.example.com' -AuthKey 'your-auth-key' -ClientId 1 -SiteId 1 -AgentType 'workstation'"
    Write-Host ""
    Write-Host "Note: This script requires administrator privileges." -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Cyan
    exit 0
}

# Show help if requested or if no parameters provided
if ($Help) {
    Show-Help
}

############################
# WebSocket Protocol Functions
############################

function Set-WebSocketProtocolEnvironment {
    param (
        [string]$RmmUrl
    )
    
    Write-Host "Setting environment variables to override WebSocket protocol to ws://..." -ForegroundColor Yellow
    
    # Set environment variables to override WebSocket protocol
    [Environment]::SetEnvironmentVariable("NATS_WS_SCHEME", "ws", [System.EnvironmentVariableTarget]::Process)
    [Environment]::SetEnvironmentVariable("NATS_WS_SCHEME", "ws", [System.EnvironmentVariableTarget]::User)
    [Environment]::SetEnvironmentVariable("NATS_WS_SCHEME", "ws", [System.EnvironmentVariableTarget]::Machine)
    
    Write-Host "WebSocket protocol environment variables set successfully" -ForegroundColor Green
    return $true
}

function Set-WebSocketRegistrySettings {
    param (
        [string]$RmmUrl
    )
    
    Write-Host "Setting WebSocket protocol registry settings..." -ForegroundColor Yellow
    
    # Create registry keys to override WebSocket protocol
    try {
        # Create HKLM:\SOFTWARE\TacticalRMM if it doesn't exist
        if (-not (Test-Path "HKLM:\SOFTWARE\TacticalRMM")) {
            New-Item -Path "HKLM:\SOFTWARE\TacticalRMM" -Force | Out-Null
        }
        
        # Set registry values
        New-ItemProperty -Path "HKLM:\SOFTWARE\TacticalRMM" -Name "NatsWsScheme" -Value "ws" -PropertyType String -Force | Out-Null
        
        Write-Host "Registry settings configured successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Error setting registry keys: ${_}" -ForegroundColor Red
        return $false
    }
}

############################
# Installation Functions
############################

# 1. Check if Tactical RMM is already installed
function Check-TacticalInstalled {
    Write-Host "=== STEP 1: Checking if Tactical RMM is already installed ===" -ForegroundColor Cyan
    
    # Check for Tactical RMM service
    $tacticalService = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
    
    # Check for Tactical RMM executable in Program Files
    $programFilesPath = "${env:ProgramFiles}"
    $programFilesX86Path = "${env:ProgramFiles(x86)}"
    
    $tacticalExePath = "$programFilesPath\TacticalAgent\tacticalrmm.exe"
    $tacticalExeX86Path = "$programFilesX86Path\TacticalAgent\tacticalrmm.exe"
    
    $tacticalExeExists = Test-Path $tacticalExePath
    $tacticalExeX86Exists = Test-Path $tacticalExeX86Path
    
    if ($tacticalService -or $tacticalExeExists -or $tacticalExeX86Exists) {
        Write-Host "Tactical RMM is already installed." -ForegroundColor Yellow
        
        if ($tacticalService) {
            Write-Host "Found Tactical RMM service." -ForegroundColor Yellow
        }
        
        if ($tacticalExeExists) {
            Write-Host "Found Tactical RMM executable at: $tacticalExePath" -ForegroundColor Yellow
        }
        
        if ($tacticalExeX86Exists) {
            Write-Host "Found Tactical RMM executable at: $tacticalExeX86Path" -ForegroundColor Yellow
        }
        
        return $true
    } else {
        Write-Host "Tactical RMM is not installed." -ForegroundColor Green
        return $false
    }
}

# 2. Uninstall if already installed
function Uninstall-TacticalRMM {
    Write-Host "=== STEP 2: Uninstalling existing Tactical RMM agent ===" -ForegroundColor Cyan
    
    # Try to stop the service first
    try {
        $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "Stopping Tactical RMM service..." -ForegroundColor Yellow
            Stop-Service -Name "tacticalrmm" -Force -ErrorAction SilentlyContinue
            Write-Host "Service stopped." -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: Could not stop service: ${_}" -ForegroundColor Yellow
    }
    
    # Check for uninstaller in Program Files
    $programFilesPath = "${env:ProgramFiles}"
    $programFilesX86Path = "${env:ProgramFiles(x86)}"
    
    $uninstallerPath = "$programFilesPath\TacticalAgent\unins000.exe"
    $uninstallerX86Path = "$programFilesX86Path\TacticalAgent\unins000.exe"
    
    $uninstallerExists = Test-Path $uninstallerPath
    $uninstallerX86Exists = Test-Path $uninstallerX86Path
    
    if ($uninstallerExists) {
        Write-Host "Running uninstaller: $uninstallerPath /VERYSILENT" -ForegroundColor Yellow
        Start-Process -FilePath $uninstallerPath -ArgumentList "/VERYSILENT" -Wait
        Write-Host "Uninstallation completed." -ForegroundColor Green
    } elseif ($uninstallerX86Exists) {
        Write-Host "Running uninstaller: $uninstallerX86Path /VERYSILENT" -ForegroundColor Yellow
        Start-Process -FilePath $uninstallerX86Path -ArgumentList "/VERYSILENT" -Wait
        Write-Host "Uninstallation completed." -ForegroundColor Green
    } else {
        Write-Host "No uninstaller found. Attempting manual cleanup..." -ForegroundColor Yellow
        
        # Try to remove service
        try {
            $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
            if ($service) {
                Write-Host "Removing Tactical RMM service..." -ForegroundColor Yellow
                & sc.exe delete "tacticalrmm"
                Write-Host "Service removed." -ForegroundColor Green
            }
        } catch {
            Write-Host "Warning: Could not remove service: ${_}" -ForegroundColor Yellow
        }
        
        # Try to remove directories
        try {
            if (Test-Path "$programFilesPath\TacticalAgent") {
                Write-Host "Removing $programFilesPath\TacticalAgent directory..." -ForegroundColor Yellow
                Remove-Item -Path "$programFilesPath\TacticalAgent" -Recurse -Force -ErrorAction SilentlyContinue
            }
            
            if (Test-Path "$programFilesX86Path\TacticalAgent") {
                Write-Host "Removing $programFilesX86Path\TacticalAgent directory..." -ForegroundColor Yellow
                Remove-Item -Path "$programFilesX86Path\TacticalAgent" -Recurse -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host "Warning: Could not remove directories: ${_}" -ForegroundColor Yellow
        }
    }
}

# 3. Install from binary
function Install-FromBinary {
    param (
        [string]$BinaryPath = "$PSScriptRoot\rmmagent-windows-arm64.exe",
        [string]$RmmUrl = $RmmServerUrl,
        [string]$AuthKey = $AgentAuthKey,
        [int]$ClientId = $script:ClientId,
        [int]$SiteId = $script:SiteId,
        [string]$AgentType = $script:AgentType,
        [string]$LogPath = $AgentLogPath
    )
    
    # Verify binary exists
    if (-not (Test-Path $BinaryPath)) {
        Write-Host "ERROR: Binary not found at $BinaryPath" -ForegroundColor Red
        Write-Host "Please ensure the binary exists in the script directory." -ForegroundColor Yellow
        return $false
    }
    
    # Apply WebSocket protocol modifications for non-HTTPS URLs
    if ($RmmUrl -match "^http://") {
        Write-Host "Setting WebSocket protocol for non-HTTPS URL..." -ForegroundColor Yellow
        Set-WebSocketProtocolEnvironment -RmmUrl $RmmUrl
        Set-WebSocketRegistrySettings -RmmUrl $RmmUrl
    }
    
    # Ensure log directory exists
    $logDir = Split-Path -Parent $LogPath
    if (-not (Test-Path $logDir)) {
        Write-Host "Creating log directory: $logDir" -ForegroundColor Yellow
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
    
    # Install the agent
    try {
        Write-Host "Running binary installation: & `"$BinaryPath`" /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Cyan
        Start-Process -FilePath $BinaryPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
        
        # Configure the agent with parameters
        $programFilesPath = "${env:ProgramFiles}"
        $installedAgentPath = "$programFilesPath\TacticalAgent\tacticalrmm.exe"
        if (Test-Path $installedAgentPath) {
            $agentConfigArgs = "-m install -api `"$RmmUrl`" -auth `"$AuthKey`" -client-id $ClientId -site-id $SiteId -agent-type `"$AgentType`" -log `"DEBUG`" -logto `"$LogPath`" -nomesh -silent"
            Write-Host "Configuring agent: & `"$installedAgentPath`" $agentConfigArgs" -ForegroundColor Cyan
            Start-Process -FilePath $installedAgentPath -ArgumentList $agentConfigArgs -NoNewWindow -Wait
        } else {
            Write-Host "WARNING: Installed agent executable not found at expected location: $installedAgentPath" -ForegroundColor Yellow
            return $false
        }
        
        Write-Host "Installation completed successfully!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Error during installation: ${_}" -ForegroundColor Red
        return $false
    }
}

############################
# Prompting for missing inputs
############################

function Prompt-IfEmpty {
    param (
        [string]$VarName,
        [string]$PromptMsg,
        [string]$DefaultVal = "",
        [switch]$Silent = $false
    )
    
    # Extract the variable name without the script: prefix if present
    $actualVarName = $VarName -replace "^script:", ""
    
    $currVal = Get-Variable -Name $actualVarName -ValueOnly -ErrorAction SilentlyContinue
    
    # If value is empty or null, use default or prompt for value
    # Don't use boolean comparison for string parameters
    if ([string]::IsNullOrEmpty($currVal) -or $currVal -eq $true -or $currVal -eq "True") {
        if ($Silent) {
            # In silent mode, always use default value without prompting
            if (-not [string]::IsNullOrEmpty($DefaultVal)) {
                Set-Variable -Name $actualVarName -Value $DefaultVal -Scope Script
                Write-Host "Using default value for ${actualVarName}: ${DefaultVal}" -ForegroundColor Yellow
            } else {
                Write-Host "ERROR: ${actualVarName} is required in non-interactive mode" -ForegroundColor Red
                exit 1
            }
        } else {
            # In interactive mode, prompt for value
            $promptDefault = if (-not [string]::IsNullOrEmpty($DefaultVal)) { " (default: $DefaultVal)" } else { "" }
            $promptValue = Read-Host "$PromptMsg$promptDefault"
            
            # If user didn't provide a value, use default
            if ([string]::IsNullOrEmpty($promptValue) -and -not [string]::IsNullOrEmpty($DefaultVal)) {
                $promptValue = $DefaultVal
                Write-Host "Using default value: ${DefaultVal}" -ForegroundColor Yellow
            }
            
            # Update the variable with the new value
            Set-Variable -Name $actualVarName -Value $promptValue -Scope Script
        }
    } else {
        # Value already exists, display it
        Write-Host "Using provided ${actualVarName}: '${currVal}' (type: $(${currVal}.GetType().Name))" -ForegroundColor Green
    }
}
}

############################
# Main Script Flow
############################

# Verify binary exists
$binaryPath = "$PSScriptRoot\rmmagent-windows-arm64.exe"
$alternativePath = "$PSScriptRoot\binaries\tacticalagent-v2.9.0-windows-amd64.exe"

if (-not (Test-Path $binaryPath) -and (Test-Path $alternativePath)) {
    Write-Host "Binary not found at $binaryPath, using alternative path: $alternativePath" -ForegroundColor Yellow
    Copy-Item $alternativePath $binaryPath
    Write-Host "Copied alternative binary to $binaryPath" -ForegroundColor Green
}

if (-not (Test-Path $binaryPath)) {
    Write-Host "AMD64 binary not found. Downloading..." -ForegroundColor Yellow
    
    # Create binaries directory if it doesn't exist
    $binariesDir = Join-Path $PSScriptRoot "binaries"
    if (-not (Test-Path $binariesDir)) {
        New-Item -Path $binariesDir -ItemType Directory -Force | Out-Null
    }
    
    # Download the binary from GitHub releases
    $downloadUrl = "https://github.com/amidaware/tacticalrmm/releases/latest/download/tacticalagent-windows-amd64.exe"
    $downloadPath = Join-Path $binariesDir $AMD64_BINARY
    
    Write-Host "Downloading from: $downloadUrl" -ForegroundColor Cyan
    
    try {
        # Use TLS 1.2 for HTTPS connections
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        
        # Create a WebClient with proper headers to avoid getting HTML content
        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell/5.1")
        $webClient.Headers.Add("Accept", "application/octet-stream")
        
        # Alternative download URLs to try
        $downloadUrls = @(
            "https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe",
            "https://github.com/amidaware/rmmagent/releases/download/v2.8.0/tacticalagent-v2.8.0-windows-amd64.exe",
            "https://github.com/amidaware/rmmagent/releases/download/v2.7.0/tacticalagent-v2.7.0-windows-amd64.exe",
            "https://github.com/amidaware/rmmagent/releases/download/v2.6.2/tacticalagent-v2.6.2-windows-amd64.exe",
            "https://github.com/amidaware/rmmagent/releases/download/v2.6.1/tacticalagent-v2.6.1-windows-amd64.exe"
        )
        
        $downloadSuccess = $false
        foreach ($url in $downloadUrls) {
            try {
                Write-Host "Attempting download from: $url" -ForegroundColor Cyan
                $webClient.DownloadFile($url, $downloadPath)
                
                if (Test-Path $downloadPath) {
                    $fileInfo = Get-Item $downloadPath
                    if ($fileInfo.Length -gt 1000000) { # Check if file is at least 1MB
                        Write-Host "Successfully downloaded AMD64 binary to $downloadPath (Size: $($fileInfo.Length) bytes)" -ForegroundColor Green
                        Copy-Item $downloadPath $binaryPath
                        Write-Host "Copied AMD64 binary to $binaryPath" -ForegroundColor Green
                        $downloadSuccess = $true
                        break
                    } else {
                        Write-Host "Downloaded file is too small, likely not a valid executable. Trying next URL..." -ForegroundColor Yellow
                        Remove-Item $downloadPath -Force
                    }
                }
            } catch {
                Write-Host "Error downloading from ${url}: ${_}" -ForegroundColor Yellow
                # Continue to next URL
            }
        }
        
        if (-not $downloadSuccess) {
            throw "Failed to download a valid binary from any of the available URLs"
        }
    } catch {
        Write-Host "Error downloading AMD64 binary: ${_}" -ForegroundColor Red
        
        # Fallback: Check if we have a local copy in the script directory
        $localCopyPath = Join-Path $PSScriptRoot "tacticalagent-windows-amd64.exe"
        if (Test-Path $localCopyPath) {
            Write-Host "Found local copy of AMD64 binary at $localCopyPath" -ForegroundColor Yellow
            Copy-Item $localCopyPath $binaryPath
            Write-Host "Using local copy of AMD64 binary" -ForegroundColor Green
        } else {
            Write-Host "No local copy found. Please download the Tactical RMM agent binary manually and place it in the script directory." -ForegroundColor Red
            exit 1
        }
    }
}

############################
# Agent Executable Verification Function
############################

function Test-AgentExecutable {
    param (
        [string]$Path
    )
    
    if (-not (Test-Path $Path)) {
        Write-Host "ERROR: Agent executable not found at $Path" -ForegroundColor Red
        return $false
    }
    
    try {
        $fileInfo = Get-Item $Path
        if ($fileInfo.Length -eq 0) {
            Write-Host "ERROR: Agent executable file is empty" -ForegroundColor Red
            return $false
        }
        
        # Check if file is locked or in use
        try {
            $fileStream = [System.IO.File]::Open($Path, 'Open', 'Read', 'None')
            $fileStream.Close()
            $fileStream.Dispose()
        } catch {
            Write-Host "WARNING: Agent executable file is locked or in use: ${_}" -ForegroundColor Yellow
            # Don't return false here as the file might be locked by a valid process
        }
        
        Write-Host "Agent executable verified at $Path" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "ERROR: Failed to verify agent executable: ${_}" -ForegroundColor Red
        return $false
    }
}

# Verify the binary exists and is valid
if (-not (Test-Path $binaryPath)) {
    Write-Host "ERROR: Binary not found at $binaryPath after download attempt" -ForegroundColor Red
    exit 1
}

# Use the Test-AgentExecutable function to verify the binary
if (-not (Test-AgentExecutable -Path $binaryPath)) {
    Write-Host "ERROR: Binary verification failed" -ForegroundColor Red
    exit 1
}

# Prompt for missing values if not provided
Prompt-IfEmpty -VarName "script:OrgName" -PromptMsg "Enter organization name" -DefaultVal "OpenFrame"
Prompt-IfEmpty -VarName "script:ContactEmail" -PromptMsg "Enter contact email" -DefaultVal "admin@openframe.io"
Prompt-IfEmpty -VarName "script:RmmServerUrl" -PromptMsg "Enter RMM server URL" -DefaultVal "http://localhost:8000"
Prompt-IfEmpty -VarName "script:AgentAuthKey" -PromptMsg "Enter agent auth key" -DefaultVal ""
Prompt-IfEmpty -VarName "script:ClientId" -PromptMsg "Enter client ID" -DefaultVal "1"
Prompt-IfEmpty -VarName "script:SiteId" -PromptMsg "Enter site ID" -DefaultVal "1"
Prompt-IfEmpty -VarName "script:AgentType" -PromptMsg "Enter agent type" -DefaultVal "workstation"
Prompt-IfEmpty -VarName "script:AgentLogPath" -PromptMsg "Enter log path" -DefaultVal "C:\logs\tactical.log"

# Display parameters for installation
Write-Host "Using parameters for installation:" -ForegroundColor Cyan
Write-Host "  - Client ID: ${script:ClientId} (type: $(${script:ClientId}.GetType().Name))" -ForegroundColor White
Write-Host "  - Site ID: ${script:SiteId} (type: $(${script:SiteId}.GetType().Name))" -ForegroundColor White
Write-Host "  - Agent Type: '${script:AgentType}' (type: $(${script:AgentType}.GetType().Name))" -ForegroundColor White
Write-Host "  - RMM URL: '${script:RmmServerUrl}'" -ForegroundColor White
Write-Host "  - Log Path: '${script:AgentLogPath}'" -ForegroundColor White

# Follow exact 3-step flow as requested by user
Write-Host "=== STEP 1: Checking if Tactical RMM is already installed ===" -ForegroundColor Cyan
$tacticalInstalled = Check-TacticalInstalled

# 2. If yes, uninstall
if ($tacticalInstalled) {
    Write-Host "=== STEP 2: Tactical RMM is already installed. Uninstalling... ===" -ForegroundColor Yellow
    Uninstall-TacticalRMM
} else {
    Write-Host "=== STEP 2: Tactical RMM is not installed. Skipping uninstallation. ===" -ForegroundColor Green
}

# 3. Install from binary
Write-Host "=== STEP 3: Installing from binary ===" -ForegroundColor Cyan
# Apply WebSocket protocol modifications for non-HTTPS URLs
if (-not [string]::IsNullOrEmpty($script:RmmServerUrl) -and $script:RmmServerUrl -match "^http://") {
    Write-Host "Setting WebSocket protocol for non-HTTPS URL..." -ForegroundColor Yellow
    Set-WebSocketProtocolEnvironment -RmmUrl $script:RmmServerUrl
    Set-WebSocketRegistrySettings -RmmUrl $script:RmmServerUrl
}

# Ensure log directory exists
if (-not [string]::IsNullOrEmpty($script:AgentLogPath)) {
    $logDir = Split-Path -Parent $script:AgentLogPath
    if (-not (Test-Path $logDir)) {
        Write-Host "Creating log directory: $logDir" -ForegroundColor Yellow
        New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    }
}

# Install the agent
Write-Host "Running binary installation: & `"$binaryPath`" /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Cyan
Start-Process -FilePath $binaryPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow

# Configure the agent with parameters
$programFilesPath = "${env:ProgramFiles}"
$installedAgentPath = "$programFilesPath\TacticalAgent\tacticalrmm.exe"
if (Test-Path $installedAgentPath) {
    # Build agent configuration arguments with proper validation
    $agentConfigArgs = "-m install"
    if (-not [string]::IsNullOrEmpty($script:RmmServerUrl)) {
        $agentConfigArgs += " -api `"$script:RmmServerUrl`""
    }
    if (-not [string]::IsNullOrEmpty($script:AgentAuthKey)) {
        $agentConfigArgs += " -auth `"$script:AgentAuthKey`""
    }
    $agentConfigArgs += " -client-id $script:ClientId -site-id $script:SiteId -agent-type `"$script:AgentType`" -log `"DEBUG`""
    if (-not [string]::IsNullOrEmpty($script:AgentLogPath)) {
        $agentConfigArgs += " -logto `"$script:AgentLogPath`""
    }
    $agentConfigArgs += " -nomesh -silent"
    
    Write-Host "Configuring agent: & `"$installedAgentPath`" $agentConfigArgs" -ForegroundColor Cyan
    Start-Process -FilePath $installedAgentPath -ArgumentList $agentConfigArgs -NoNewWindow -Wait
    Write-Host "Installation completed successfully!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Installed agent executable not found at expected location: $installedAgentPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== All Done! ===" -ForegroundColor Green
Write-Host "Your agent is at: $binaryPath" -ForegroundColor Cyan
Write-Host "NOTE: This is an AMD64 binary running with Windows on ARM64 emulation" -ForegroundColor Yellow
