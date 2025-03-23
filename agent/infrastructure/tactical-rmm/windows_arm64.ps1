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
#      .\windows_arm64.ps1 -RmmHost "rmm.example.com" -RmmPort 8000 -Secure -AuthKey "your-key" -ClientId "1" -SiteId "1" -AgentType "server"
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
    [string]$RmmHost,
    [int]$RmmPort,
    [switch]$Secure = $false,
    [string]$AuthKey,
    [string]$ClientId,
    [string]$SiteId,
    [string]$AgentType,
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

$OUTPUT_BINARY = "rmmagent-windows-arm64.exe"
$AMD64_BINARY = "tacticalagent-v2.9.0-windows-amd64.exe"
$AMD64_BINARY_PATH = Join-Path (Split-Path -Parent $PSCommandPath) "binaries\$AMD64_BINARY"

# We'll store user-provided or prompted values in these variables:
$script:RmmHost = if ([string]::IsNullOrEmpty($RmmHost) -or $RmmHost -eq $true -or $RmmHost -eq "True") { "" } else { $RmmHost }
$script:RmmPort = if ($RmmPort -eq 0) { 8000 } else { $RmmPort }
$script:Secure = $Secure
$script:AgentAuthKey = if ([string]::IsNullOrEmpty($AuthKey) -or $AuthKey -eq $true -or $AuthKey -eq "True") { "" } else { $AuthKey }

# Initialize parameters with defaults if not provided
# Parse ClientId and SiteId as integers since that's what the agent expects
# Use proper integer parsing with TryParse for ClientId
$tempClientId = 0
if (-not ([string]::IsNullOrEmpty($ClientId) -or $ClientId -eq $true -or $ClientId -eq "True")) {
    $tempValue = 0
    if ([int]::TryParse($ClientId, [ref]$tempValue)) {
        $tempClientId = $tempValue
    }
}
[int]$script:ClientId = $tempClientId

# Use proper integer parsing with TryParse for SiteId
$tempSiteId = 0
if (-not ([string]::IsNullOrEmpty($SiteId) -or $SiteId -eq $true -or $SiteId -eq "True")) {
    $tempValue = 0
    if ([int]::TryParse($SiteId, [ref]$tempValue)) {
        $tempSiteId = $tempValue
    }
}
[int]$script:SiteId = $tempSiteId
[string]$script:AgentType = if ([string]::IsNullOrEmpty($AgentType) -or $AgentType -eq $true -or $AgentType -eq "True") { "" } else { "$AgentType" }

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
    Write-Host "  -RmmHost        Hostname or IP of the RMM server"
    Write-Host "  -RmmPort        Port number for the RMM server"
    Write-Host "  -Secure         Use HTTPS/WSS for secure connection (default: false)"
    Write-Host "  -AuthKey        Authentication key for the RMM server"
    Write-Host "  -ClientId       Client ID (required)"
    Write-Host "  -SiteId         Site ID (required)"
    Write-Host "  -AgentType      Agent type (required)"
    Write-Host "  -Help           Display this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  # Interactive mode (will prompt for missing values):"
    Write-Host "  .\windows_arm64.ps1"
    Write-Host ""
    Write-Host "  # Non-interactive mode with all parameters:"
    Write-Host "  .\windows_arm64.ps1 -RmmHost 'rmm.example.com' -RmmPort 8000 -Secure -AuthKey 'your-auth-key' -ClientId 1 -SiteId 1 -AgentType 'server'"
    Write-Host ""
    Write-Host "Note: This script requires administrator privileges." -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Cyan
    exit 0
}

# Show help if requested or if no parameters provided
if ($Help -or $args.Count -eq 0) {
    Show-Help
    exit 0
}

# Check for required parameters
if ([string]::IsNullOrEmpty($ClientId) -or [string]::IsNullOrEmpty($SiteId) -or [string]::IsNullOrEmpty($AgentType)) {
    Write-Host "Error: ClientId, SiteId, and AgentType are required parameters." -ForegroundColor Red
    Write-Host "Use -Help to display usage information." -ForegroundColor Yellow
    exit 1
}

############################
# WebSocket Protocol Functions
############################

function Set-WebSocketProtocolEnvironment {
    param (
        [bool]$Secure
    )
    
    $protocol = if ($Secure) { "wss" } else { "ws" }
    Write-Host "Setting environment variables to use WebSocket protocol ${protocol}://..." -ForegroundColor Yellow
    
    # Set environment variables to override WebSocket protocol
    [Environment]::SetEnvironmentVariable("NATS_WS_SCHEME", $protocol, [System.EnvironmentVariableTarget]::Process)
    [Environment]::SetEnvironmentVariable("NATS_WS_SCHEME", $protocol, [System.EnvironmentVariableTarget]::User)
    [Environment]::SetEnvironmentVariable("NATS_WS_SCHEME", $protocol, [System.EnvironmentVariableTarget]::Machine)
    
    Write-Host "WebSocket protocol environment variables set successfully" -ForegroundColor Green
    return $true
}

function Set-WebSocketRegistrySettings {
    param (
        [bool]$Secure
    )
    
    $protocol = if ($Secure) { "wss" } else { "ws" }
    Write-Host "Setting WebSocket protocol registry settings..." -ForegroundColor Yellow
    
    # Create registry keys to override WebSocket protocol
    try {
        # Create HKLM:\SOFTWARE\TacticalRMM if it doesn't exist
        if (-not (Test-Path "HKLM:\SOFTWARE\TacticalRMM")) {
            New-Item -Path "HKLM:\SOFTWARE\TacticalRMM" -Force | Out-Null
        }
        
        # Set registry values
        New-ItemProperty -Path "HKLM:\SOFTWARE\TacticalRMM" -Name "NatsWsScheme" -Value $protocol -PropertyType String -Force | Out-Null
        
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

############################
# Main Script Flow
############################

# Verify binary exists
$binaryPath = "$PSScriptRoot\rmmagent-windows-arm64.exe"
if (-not (Test-Path $binaryPath)) {
    Write-Host "ERROR: Binary not found at $binaryPath" -ForegroundColor Red
    Write-Host "Please ensure the binary exists in the script directory." -ForegroundColor Yellow
    exit 1
}

# Prompt for missing values if not provided
Prompt-IfEmpty -VarName "script:RmmHost" -PromptMsg "Enter RMM server hostname or IP" -DefaultVal "localhost"
Prompt-IfEmpty -VarName "script:RmmPort" -PromptMsg "Enter RMM server port" -DefaultVal "8000"
if (-not $script:Secure) {
    $securePrompt = Read-Host "Use secure connection (HTTPS/WSS)? (Y/N)"
    $script:Secure = $securePrompt -eq "Y" -or $securePrompt -eq "y"
}
Prompt-IfEmpty -VarName "script:AgentAuthKey" -PromptMsg "Enter agent auth key" -DefaultVal ""
Prompt-IfEmpty -VarName "script:ClientId" -PromptMsg "Enter client ID"
Prompt-IfEmpty -VarName "script:SiteId" -PromptMsg "Enter site ID"
Prompt-IfEmpty -VarName "script:AgentType" -PromptMsg "Enter agent type"

# Construct the full RMM URL based on parameters
$protocol = if ($script:Secure) { "https" } else { "http" }
$script:RmmServerUrl = "${protocol}://${script:RmmHost}:${script:RmmPort}"

# Display parameters for installation
Write-Host "Using parameters for installation:" -ForegroundColor Cyan
Write-Host "  - Client ID: ${script:ClientId}" -ForegroundColor White
Write-Host "  - Site ID: ${script:SiteId}" -ForegroundColor White
Write-Host "  - Agent Type: '${script:AgentType}'" -ForegroundColor White
Write-Host "  - RMM Host: '${script:RmmHost}'" -ForegroundColor White
Write-Host "  - RMM Port: ${script:RmmPort}" -ForegroundColor White
Write-Host "  - Secure Connection: $($script:Secure)" -ForegroundColor White
Write-Host "  - Full RMM URL: '${script:RmmServerUrl}'" -ForegroundColor White

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
# Apply WebSocket protocol modifications based on secure flag
$connectionType = if ($script:Secure) { "secure" } else { "non-secure" }
Write-Host "Setting WebSocket protocol for ${connectionType} connection..." -ForegroundColor Yellow
Set-WebSocketProtocolEnvironment -Secure $script:Secure
Set-WebSocketRegistrySettings -Secure $script:Secure

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
    $agentConfigArgs += " -client-id $script:ClientId -site-id $script:SiteId -agent-type `"$script:AgentType`" -nomesh -silent"
    
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
