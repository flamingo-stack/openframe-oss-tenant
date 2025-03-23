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

[CmdletBinding(
    SupportsShouldProcess = $true,
    DefaultParameterSetName = 'Interactive'
)]
param (
    [Parameter(
        ParameterSetName = 'Interactive',
        Position = 0,
        HelpMessage = 'Hostname or IP of the RMM server'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        Mandatory = $true,
        HelpMessage = 'Hostname or IP of the RMM server'
    )]
    [ValidateNotNullOrEmpty()]
    [string]$RmmHost,

    [Parameter(
        ParameterSetName = 'Interactive',
        Position = 1,
        HelpMessage = 'Port number for the RMM server'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        Mandatory = $true,
        HelpMessage = 'Port number for the RMM server'
    )]
    [ValidateRange(1, 65535)]
    [int]$RmmPort = 8000,

    [Parameter(
        ParameterSetName = 'Interactive',
        HelpMessage = 'Use HTTPS/WSS for secure connection'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        HelpMessage = 'Use HTTPS/WSS for secure connection'
    )]
    [switch]$Secure,

    [Parameter(
        ParameterSetName = 'Interactive',
        HelpMessage = 'Authentication key for the RMM server'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        Mandatory = $true,
        HelpMessage = 'Authentication key for the RMM server'
    )]
    [ValidateNotNullOrEmpty()]
    [string]$AuthKey,

    [Parameter(
        ParameterSetName = 'Interactive',
        HelpMessage = 'Client ID for the agent'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        Mandatory = $true,
        HelpMessage = 'Client ID for the agent'
    )]
    [ValidateRange(1, [int]::MaxValue)]
    [int]$ClientId,

    [Parameter(
        ParameterSetName = 'Interactive',
        HelpMessage = 'Site ID for the agent'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        Mandatory = $true,
        HelpMessage = 'Site ID for the agent'
    )]
    [ValidateRange(1, [int]::MaxValue)]
    [int]$SiteId,

    [Parameter(
        ParameterSetName = 'Interactive',
        HelpMessage = 'Type of agent (workstation/server)'
    )]
    [Parameter(
        ParameterSetName = 'NonInteractive',
        Mandatory = $true,
        HelpMessage = 'Type of agent (workstation/server)'
    )]
    [ValidateNotNullOrEmpty()]
    [string]$AgentType,

    [Parameter(
        ParameterSetName = 'Help',
        HelpMessage = 'Display help message'
    )]
    [switch]$Help
)

# Ensure script is running with administrator privileges
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script requires administrator privileges. Please restart as administrator." -ForegroundColor Red
    exit 1
}

############################
# Functions
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
    if ([string]::IsNullOrEmpty($currVal)) {
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

function Uninstall-TacticalRMM {
    Write-Host "=== STEP 2: Uninstalling existing Tactical RMM agent ===" -ForegroundColor Cyan
    
    # Try to stop the service first
    try {
        $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "Stopping Tactical RMM service..." -ForegroundColor Yellow
            Stop-Service -Name "tacticalrmm" -Force -ErrorAction SilentlyContinue
            Write-Host "Service stopped." -ForegroundColor Green
            # Wait for service to fully stop
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "Warning: Could not stop service: ${_}" -ForegroundColor Yellow
    }
    
    # Check for uninstaller and agent executable in Program Files
    $programFilesPath = "${env:ProgramFiles}"
    $programFilesX86Path = "${env:ProgramFiles(x86)}"
    
    $uninstallerPath = "$programFilesPath\TacticalAgent\unins000.exe"
    $uninstallerX86Path = "$programFilesX86Path\TacticalAgent\unins000.exe"
    $agentPath = "$programFilesPath\TacticalAgent\tacticalrmm.exe"
    $agentX86Path = "$programFilesX86Path\TacticalAgent\tacticalrmm.exe"
    
    # First try to run the agent's uninstall command if available
    if (Test-Path $agentPath) {
        Write-Host "Running agent uninstall command: & `"$agentPath`" -m uninstall -silent" -ForegroundColor Yellow
        Start-Process -FilePath $agentPath -ArgumentList "-m uninstall -silent" -Wait -NoNewWindow
        Write-Host "Agent uninstall command completed." -ForegroundColor Green
        Start-Sleep -Seconds 5
    } elseif (Test-Path $agentX86Path) {
        Write-Host "Running agent uninstall command: & `"$agentX86Path`" -m uninstall -silent" -ForegroundColor Yellow
        Start-Process -FilePath $agentX86Path -ArgumentList "-m uninstall -silent" -Wait -NoNewWindow
        Write-Host "Agent uninstall command completed." -ForegroundColor Green
        Start-Sleep -Seconds 5
    }
    
    # Then run the uninstaller if available
    if (Test-Path $uninstallerPath) {
        Write-Host "Running uninstaller: $uninstallerPath /VERYSILENT" -ForegroundColor Yellow
        Start-Process -FilePath $uninstallerPath -ArgumentList "/VERYSILENT" -Wait -NoNewWindow
        Write-Host "Uninstaller completed." -ForegroundColor Green
        Start-Sleep -Seconds 5
    } elseif (Test-Path $uninstallerX86Path) {
        Write-Host "Running uninstaller: $uninstallerX86Path /VERYSILENT" -ForegroundColor Yellow
        Start-Process -FilePath $uninstallerX86Path -ArgumentList "/VERYSILENT" -Wait -NoNewWindow
        Write-Host "Uninstaller completed." -ForegroundColor Green
        Start-Sleep -Seconds 5
    }
    
    # Finally, attempt manual cleanup
    Write-Host "Performing final cleanup..." -ForegroundColor Yellow
    
    # Try to remove service
    try {
        $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "Removing Tactical RMM service..." -ForegroundColor Yellow
            & sc.exe delete "tacticalrmm"
            Write-Host "Service removed." -ForegroundColor Green
            Start-Sleep -Seconds 2
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

    # Verify uninstallation
    Write-Host "Verifying uninstallation..." -ForegroundColor Yellow
    $maxAttempts = 3
    $attempt = 1
    $uninstallComplete = $false

    while (-not $uninstallComplete -and $attempt -le $maxAttempts) {
        $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
        $programFilesExists = Test-Path "$programFilesPath\TacticalAgent"
        $programFilesX86Exists = Test-Path "$programFilesX86Path\TacticalAgent"

        if (-not $service -and -not $programFilesExists -and -not $programFilesX86Exists) {
            $uninstallComplete = $true
            Write-Host "Uninstallation verified successfully." -ForegroundColor Green
        } else {
            Write-Host "Uninstallation verification attempt $attempt of $maxAttempts..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
            $attempt++
        }
    }

    if (-not $uninstallComplete) {
        Write-Host "Warning: Could not verify complete uninstallation. Some components may still be present." -ForegroundColor Yellow
    }
}

function Show-Help {
    [CmdletBinding()]
    param()
    
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "Windows ARM64 Tactical RMM Agent Installer" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script installs the Tactical RMM agent on Windows ARM64 systems."
    Write-Host "It uses the AMD64 binary with Windows on ARM64 emulation."
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\windows_arm64.ps1 -Help"
    Write-Host "  .\windows_arm64.ps1 [parameters]"
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -RmmHost        Hostname or IP of the RMM server"
    Write-Host "  -RmmPort        Port number for the RMM server (default: 8000)"
    Write-Host "  -Secure         Use HTTPS/WSS for secure connection"
    Write-Host "  -AuthKey        Authentication key for the RMM server"
    Write-Host "  -ClientId       Client ID"
    Write-Host "  -SiteId         Site ID"
    Write-Host "  -AgentType      Agent type (workstation/server)"
    Write-Host "  -Help           Display this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  # Show help:"
    Write-Host "  .\windows_arm64.ps1 -Help"
    Write-Host ""
    Write-Host "  # Non-interactive mode with all parameters:"
    Write-Host "  .\windows_arm64.ps1 -RmmHost 'rmm.example.com' -RmmPort 8000 -AuthKey 'your-auth-key' -ClientId 1 -SiteId 1 -AgentType 'server'"
    Write-Host ""
    Write-Host "Note: This script requires administrator privileges." -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Cyan
    exit 0
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
$script:ClientId = $ClientId
$script:SiteId = $SiteId
[string]$script:AgentType = if ([string]::IsNullOrEmpty($AgentType) -or $AgentType -eq $true -or $AgentType -eq "True") { "" } else { "$AgentType" }

# Show help if requested
if ($Help) {
    Show-Help
}

# Main script flow
try {
    # Check for required parameters in non-interactive mode
    if ($PSCmdlet.ParameterSetName -eq 'NonInteractive') {
        $missingParams = @()
        if ([string]::IsNullOrEmpty($RmmHost)) { $missingParams += "RmmHost" }
        if ([string]::IsNullOrEmpty($AuthKey)) { $missingParams += "AuthKey" }
        if ([string]::IsNullOrEmpty($ClientId)) { $missingParams += "ClientId" }
        if ([string]::IsNullOrEmpty($SiteId)) { $missingParams += "SiteId" }
        if ([string]::IsNullOrEmpty($AgentType)) { $missingParams += "AgentType" }

        if ($missingParams.Count -gt 0) {
            Write-Error "Missing required parameters: $($missingParams -join ', ')"
            Write-Host "Use -Help to display usage information." -ForegroundColor Yellow
            exit 1
        }
    }

    # Only prompt for values if we're in interactive mode and values are missing
    if ($PSCmdlet.ParameterSetName -eq 'Interactive') {
        Prompt-IfEmpty -VarName "script:RmmHost" -PromptMsg "Enter RMM server hostname or IP" -DefaultVal "localhost"
        Prompt-IfEmpty -VarName "script:RmmPort" -PromptMsg "Enter RMM server port" -DefaultVal "8000"
        Prompt-IfEmpty -VarName "script:AgentAuthKey" -PromptMsg "Enter agent auth key" -DefaultVal ""
        Prompt-IfEmpty -VarName "script:ClientId" -PromptMsg "Enter client ID"
        Prompt-IfEmpty -VarName "script:SiteId" -PromptMsg "Enter site ID"
        Prompt-IfEmpty -VarName "script:AgentType" -PromptMsg "Enter agent type"
    }

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

    # STEP 1: Check for and uninstall any existing installation
    Write-Host "=== STEP 1: Checking for and removing any existing installation ===" -ForegroundColor Cyan
    $tacticalInstalled = Check-TacticalInstalled

    if ($tacticalInstalled) {
        Write-Host "Found existing installation. Proceeding with uninstallation..." -ForegroundColor Yellow
        Uninstall-TacticalRMM
        # Add extra verification and wait after uninstallation
        Start-Sleep -Seconds 5
        $tacticalInstalled = Check-TacticalInstalled
        if ($tacticalInstalled) {
            Write-Error "Failed to completely remove existing installation. Please try again."
            exit 1
        }
    } else {
        Write-Host "No existing installation found. Proceeding with fresh installation..." -ForegroundColor Green
    }

    # STEP 2: Download and prepare new binary
    Write-Host "=== STEP 2: Downloading and preparing new binary ===" -ForegroundColor Cyan
    
    # Create binaries directory if it doesn't exist
    $binariesDir = Join-Path $PSScriptRoot "binaries"
    if (-not (Test-Path $binariesDir)) {
        New-Item -ItemType Directory -Path $binariesDir -Force | Out-Null
    }

    # Define available versions and their URLs
    $agentVersions = @{
        "2.9.0" = "https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe"
        "2.8.0" = "https://github.com/amidaware/rmmagent/releases/download/v2.8.0/tacticalagent-v2.8.0-windows-amd64.exe"
        "2.7.0" = "https://github.com/amidaware/rmmagent/releases/download/v2.7.0/tacticalagent-v2.7.0-windows-amd64.exe"
        "2.6.2" = "https://github.com/amidaware/rmmagent/releases/download/v2.6.2/tacticalagent-v2.6.2-windows-amd64.exe"
        "2.6.1" = "https://github.com/amidaware/rmmagent/releases/download/v2.6.1/tacticalagent-v2.6.1-windows-amd64.exe"
    }

    # Try to download the latest version first
    $latestVersion = $agentVersions.Keys | Sort-Object -Descending | Select-Object -First 1
    $latestUrl = $agentVersions[$latestVersion]
    $binaryPath = Download-AgentBinary -Version $latestVersion -Url $latestUrl

    # If latest version fails, try previous versions
    if (-not $binaryPath) {
        foreach ($version in ($agentVersions.Keys | Sort-Object -Descending | Select-Object -Skip 1)) {
            $url = $agentVersions[$version]
            $binaryPath = Download-AgentBinary -Version $version -Url $url
            if ($binaryPath) { break }
        }
    }

    # If all downloads fail, exit
    if (-not $binaryPath) {
        Write-Error "Failed to download any version of the Tactical RMM agent."
        Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
        exit 1
    }

    # Update the binary path variable for use in the rest of the script
    $script:binaryPath = $binaryPath

    # STEP 3: Install and configure new agent
    Write-Host "=== STEP 3: Installing and configuring new agent ===" -ForegroundColor Cyan
    
    # Apply WebSocket protocol modifications based on secure flag
    $connectionType = if ($script:Secure) { "secure" } else { "non-secure" }
    Write-Host "Setting WebSocket protocol for ${connectionType} connection..." -ForegroundColor Yellow
    Set-WebSocketProtocolEnvironment -Secure $script:Secure
    Set-WebSocketRegistrySettings -Secure $script:Secure

    # Install the agent
    Write-Host "Running binary installation: & `"$script:binaryPath`" /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Cyan
    Start-Process -FilePath $script:binaryPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
    Start-Sleep -Seconds 5  # Wait for installation to complete

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
        Start-Sleep -Seconds 5  # Wait for configuration to complete
        Write-Host "Installation completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Installed agent executable not found at expected location: $installedAgentPath" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "=== All Done! ===" -ForegroundColor Green
    Write-Host "Your agent is at: $script:binaryPath" -ForegroundColor Cyan
    Write-Host "NOTE: This is an AMD64 binary running with Windows on ARM64 emulation" -ForegroundColor Yellow

} catch {
    Write-Error "An error occurred: $_"
    Write-Host "Use -Help to display usage information." -ForegroundColor Yellow
    exit 1
}
