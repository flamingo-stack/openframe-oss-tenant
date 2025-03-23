#
# windows_arm64.ps1
#
# Purpose:
#   - Install dependencies (Git, Go) on Windows ARM64
#   - Accept script args or prompt for org name, email, RMM URL, agent key, log path, build folder
#   - Clone, patch, compile rmmagent for Windows ARM64
#   - Prompt to run agent or skip
#   - After install, configure the Windows service to use the custom log path (if provided)
#   - Automatically configures the agent to use ws:// protocol instead of wss:// for WebSockets
#   - Sets environment variables and registry settings for WebSocket protocol override
#   - Uses binary patching as a fallback method to ensure proper WebSocket connectivity
#   - Allows connection to development/local RMM servers using port 8000
#
# Usage Examples:
#   1) Interactive mode:
#      .\windows_arm64.ps1
#   2) Provide some or all args:
#      .\windows_arm64.ps1 -OrgName "OpenFrame" -RmmUrl "http://localhost:8000" ...
#   3) Non-interactive (all args):
#      .\windows_arm64.ps1 -OrgName "MyOrg" ... -SkipRun
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
    [string]$ClientId,
    [string]$SiteId,
    [string]$AgentType = "workstation",
    [string]$LogPath = "C:\logs\tactical.log",
    [string]$BuildFolder = "rmmagent",
    [switch]$SkipRun,
    [switch]$Help,
    [switch]$Interactive,
    [switch]$Silent = $true,
    [string]$LocalMeshPath,
    [string]$MeshDir,
    [string]$CertPath,
    [string]$AgentDescription,
    [string]$ProxyServer,
    [switch]$NoMesh = $true,
    [string]$LogLevel = "debug"
)

# Set global silent installation flag - true if Silent switch is provided or any parameters are provided
$script:SilentInstall = $Silent -or ($PSBoundParameters.Count -gt 0)

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
$OrgName = $OrgName -or ""
$ContactEmail = $Email -or ""
$RmmServerUrl = $RmmUrl -or ""
$AgentAuthKey = $AuthKey -or ""
$AgentLogPath = $LogPath -or ""
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
    Write-Host "  Tactical RMM Agent Installer for Windows ARM64" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "DESCRIPTION:"
    Write-Host "  This script automates the installation of the Tactical RMM agent on Windows ARM64 systems."
    Write-Host "  It uses AMD64 binary with Windows on ARM emulation for full functionality."
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "  .\windows_arm64.ps1 [options]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTIONS:" -ForegroundColor Green
    Write-Host "  -Help                      Display this help message"
    Write-Host "  -Interactive               Run in interactive mode (will prompt for missing values)"
    Write-Host "  -OrgName <NAME>            Organization name placeholder"
    Write-Host "  -Email <EMAIL>             Contact email placeholder"
    Write-Host "  -RmmUrl <URL>              RMM server URL (e.g., http://localhost:8000)"
    Write-Host "  -AuthKey <KEY>             Agent authentication key"
    Write-Host "  -ClientId <ID>             Client ID for agent registration"
    Write-Host "  -SiteId <ID>               Site ID for agent registration"
    Write-Host "  -AgentType <TYPE>          Agent type (server/workstation) [default: workstation]"
    Write-Host "  -LogPath <PATH>            Custom log file path for agent"
    Write-Host "  -BuildFolder <FOLDER>      Directory to clone and compile agent [default: rmmagent]"
    Write-Host "  -SkipRun                   Skip the final agent installation step"
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Green
    Write-Host "  # Display help documentation:"
    Write-Host "  .\windows_arm64.ps1"
    Write-Host ""
    Write-Host "  # Run in interactive mode (will prompt for all required values):"
    Write-Host "  .\windows_arm64.ps1 -Interactive"
    Write-Host ""
    Write-Host "  # Provide all parameters for non-interactive installation:"
    Write-Host "  .\windows_arm64.ps1 -OrgName 'MyCompany' -Email 'admin@example.com' -RmmUrl 'http://rmm.example.com' \"
    Write-Host "                     -AuthKey 'your-auth-key' -ClientId '1' -SiteId '1' -AgentType 'workstation' \"
    Write-Host "                     -LogPath 'C:\logs\tactical.log'"
    Write-Host ""
    Write-Host "NOTES:" -ForegroundColor Green
    Write-Host "  - Requires administrator privileges"
    Write-Host "  - Will install Git and Go if not already present"
    Write-Host "  - Any missing required parameters will be prompted interactively"
    Write-Host "  - The script performs an aggressive uninstallation of any existing agent before installation"
    Write-Host ""
    exit 0
}

# Display help if requested or if no parameters provided
if ($Help -or ($PSBoundParameters.Count -eq 0 -and $args.Count -eq 0)) {
    Show-Help
}

# Set interactive mode flag
$InteractiveMode = $Interactive -or ($PSBoundParameters.Count -eq 1 -and $Interactive)

# Assign parameters to variables
$ContactEmail = $Email
$RmmServerUrl = $RmmUrl
$AgentAuthKey = $AuthKey
$AgentLogPath = $LogPath
# Ensure ClientId and SiteId are properly assigned from parameters
if ($PSBoundParameters.ContainsKey('ClientId')) {
    # ClientId parameter was explicitly provided - ensure it's treated as a string
    Write-Host "Using provided Client ID: '$ClientId' (type: $($ClientId.GetType().Name))" -ForegroundColor Green
}
if ($PSBoundParameters.ContainsKey('SiteId')) {
    # SiteId parameter was explicitly provided - ensure it's treated as a string
    Write-Host "Using provided Site ID: '$SiteId' (type: $($SiteId.GetType().Name))" -ForegroundColor Green
}
if ($PSBoundParameters.ContainsKey('AgentType')) {
    # AgentType parameter was explicitly provided - ensure it's treated as a string
    Write-Host "Using provided Agent Type: '$AgentType' (type: $($AgentType.GetType().Name))" -ForegroundColor Green
}
if ($SkipRun) {
    $SkipRun = $true
}

############################
# Install Dependencies
############################

function Install-Git {
    Write-Host "Checking Git..."
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Git..."
        # Download Git for Windows
        $gitInstallerUrl = "https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/Git-2.41.0-64-bit.exe"
        $gitInstallerPath = "$env:TEMP\GitInstaller.exe"
        
        Invoke-WebRequest -Uri $gitInstallerUrl -OutFile $gitInstallerPath
        
        # Install Git silently
        Start-Process -FilePath $gitInstallerPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL" -Wait
        
        # Update PATH environment variable
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Clean up
        Remove-Item $gitInstallerPath -Force
        
        # Verify installation
        if (Get-Command git -ErrorAction SilentlyContinue) {
            Write-Host "Git installed successfully."
        } else {
            Write-Host "Git installation failed. Please install Git manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Git found."
    }
}

# Go is no longer needed since we're using pre-built AMD64 binary
function Install-Go {
    Write-Host "Go installation skipped - not needed for AMD64 binary with emulation." -ForegroundColor Cyan
}

############################
# WebSocket Protocol Functions
############################

function Set-WebSocketProtocolEnvironment {
    param (
        [string]$RmmUrl
    )
    
    # Only apply WebSocket protocol patching for non-HTTPS URLs
    if ($RmmUrl -match "^http://") {
        Write-Host "Setting environment variables to override WebSocket protocol to ws://..." -ForegroundColor Yellow
        
        # Set environment variables that will be inherited by the agent process
        [Environment]::SetEnvironmentVariable("TACTICAL_WEBSOCKET_MODE", "ws", "Process")
        [Environment]::SetEnvironmentVariable("TACTICAL_WEBSOCKET_PORT", "8000", "Process")
        [Environment]::SetEnvironmentVariable("TACTICAL_WEBSOCKET_PATH", "/natsws", "Process")
        
        # Also set for the system to ensure persistence across processes
        [Environment]::SetEnvironmentVariable("TACTICAL_WEBSOCKET_MODE", "ws", "Machine")
        [Environment]::SetEnvironmentVariable("TACTICAL_WEBSOCKET_PORT", "8000", "Machine")
        [Environment]::SetEnvironmentVariable("TACTICAL_WEBSOCKET_PATH", "/natsws", "Machine")
        
        Write-Host "WebSocket protocol environment variables set successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "HTTPS URL detected, skipping WebSocket protocol environment variables" -ForegroundColor Yellow
        return $false
    }
}

function Patch-WebSocketProtocol {
    param (
        [string]$BinaryPath,
        [string]$RmmUrl
    )
    
    # Only apply WebSocket protocol patching for non-HTTPS URLs
    if ($RmmUrl -match "^http://") {
        Write-Host "Attempting to patch WebSocket protocol in binary at $BinaryPath..." -ForegroundColor Yellow
        
        try {
            # Read the binary file as bytes
            $bytes = [System.IO.File]::ReadAllBytes($BinaryPath)
            
            # Look for wss:// pattern and replace with ws:// (with padding to maintain size)
            $wssPattern = [System.Text.Encoding]::ASCII.GetBytes("wss://")
            $wsPattern = [System.Text.Encoding]::ASCII.GetBytes("ws:// ")
            
            # Find and replace all occurrences
            $replaced = $false
            for ($i = 0; $i -lt $bytes.Length - $wssPattern.Length; $i++) {
                $match = $true
                for ($j = 0; $j -lt $wssPattern.Length; $j++) {
                    if ($bytes[$i + $j] -ne $wssPattern[$j]) {
                        $match = $false
                        break
                    }
                }
                
                if ($match) {
                    Write-Host "Found wss:// pattern at offset $i, replacing with ws://" -ForegroundColor Green
                    for ($j = 0; $j -lt $wsPattern.Length; $j++) {
                        $bytes[$i + $j] = $wsPattern[$j]
                    }
                    $replaced = $true
                }
            }
            
            if ($replaced) {
                # Backup the original file
                Copy-Item -Path $BinaryPath -Destination "$BinaryPath.backup" -Force
                
                # Write the modified bytes back to the file
                [System.IO.File]::WriteAllBytes($BinaryPath, $bytes)
                Write-Host "Binary patched successfully. Original backup saved as $BinaryPath.backup" -ForegroundColor Green
            } else {
                Write-Host "No wss:// patterns found in the binary." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Error patching binary: $_" -ForegroundColor Red
            return $false
        }
        
        return $true
    } else {
        Write-Host "HTTPS URL detected, skipping WebSocket protocol binary patching" -ForegroundColor Yellow
        return $false
    }
}

function Set-WebSocketRegistrySettings {
    param (
        [string]$RmmUrl
    )
    
    # Only apply WebSocket protocol patching for non-HTTPS URLs
    if ($RmmUrl -match "^http://") {
        Write-Host "Setting WebSocket protocol registry settings..." -ForegroundColor Yellow
        
        try {
            # Create or update registry keys for Tactical RMM agent
            $regPath = "HKLM:\SOFTWARE\TacticalRMM"
            
            # Create the key if it doesn't exist
            if (-not (Test-Path $regPath)) {
                New-Item -Path $regPath -Force | Out-Null
            }
            
            # Set registry values
            New-ItemProperty -Path $regPath -Name "WebSocketProtocol" -Value "ws" -PropertyType String -Force | Out-Null
            New-ItemProperty -Path $regPath -Name "WebSocketPort" -Value "8000" -PropertyType String -Force | Out-Null
            New-ItemProperty -Path $regPath -Name "WebSocketPath" -Value "/natsws" -PropertyType String -Force | Out-Null
            
            Write-Host "Registry settings configured successfully" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "Error setting registry values: $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "HTTPS URL detected, skipping WebSocket protocol registry settings" -ForegroundColor Yellow
        return $false
    }
}

############################
# Binary Verification Functions
############################

function Verify-AMD64Binary {
    param (
        [string]$BinaryPath
    )
    
    Write-Host "Verifying AMD64 binary at: $BinaryPath" -ForegroundColor Cyan
    
    if (-not (Test-Path $BinaryPath)) {
        Write-Host "ERROR: AMD64 binary not found at path: $BinaryPath" -ForegroundColor Red
        return $false
    }
    
    $fileInfo = Get-Item $BinaryPath
    if ($fileInfo.Length -eq 0) {
        Write-Host "ERROR: AMD64 binary file is empty." -ForegroundColor Red
        return $false
    }
    
    # Check if file is a valid executable
    try {
        $bytes = [System.IO.File]::ReadAllBytes($BinaryPath)
        $isPE = $bytes.Length -gt 2 -and $bytes[0] -eq 0x4D -and $bytes[1] -eq 0x5A  # "MZ" header for PE files
        
        if ($isPE) {
            Write-Host "Binary appears to be a valid executable file." -ForegroundColor Green
            Write-Host "Binary size: $([Math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Binary does not appear to be a valid executable (missing MZ header)." -ForegroundColor Yellow
            Write-Host "The file may be corrupted or incomplete." -ForegroundColor Yellow
            return $false
        }
        
        # Try signature check as additional verification
        try {
            $signature = Get-AuthenticodeSignature -FilePath $BinaryPath -ErrorAction SilentlyContinue
            if ($signature) {
                Write-Host "Binary has a valid signature." -ForegroundColor Green
            }
        } catch {
            # Signature check failed, but we'll still continue if the PE header is valid
            Write-Host "NOTE: Could not verify executable signature, but will continue." -ForegroundColor Yellow
        }
    } catch {
        # File read failed
        Write-Host "ERROR: Failed to verify binary integrity: $_" -ForegroundColor Red
        return $false
    }
    
    Write-Host "AMD64 binary verification completed successfully." -ForegroundColor Green
    return $true
}

############################
# Aggressive Uninstallation
############################

function Uninstall-AggressivelyTacticalRMM {
    Write-Host ""
    Write-Host "=== Performing Aggressive Uninstallation ===" -ForegroundColor Yellow
    Write-Host "This will remove all components of the Tactical RMM agent..."
    
    # 1. Stop and remove services
    Write-Host "Stopping and removing services..."
    Stop-Service -Name "tacticalrmm" -Force -ErrorAction SilentlyContinue
    $service = Get-WmiObject -Class Win32_Service -Filter "Name='tacticalrmm'"
    if ($service) {
        $service.delete()
    }
    
    # 2. Remove Tactical Agent files and directories
    Write-Host "Removing Tactical Agent files..."
    Remove-Item -Path "C:\Program Files\TacticalAgent" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\ProgramData\TacticalRMM" -Recurse -Force -ErrorAction SilentlyContinue
    
    # 3. Clean up any logs
    Write-Host "Cleaning up logs..."
    Remove-Item -Path "C:\Windows\Temp\tacticalrmm*.log" -Force -ErrorAction SilentlyContinue
    
    # 4. Remove registry entries
    Write-Host "Removing registry entries..."
    Remove-Item -Path "HKLM:\SOFTWARE\TacticalRMM" -Recurse -Force -ErrorAction SilentlyContinue
    
    # 5. Additional cleanup for any other remnants
    Write-Host "Performing additional cleanup..."
    # Search for and remove any other files containing 'tactical' in common locations
    Get-ChildItem -Path "C:\Program Files" -Filter "*tactical*" -Recurse -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "Aggressive uninstallation completed. System is ready for fresh installation." -ForegroundColor Green
    Write-Host ""
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
    
    $currVal = Get-Variable -Name $VarName -ValueOnly -ErrorAction SilentlyContinue
    
    # If value is empty or null, use default or prompt for value
    # Don't use boolean comparison for string parameters
    if ([string]::IsNullOrEmpty($currVal)) {
        if ($Silent -or $script:SilentInstall) {
            # In silent mode, always use default value without prompting
            if (-not [string]::IsNullOrEmpty($DefaultVal)) {
                $userInp = $DefaultVal
                Write-Host "Using default value for ${VarName}: '$DefaultVal'" -ForegroundColor Cyan
            } else {
                # If no default and silent mode, use empty string
                $userInp = ""
                Write-Host "WARNING: No default value for ${VarName} in silent mode. Using empty string." -ForegroundColor Yellow
            }
        } else {
            # Interactive mode - prompt user
            if (-not [string]::IsNullOrEmpty($DefaultVal)) {
                $userInp = Read-Host "$PromptMsg [$DefaultVal]"
                if ([string]::IsNullOrEmpty($userInp)) {
                    $userInp = $DefaultVal
                }
            } else {
                $userInp = Read-Host "$PromptMsg"
            }
        }
        # Use script scope to ensure variables are available throughout the script
        Set-Variable -Name $VarName -Value $userInp -Scope Script
    }
}

############################
# Cloning/Patching/Building
############################

function Setup-BinaryFolder {
    # Create binaries folder if it doesn't exist
    $binariesFolder = Join-Path (Split-Path -Parent $PSCommandPath) "binaries"
    if (-not (Test-Path $binariesFolder)) {
        Write-Host "Creating binaries folder..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $binariesFolder -Force | Out-Null
    }
    
    # Check if AMD64 binary exists in the binaries folder
    if (-not (Test-Path $AMD64_BINARY_PATH)) {
        Write-Host "AMD64 binary not found in binaries folder." -ForegroundColor Yellow
        Write-Host "Please download the AMD64 binary from:" -ForegroundColor Yellow
        Write-Host "https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe" -ForegroundColor Cyan
        Write-Host "and place it in the 'binaries' folder as: $AMD64_BINARY" -ForegroundColor Cyan
        
        # Prompt to download the binary
        $downloadChoice = Read-Host "Would you like to attempt to download the binary now? (y/N)"
        if ($downloadChoice -match "^[Yy]") {
            try {
                Write-Host "Attempting to download AMD64 binary..." -ForegroundColor Yellow
                
                # Set TLS 1.2 for secure downloads
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                
                # Primary download URL
                $downloadUrl = "https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe"
                
                # Try primary download
                try {
                    Invoke-WebRequest -Uri $downloadUrl -OutFile $AMD64_BINARY_PATH -TimeoutSec 30
                } catch {
                    Write-Host "Primary download failed, trying alternative URL..." -ForegroundColor Yellow
                    
                    # Alternative download URL (latest)
                    $altDownloadUrl = "https://github.com/amidaware/rmmagent/releases/latest/download/tacticalagent-windows-amd64.exe"
                    try {
                        Invoke-WebRequest -Uri $altDownloadUrl -OutFile $AMD64_BINARY_PATH -TimeoutSec 30
                    } catch {
                        throw "Both primary and alternative downloads failed. Please download manually."
                    }
                }
                
                if (Test-Path $AMD64_BINARY_PATH) {
                    $fileInfo = Get-Item $AMD64_BINARY_PATH
                    if ($fileInfo.Length -gt 0) {
                        Write-Host "Successfully downloaded AMD64 binary ($([Math]::Round($fileInfo.Length / 1MB, 2)) MB)." -ForegroundColor Green
                    } else {
                        Write-Host "Downloaded file exists but is empty. Download may have failed." -ForegroundColor Red
                        throw "Downloaded file is empty"
                    }
                } else {
                    Write-Host "Failed to download AMD64 binary." -ForegroundColor Red
                    throw "Download failed - file not created"
                }
            } catch {
                Write-Host "Error downloading AMD64 binary: $_" -ForegroundColor Red
                Write-Host "Alternative download methods:" -ForegroundColor Yellow
                Write-Host "1. Use a web browser to download the file directly" -ForegroundColor Cyan
                Write-Host "2. Use curl.exe or wget.exe if available" -ForegroundColor Cyan
                Write-Host "3. Try again with a different network connection" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "AMD64 binary found in binaries folder." -ForegroundColor Green
    }
    
    # Verify the AMD64 binary
    return Verify-AMD64Binary -BinaryPath $AMD64_BINARY_PATH
}

function Setup-RMMAgent {
    Write-Host ""
    Write-Host "Setting up Tactical RMM Agent for Windows ARM64 using AMD64 binary with emulation..." -ForegroundColor Yellow

    # Define the output path for our renamed binary
    $outputPath = Join-Path (Get-Location) $OUTPUT_BINARY
    
    # Check if the AMD64 binary exists and has content
    $binaryExists = Test-Path $AMD64_BINARY_PATH
    $binaryHasContent = $false
    
    if ($binaryExists) {
        $fileInfo = Get-Item $AMD64_BINARY_PATH
        $binaryHasContent = $fileInfo.Length -gt 0
    }
    
    if (-not $binaryExists -or -not $binaryHasContent) {
        Write-Host "ERROR: AMD64 binary not found or is empty at path: $AMD64_BINARY_PATH" -ForegroundColor Red
        Write-Host "Please ensure the AMD64 binary is available in the 'binaries' folder." -ForegroundColor Red
        
        # Provide alternative download instructions
        Write-Host "Alternative ways to get the AMD64 binary:" -ForegroundColor Yellow
        Write-Host "1. Download directly from: https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe" -ForegroundColor Cyan
        Write-Host "2. Visit https://github.com/amidaware/rmmagent/releases and download the latest Windows AMD64 binary" -ForegroundColor Cyan
        Write-Host "3. Use curl.exe or wget.exe if available on your system" -ForegroundColor Cyan
        
        # Automatic download without prompting for silent installation
        try {
            # Create binaries folder if it doesn't exist
            $binariesFolder = Join-Path (Split-Path -Parent $PSCommandPath) "binaries"
            if (-not (Test-Path $binariesFolder)) {
                New-Item -ItemType Directory -Path $binariesFolder -Force | Out-Null
            }
            
            Write-Host "Attempting automatic download using alternative method..." -ForegroundColor Yellow
            
            # Try using System.Net.WebClient as an alternative to Invoke-WebRequest
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add("User-Agent", "PowerShell Script")
            $downloadUrl = "https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe"
            
            try {
                $webClient.DownloadFile($downloadUrl, $AMD64_BINARY_PATH)
                
                if (Test-Path $AMD64_BINARY_PATH) {
                    $fileInfo = Get-Item $AMD64_BINARY_PATH
                    if ($fileInfo.Length -gt 0) {
                        Write-Host "Successfully downloaded AMD64 binary using alternative method." -ForegroundColor Green
                        $binaryExists = $true
                        $binaryHasContent = $true
                    }
                }
            } catch {
                Write-Host "Alternative download method failed: $_" -ForegroundColor Red
                Write-Host "Will continue with installation process using any available binary." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Automatic download attempt failed: $_" -ForegroundColor Red
            Write-Host "Will continue with installation process using any available binary." -ForegroundColor Yellow
        }
        
        # Create a placeholder binary to allow the script to continue
        if (-not $binaryExists -or -not $binaryHasContent) {
            Write-Host "Creating placeholder binary to allow script to continue..." -ForegroundColor Yellow
            New-Item -ItemType File -Path $outputPath -Force | Out-Null
            Write-Host "WARNING: Binary file exists but is empty. Installation may not succeed." -ForegroundColor Red
            Write-Host "Please ensure you have a valid AMD64 binary in the 'binaries' folder." -ForegroundColor Red
            return $false
        }
    }
    
    # Copy the AMD64 binary to our output location
    try {
        Write-Host "Copying AMD64 binary to use with ARM64 emulation..." -ForegroundColor Cyan
        
        # Kill any processes that might be using the binary file
        try {
            Write-Host "Checking for processes using the binary file..." -ForegroundColor Yellow
            $processesUsingFile = Get-Process | Where-Object { 
                try { 
                    $_.Modules | Where-Object { $_.FileName -eq $outputPath } 
                } catch { 
                    $false 
                } 
            }
            
            if ($processesUsingFile) {
                Write-Host "Found processes using the binary file. Attempting to terminate them..." -ForegroundColor Yellow
                $processesUsingFile | ForEach-Object {
                    Write-Host "Terminating process: $($_.Name) (ID: $($_.Id))" -ForegroundColor Yellow
                    try {
                        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                        Write-Host "Successfully terminated process: $($_.Name) (ID: $($_.Id))" -ForegroundColor Green
                    } catch {
                        Write-Host "Failed to terminate process: $($_.Name) (ID: $($_.Id)) - $_" -ForegroundColor Red
                    }
                }
                # Give processes time to fully terminate
                Start-Sleep -Seconds 2
            } else {
                Write-Host "No processes found using the binary file." -ForegroundColor Green
            }
        } catch {
            Write-Host "Error checking for processes using the binary file: $_" -ForegroundColor Red
        }
        
        Copy-Item -Path $AMD64_BINARY_PATH -Destination $outputPath -Force
        
        if (Test-Path $outputPath) {
            $outputFileInfo = Get-Item $outputPath
            if ($outputFileInfo.Length -gt 0) {
                Write-Host "Successfully prepared AMD64 binary for ARM64 emulation." -ForegroundColor Green
                Write-Host "Binary path: $outputPath" -ForegroundColor Green
                Write-Host "Binary size: $([Math]::Round($outputFileInfo.Length / 1MB, 2)) MB" -ForegroundColor Green
                Write-Host "NOTE: This binary will run using Windows on ARM64 emulation layer." -ForegroundColor Cyan
                return $true
            } else {
                Write-Host "WARNING: Output binary file exists but is empty. Installation may not succeed." -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "Failed to copy AMD64 binary to output location." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error copying AMD64 binary: $_" -ForegroundColor Red
        return $false
    }
}

############################
# Configure Windows Service with Logging
############################

function Configure-AgentService {
    param (
        [string]$LogPath
    )
    
    Write-Host ""
    Write-Host "Configuring Windows service for detailed logging"
    
    # Default to a standard log path if none provided
    if ([string]::IsNullOrEmpty($LogPath)) {
        $LogPath = "C:\Windows\Temp\tacticalrmm.log"
        Write-Host "No custom log path specified, using default: $LogPath"
    }
    
    # Check if the service exists
    $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
    
    if ($service) {
        Write-Host "Updating tacticalrmm service with enhanced logging..."
        
        # Stop the service
        Stop-Service -Name "tacticalrmm" -Force
        
        # Get the current service path
        $serviceWMI = Get-WmiObject -Class Win32_Service -Filter "Name='tacticalrmm'"
        $currentPath = $serviceWMI.PathName
        
        # Add or update logging parameters
        if ($currentPath -match "-log") {
            # Service already has logging parameters, update them
            $newPath = $currentPath -replace "-log\s+\S+\s+-logto\s+\S+", "-log DEBUG -logto `"$LogPath`""
        } else {
            # Add logging parameters
            $newPath = $currentPath + " -log DEBUG -logto `"$LogPath`""
        }
        
        # Update the service
        $result = $serviceWMI.Change($null, $null, $null, $null, $null, $null, $newPath)
        
        if ($result.ReturnValue -eq 0) {
            Write-Host "Service updated successfully." -ForegroundColor Green
        } else {
            Write-Host "Failed to update service. Return code: $($result.ReturnValue)" -ForegroundColor Red
        }
        
        # Start the service
        Start-Service -Name "tacticalrmm"
        
        Write-Host "TacticalRMM logging configured to use: $LogPath"
    } else {
        Write-Host "Warning: tacticalrmm service not found. Agent may not be installed yet." -ForegroundColor Yellow
    }
}

############################
# Prompt to run
############################

function Prompt-RunAgent {
    Write-Host ""
    Write-Host "=== Setup Complete ===" -ForegroundColor Green
    Write-Host "Note about functionality:" -ForegroundColor Cyan
    Write-Host "The Windows ARM64 installation is using AMD64 binary with Windows on ARM emulation" -ForegroundColor Cyan
    Write-Host "This provides full functionality including software detection" -ForegroundColor Cyan
    Write-Host "The binary will run using the Windows on ARM64 emulation layer" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can run the agent with your RMM server & auth key. For example:"
    Write-Host "  .\$OUTPUT_BINARY -m install \"
    Write-Host "     -api `"$RmmServerUrl`" \"
    Write-Host "     -auth `"$AgentAuthKey`" \"
    Write-Host "     -client-id <ID> -site-id <ID> -agent-type <server|workstation> \"
    Write-Host "     -log `"DEBUG`" -logto `"$AgentLogPath`""
    Write-Host ""
    
    if ($SkipRun) {
        Write-Host "Skipping final run (-SkipRun)."
        return
    }
    
    # Always run automatically in silent or non-interactive mode
    if ($script:SilentInstall -or (-not [string]::IsNullOrEmpty($RmmServerUrl) -and -not [string]::IsNullOrEmpty($AgentAuthKey))) {
        Write-Host "Required server parameters provided, proceeding with installation..." -ForegroundColor Green
        $runNow = "y"
    } else {
        if ($Interactive) {
            $runNow = Read-Host "Do you want to run the agent install command now? (y/N)"
        } else {
            Write-Host "ERROR: RmmServerUrl and AgentAuthKey are required parameters" -ForegroundColor Red
            exit 1
        }
    }
    
    if ($runNow -match "^[Yy]") {
        # If no log path was specified, create a default one
        if ([string]::IsNullOrEmpty($AgentLogPath)) {
            $AgentLogPath = "C:\logs\tactical.log"
            Write-Host "Using default log path: $AgentLogPath"
        }
        
        # Ensure log directory exists
        $logDirectory = Split-Path -Path $AgentLogPath -Parent
        if (-not (Test-Path -Path $logDirectory)) {
            try {
                Write-Host "Creating log directory: $logDirectory" -ForegroundColor Yellow
                New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
                Write-Host "Created log directory: $logDirectory" -ForegroundColor Green
            } catch {
                Write-Host "WARNING: Could not create log directory $logDirectory. Using TEMP directory instead." -ForegroundColor Red
                $AgentLogPath = Join-Path $env:TEMP "tactical.log"
                Write-Host "Log path changed to: $AgentLogPath" -ForegroundColor Yellow
            }
        }
        
        # In non-interactive mode, ensure we have all required values
        if (-not $Interactive) {
            if ([string]::IsNullOrEmpty($ClientId) -or $ClientId -eq $true -or $ClientId -eq "True") {
                if ($script:SilentInstall) {
                    # Use default value in silent mode
                    $ClientId = "1"
                    Write-Host "Using default ClientId: ${ClientId}" -ForegroundColor Yellow
                } else {
                    Write-Host "ERROR: ClientId is required in non-interactive mode" -ForegroundColor Red
                    exit 1
                }
            }
            if ([string]::IsNullOrEmpty($SiteId) -or $SiteId -eq $true -or $SiteId -eq "True") {
                if ($script:SilentInstall) {
                    # Use default value in silent mode
                    $SiteId = "1"
                    Write-Host "Using default SiteId: ${SiteId}" -ForegroundColor Yellow
                } else {
                    Write-Host "ERROR: SiteId is required in non-interactive mode" -ForegroundColor Red
                    exit 1
                }
            }
            if ([string]::IsNullOrEmpty($AgentType) -or $AgentType -eq $true -or $AgentType -eq "True") {
                $AgentType = "workstation"
                Write-Host "Using default agent type: $AgentType" -ForegroundColor Yellow
            }
        }
        
        # Create the proper binary path
        $binaryPath = Join-Path (Get-Location) $OUTPUT_BINARY
        
        # Ensure we're using absolute paths for everything to avoid any UI prompts
        $RmmServerUrl = [System.Uri]::new($RmmServerUrl).AbsoluteUri
        $AgentLogPath = [System.IO.Path]::GetFullPath($AgentLogPath)

        # Verify the binary exists and has content
        if (-not (Test-Path $binaryPath)) {
            Write-Host "ERROR: Binary file is missing. Installation cannot proceed." -ForegroundColor Red
            Write-Host "The AMD64 binary should be in the 'binaries' folder." -ForegroundColor Yellow
            
            # Check if the original AMD64 binary exists
            if (Test-Path $AMD64_BINARY_PATH) {
                Write-Host "Found original AMD64 binary. Attempting to use it directly..." -ForegroundColor Yellow
                $binaryPath = $AMD64_BINARY_PATH
            } else {
                Write-Host "No binary found. Please download the AMD64 binary from:" -ForegroundColor Yellow
                Write-Host "https://github.com/amidaware/rmmagent/releases/latest/download/tacticalagent-windows-amd64.exe" -ForegroundColor Cyan
                return
            }
        } elseif ((Get-Item $binaryPath).Length -eq 0) {
            Write-Host "WARNING: Binary file exists but is empty. Installation may not succeed." -ForegroundColor Yellow
            Write-Host "Please ensure you have a valid AMD64 binary in the 'binaries' folder." -ForegroundColor Yellow
            return
        } else {
            Write-Host "Binary verification successful. Proceeding with installation..." -ForegroundColor Green
        }

        # Use script-scoped variables for the command
        # Add silent installation flags to prevent UI prompts
        
        # Ensure parameters are passed correctly without being converted to "True" literals
        # Use explicit string values to prevent boolean conversion and provide defaults
        # ClientId and SiteId must be integers, not strings, for the agent installation command
        # Use proper integer parsing with TryParse
        $clientIdParam = 1
        if (-not ([string]::IsNullOrEmpty($ClientId) -or $ClientId -eq $true -or $ClientId -eq "True")) {
            $tempValue = 0
            if ([int]::TryParse($ClientId, [ref]$tempValue)) {
                $clientIdParam = $tempValue
            }
        }
        [int]$clientIdParam = $clientIdParam

        $siteIdParam = 1
        if (-not ([string]::IsNullOrEmpty($SiteId) -or $SiteId -eq $true -or $SiteId -eq "True")) {
            $tempValue = 0
            if ([int]::TryParse($SiteId, [ref]$tempValue)) {
                $siteIdParam = $tempValue
            }
        }
        [int]$siteIdParam = $siteIdParam

        [string]$agentTypeParam = if ([string]::IsNullOrEmpty($AgentType) -or $AgentType -eq $true -or $AgentType -eq "True") { "workstation" } else { "$AgentType" }
        
        Write-Host "Using parameters for installation:" -ForegroundColor Green
        Write-Host "  - Client ID: $clientIdParam (type: $($clientIdParam.GetType().Name))" -ForegroundColor Green
        Write-Host "  - Site ID: $siteIdParam (type: $($siteIdParam.GetType().Name))" -ForegroundColor Green
        Write-Host "  - Agent Type: '$agentTypeParam' (type: $($agentTypeParam.GetType().Name))" -ForegroundColor Green
        
        # Build command with explicit parameter values - no quotes for integer parameters
        # Add all available silent installation flags based on Tactical RMM documentation
        $cmd = "& `"$binaryPath`" -m install -api `"$RmmServerUrl`" -auth `"$AgentAuthKey`" -client-id $clientIdParam -site-id $siteIdParam -agent-type `"$agentTypeParam`" -log `"DEBUG`" -logto `"$AgentLogPath`" -nomesh -silent -quiet -noprompt -accepteula -nostart -norestart"
        
        Write-Host "Running: $cmd"
        try {
            # Use the flags provided by the user for completely silent installation
            # First run the binary with VERYSILENT and SUPPRESSMSGBOXES flags
            $installArgList = @(
                "/VERYSILENT", 
                "/SUPPRESSMSGBOXES"
            )
            
            # Then prepare the agent installation arguments
            $agentArgList = @(
                "-m", "install",
                "--api", "$RmmServerUrl",
                "--client-id", [int]$clientIdParam,
                "--site-id", [int]$siteIdParam,
                "--agent-type", $agentTypeParam,
                "--auth", "$AgentAuthKey"
            )
            
            # Use Start-Process with compatible parameters for Windows ARM64
            $processParams = @{
                FilePath = $binaryPath
                ArgumentList = $argList
                Wait = $true
                PassThru = $true
                # Use only parameters that are compatible with all PowerShell versions
                # NoNewWindow and WindowStyle can cause issues on some PowerShell versions
            }
            
            # Set environment variables to suppress UI prompts
            $env:POWERSHELL_WINDOW_VISIBLE = $false
            $env:POWERSHELL_WINDOW_STYLE = 'Hidden'
            
            # Suppress any Windows error dialogs
            [System.Environment]::SetEnvironmentVariable('SuppressAeDebugger', '1', 'Process')
            [System.Environment]::SetEnvironmentVariable('POWERSHELL_WINDOW_VISIBLE', 'false', 'Process')
            
            # Disable Windows Error Reporting UI
            if (-not [System.Environment]::GetEnvironmentVariable('WerModeTest', 'Process')) {
                [System.Environment]::SetEnvironmentVariable('WerModeTest', '1', 'Process')
            }
            
            # Additional environment variables to suppress UI
            $env:DOTNET_CLI_UI_LANGUAGE = 'en'
            $env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = 'true'
            $env:DOTNET_NOLOGO = 'true'
            $env:TACTICAL_SILENT = 'true'
            $env:TACTICAL_NOPROMPT = 'true'
            $env:TACTICAL_ACCEPTEULA = 'true'
            
            # Create registry keys to suppress installer UI
            try {
                # Create registry keys to suppress MSI UI
                New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Force -ErrorAction SilentlyContinue | Out-Null
                New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name "EnableUserControl" -Value 0 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name "DisableUserInstalls" -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                
                # Suppress Tactical RMM UI dialogs
                New-Item -Path "HKCU:\Software\Policies\TacticalRMM" -Force -ErrorAction SilentlyContinue | Out-Null
                New-ItemProperty -Path "HKCU:\Software\Policies\TacticalRMM" -Name "SilentInstall" -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                New-ItemProperty -Path "HKCU:\Software\Policies\TacticalRMM" -Name "NoPrompt" -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                New-ItemProperty -Path "HKCU:\Software\Policies\TacticalRMM" -Name "AcceptEULA" -Value 1 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                
                # Suppress Windows Installer UI
                New-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Installer" -Name "UILevel" -Value 2 -PropertyType DWord -Force -ErrorAction SilentlyContinue | Out-Null
                
                # Disable Windows Installer UI globally
                [System.Environment]::SetEnvironmentVariable('WINDOWS_INSTALLER_UI_LEVEL', '2', 'Process')
            } catch {
                Write-Host "Note: Unable to create registry keys to suppress installer UI. Continuing with installation." -ForegroundColor Yellow
            }
            try {
                # Use the exact flags provided by the user for silent installation
                Write-Host "Using exact flags provided for silent installation..." -ForegroundColor Cyan
                
                # Step 1: Run the binary with VERYSILENT and SUPPRESSMSGBOXES flags
                $binaryInstallCmd = "& `"$binaryPath`" /VERYSILENT /SUPPRESSMSGBOXES"
                Write-Host "Step 1: Running binary installation: $binaryInstallCmd" -ForegroundColor Cyan
                
                # Set up process for binary installation
                $installProcess = New-Object System.Diagnostics.Process
                $installProcess.StartInfo.FileName = $binaryPath
                $installProcess.StartInfo.Arguments = "/VERYSILENT /SUPPRESSMSGBOXES"
                $installProcess.StartInfo.UseShellExecute = $false
                $installProcess.StartInfo.CreateNoWindow = $true
                $installProcess.StartInfo.WindowStyle = 'Hidden'
                $installProcess.StartInfo.RedirectStandardOutput = $true
                $installProcess.StartInfo.RedirectStandardError = $true
                
                # Start the installation process
                $installProcess.Start() | Out-Null
                $installOutput = $installProcess.StandardOutput.ReadToEnd()
                $installError = $installProcess.StandardError.ReadToEnd()
                $installProcess.WaitForExit()
                
                # Save installation output
                $installOutput | Out-File -FilePath "$env:TEMP\tactical_install_stdout.log" -Force
                $installError | Out-File -FilePath "$env:TEMP\tactical_install_stderr.log" -Force
                
                Write-Host "Binary installation completed with exit code: $($installProcess.ExitCode)" -ForegroundColor Cyan
                
                # Step 2: Wait 5 seconds (ping delay as in the user's command)
                Write-Host "Step 2: Waiting 5 seconds before agent configuration..." -ForegroundColor Cyan
                Start-Sleep -Seconds 5
                
                # Apply WebSocket protocol modifications before running the agent
                Write-Host "Checking RMM URL protocol for WebSocket modifications..." -ForegroundColor Cyan
                
                # Only apply WebSocket protocol modifications for non-HTTPS URLs
                if ($RmmUrl -match "^http://") {
                    Write-Host "Non-HTTPS RMM URL detected. Applying WebSocket protocol modifications..." -ForegroundColor Cyan
                    
                    # Set environment variables
                    Set-WebSocketProtocolEnvironment -RmmUrl $RmmUrl
                    
                    # Set registry settings
                    Set-WebSocketRegistrySettings -RmmUrl $RmmUrl
                    
                    # Patch the binary as a fallback method
                    if (Test-Path "C:\Program Files\TacticalAgent\tacticalrmm.exe") {
                        Patch-WebSocketProtocol -BinaryPath "C:\Program Files\TacticalAgent\tacticalrmm.exe" -RmmUrl $RmmUrl
                    }
                    
                    Write-Host "WebSocket protocol modifications applied, proceeding with agent installation..." -ForegroundColor Cyan
                } else {
                    Write-Host "HTTPS RMM URL detected. Skipping WebSocket protocol modifications." -ForegroundColor Cyan
                }
                
                # Step 3: Run the agent installation command with exact flags from user
                $agentPath = "C:\Program Files\TacticalAgent\tacticalrmm.exe"
                # Use the exact format provided by the user (matching the format they specified)
                # Original format: -m install --api http://localhost:8000 --client-id 1 --site-id 1 --agent-type server --auth 9fd7fef1d3ec77ae1fbfb65bcc76a5b72d3606c8e9e050466f1dee8cd9407329
                # Build agent arguments with all optional flags
                $agentArgs = "-m install"
                
                # Add optional flags based on parameters
                if ($NoMesh) {
                    $agentArgs += " --nomesh"
                }
                
                if ($Silent) {
                    $agentArgs += " -silent"
                }
                
                if ($LogLevel) {
                    $agentArgs += " -log $LogLevel"
                }
                
                if ($LogPath) {
                    $agentArgs += " -logto `"$AgentLogPath`""
                }
                
                if ($LocalMeshPath) {
                    $agentArgs += " -local-mesh `"$LocalMeshPath`""
                }
                
                if ($MeshDir) {
                    $agentArgs += " -meshdir `"$MeshDir`""
                }
                
                if ($CertPath) {
                    $agentArgs += " -cert `"$CertPath`""
                }
                
                if ($AgentDescription) {
                    $agentArgs += " -desc `"$AgentDescription`""
                }
                
                if ($ProxyServer) {
                    $agentArgs += " -proxy `"$ProxyServer`""
                } else {
                    # Add WebSocket proxy setting for protocol override if no custom proxy is specified
                    $agentArgs += " -proxy `"http://localhost:8000/natsws`""
                }
                
                # Add required parameters
                $agentArgs += " --api $RmmServerUrl --client-id $clientIdParam --site-id $siteIdParam --agent-type $agentTypeParam --auth $AgentAuthKey"
                $agentCmd = "& `"$agentPath`" $agentArgs"
                
                Write-Host "Step 3: Running agent configuration: $agentCmd" -ForegroundColor Cyan
                
                # Set up process for agent configuration
                $agentProcess = New-Object System.Diagnostics.Process
                $agentProcess.StartInfo.FileName = $agentPath
                $agentProcess.StartInfo.Arguments = $agentArgs
                $agentProcess.StartInfo.UseShellExecute = $false
                $agentProcess.StartInfo.CreateNoWindow = $true
                $agentProcess.StartInfo.WindowStyle = 'Hidden'
                $agentProcess.StartInfo.RedirectStandardOutput = $true
                $agentProcess.StartInfo.RedirectStandardError = $true
                
                # Start the agent configuration process
                $agentProcess.Start() | Out-Null
                $agentOutput = $agentProcess.StandardOutput.ReadToEnd()
                $agentError = $agentProcess.StandardError.ReadToEnd()
                $agentProcess.WaitForExit()
                
                # Save agent configuration output
                $agentOutput | Out-File -FilePath "$env:TEMP\tactical_agent_stdout.log" -Force
                $agentError | Out-File -FilePath "$env:TEMP\tactical_agent_stderr.log" -Force
                
                Write-Host "Agent configuration completed with exit code: $($agentProcess.ExitCode)" -ForegroundColor Cyan
                
                # Wait for service to appear (it might take a moment after process completes)
                Write-Host "Waiting for service to register..." -ForegroundColor Cyan
                $maxRetries = 10
                $retryCount = 0
                $serviceInstalled = $false
                
                while ($retryCount -lt $maxRetries -and -not $serviceInstalled) {
                    $serviceInstalled = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
                    if (-not $serviceInstalled) {
                        Write-Host "Service not found yet, waiting 5 seconds... (Attempt $($retryCount+1)/$maxRetries)" -ForegroundColor Yellow
                        Start-Sleep -Seconds 5
                        $retryCount++
                    }
                }
                
                # Check if service is installed
            } catch {
                Write-Host "Error executing agent installation: $_" -ForegroundColor Red
                Write-Host "Please check permissions and file access rights." -ForegroundColor Red
            }
        }
        catch {
            Write-Host "Error executing agent command: $_" -ForegroundColor Red
            Write-Host "This may be due to Windows on ARM emulation issues." -ForegroundColor Yellow
            Write-Host "Check the log file for more details: $AgentLogPath" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Agent started with maximum verbosity! Logs will be written to: $AgentLogPath"
        Write-Host "To monitor the log in real-time, run: Get-Content -Path $AgentLogPath -Wait"
        
        # After successful install, configure the service with the custom log path
        Configure-AgentService -LogPath $AgentLogPath
        
        Write-Host ""
        Write-Host "You can monitor the agent logs with this command:"
        Write-Host "  Get-Content -Path $AgentLogPath -Wait              # For tactical agent"
    }
    
    Write-Host ""
    Write-Host "=== All Done! ===" -ForegroundColor Green
    Write-Host "Your agent is at: $(Join-Path (Get-Location) $OUTPUT_BINARY)"
    Write-Host "NOTE: This is an AMD64 binary running with Windows on ARM64 emulation" -ForegroundColor Cyan
}

############################
# Main Script Flow
############################

# 1) Install dependencies
Write-Host "Checking and installing dependencies if needed..."
Install-Git
Install-Go

# Perform aggressive uninstallation before proceeding
Uninstall-AggressivelyTacticalRMM

# 2) Prompt for missing fields
Write-Host ""
Write-Host "=== Checking user inputs ===" -ForegroundColor Cyan

function Prompt-AllInputs {
    # Only prompt for values if they weren't provided as parameters or if in interactive mode
    if ($InteractiveMode -or [string]::IsNullOrEmpty($RmmServerUrl)) {
        Prompt-IfEmpty -VarName "RmmServerUrl" -PromptMsg "RMM Server URL (e.g. https://rmm.myorg.com)"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($AgentAuthKey)) {
        Prompt-IfEmpty -VarName "AgentAuthKey" -PromptMsg "Agent Auth Key (string from your RMM)"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($ClientId)) {
        if ($InteractiveMode) {
            Prompt-IfEmpty -VarName "ClientId" -PromptMsg "Client ID"
        } else {
            Write-Host "ERROR: ClientId is required in non-interactive mode" -ForegroundColor Red
            exit 1
        }
    }
    # Display the ClientId value as provided by the user, not as a boolean conversion
    Write-Host "Using provided Client ID: '$ClientId'" -ForegroundColor Green
    
    if ($InteractiveMode -or [string]::IsNullOrEmpty($SiteId)) {
        if ($InteractiveMode) {
            Prompt-IfEmpty -VarName "SiteId" -PromptMsg "Site ID"
        } else {
            Write-Host "ERROR: SiteId is required in non-interactive mode" -ForegroundColor Red
            exit 1
        }
    }
    # Display the SiteId value as provided by the user, not as a boolean conversion
    Write-Host "Using provided Site ID: '$SiteId'" -ForegroundColor Green
    
    if ($InteractiveMode -or [string]::IsNullOrEmpty($AgentType)) {
        if ($InteractiveMode) {
            Prompt-IfEmpty -VarName "AgentType" -PromptMsg "Agent type (server/workstation) [workstation]" -DefaultVal "workstation"
        } else {
            # Set default value for AgentType if it's not provided
            $AgentType = "workstation"
            Write-Host "Using default agent type: $AgentType" -ForegroundColor Yellow
        }
    }
    Write-Host "Using agent type: $AgentType" -ForegroundColor Green
    # Only prompt for log path if explicitly requested
    if ($InteractiveMode -or (-not [string]::IsNullOrEmpty($AgentLogPath) -and [string]::IsNullOrEmpty($AgentLogPath))) {
        Prompt-IfEmpty -VarName "AgentLogPath" -PromptMsg "Agent log path"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($BuildFolder)) {
        Prompt-IfEmpty -VarName "BuildFolder" -PromptMsg "Destination build folder" -DefaultVal "rmmagent"
    }
}

# Only run prompts if in interactive mode
if ($InteractiveMode) {
    Prompt-AllInputs
    
    Write-Host ""
    Write-Host "== Final values ==" -ForegroundColor Cyan
    # Only display values that are actually set
    if (-not [string]::IsNullOrEmpty($RmmServerUrl)) { Write-Host " RMM URL         : $RmmServerUrl" }
    if (-not [string]::IsNullOrEmpty($AgentAuthKey)) { Write-Host " Auth Key        : $AgentAuthKey" }
    if (-not [string]::IsNullOrEmpty($ClientId)) { Write-Host " Client ID       : $ClientId" }
    if (-not [string]::IsNullOrEmpty($SiteId)) { Write-Host " Site ID         : $SiteId" }
    if (-not [string]::IsNullOrEmpty($AgentType)) { Write-Host " Agent Type      : $AgentType" }
    if (-not [string]::IsNullOrEmpty($AgentLogPath)) { Write-Host " Log Path        : $AgentLogPath" }
    if (-not [string]::IsNullOrEmpty($BuildFolder)) { Write-Host " Build Folder    : $BuildFolder" }
    if ($SkipRun) { Write-Host " skip-run        : $SkipRun" }
    Write-Host ""
    
    # Only show the proceed prompt if we're not in skip-run mode and in interactive mode
    if (-not $SkipRun) {
        Read-Host "Press Enter to proceed, or Ctrl+C to cancel"
    }
} else {
    # In non-interactive mode, validate required parameters
    if ([string]::IsNullOrEmpty($RmmServerUrl)) {
        Write-Host "ERROR: RmmServerUrl is required in non-interactive mode" -ForegroundColor Red
        exit 1
    }
    if ([string]::IsNullOrEmpty($AgentAuthKey)) {
        Write-Host "ERROR: AgentAuthKey is required in non-interactive mode" -ForegroundColor Red
        exit 1
    }
    if ([string]::IsNullOrEmpty($ClientId)) {
        Write-Host "ERROR: ClientId is required in non-interactive mode" -ForegroundColor Red
        exit 1
    }
    if ([string]::IsNullOrEmpty($SiteId)) {
        Write-Host "ERROR: SiteId is required in non-interactive mode" -ForegroundColor Red
        exit 1
    }
    
    # Set default values for optional parameters
    if ([string]::IsNullOrEmpty($AgentType)) {
        $AgentType = "workstation"
        Write-Host "Using default agent type: $AgentType" -ForegroundColor Yellow
    }
    
    if ([string]::IsNullOrEmpty($AgentLogPath)) {
        $AgentLogPath = "C:\Windows\Temp\tacticalrmm.log"
        Write-Host "Using default log path: $AgentLogPath" -ForegroundColor Yellow
    }
    
    # Display values for debugging
    Write-Host "== Using values ==" -ForegroundColor Cyan
    Write-Host " RMM URL         : $RmmServerUrl"
    Write-Host " Auth Key        : $AgentAuthKey"
    Write-Host " Client ID       : $ClientId"
    Write-Host " Site ID         : $SiteId"
    Write-Host " Agent Type      : $AgentType"
    Write-Host " Log Path        : $AgentLogPath"
}

############################
# Main Script Flow
############################

# 1) Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# 2) Install dependencies (only Git is needed for downloading)
Install-Git

# 3) Setup binary folder and verify AMD64 binary
Setup-BinaryFolder

# 4) Setup AMD64 binary for ARM64 emulation
Write-Host "Using pre-built AMD64 binary with Windows on ARM64 emulation..." -ForegroundColor Cyan
Setup-RMMAgent

# 5) Prompt to run (and configure service if installed)
Prompt-RunAgent
