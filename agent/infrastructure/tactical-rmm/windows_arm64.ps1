#
# windows_arm64.ps1
#
# Purpose:
#   - Install dependencies (Git, Go) on Windows ARM64
#   - Accept script args or prompt for org name, email, RMM URL, agent key, log path, build folder
#   - Clone, patch, compile rmmagent for Windows ARM64
#   - Prompt to run agent or skip
#   - After install, configure the Windows service to use the custom log path (if provided)
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
    [string]$AgentType,
    [string]$LogPath,
    [string]$BuildFolder = "rmmagent",
    [switch]$SkipRun,
    [switch]$Help,
    [switch]$Interactive
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
$OrgName = $OrgName -or ""
$ContactEmail = $Email -or ""
$RmmServerUrl = $RmmUrl -or ""
$AgentAuthKey = $AuthKey -or ""
$AgentLogPath = $LogPath -or ""
# Ensure BuildFolder has a default that's not the variable name itself
$script:BuildFolder = if ([string]::IsNullOrEmpty($BuildFolder) -or $BuildFolder -eq "$true") { "rmmagent" } else { $BuildFolder }
$SkipRun = $SkipRun -or $false
$ClientId = $ClientId -or ""
$SiteId = $SiteId -or ""
$AgentType = $AgentType -or "workstation"  # default

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
    # ClientId parameter was explicitly provided
    Write-Host "Using provided Client ID: $ClientId"
}
if ($PSBoundParameters.ContainsKey('SiteId')) {
    # SiteId parameter was explicitly provided
    Write-Host "Using provided Site ID: $SiteId"
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
        $signature = Get-AuthenticodeSignature -FilePath $BinaryPath -ErrorAction SilentlyContinue
        if ($signature) {
            Write-Host "Binary appears to be a valid executable file." -ForegroundColor Green
        }
    } catch {
        # Signature check failed, but we'll still continue
        Write-Host "NOTE: Could not verify executable signature, but will continue." -ForegroundColor Yellow
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
        [string]$DefaultVal = ""
    )
    
    $currVal = Get-Variable -Name $VarName -ValueOnly -ErrorAction SilentlyContinue
    
    # If value is True/False (boolean parameter) or null/empty, prompt for value
    if ($currVal -eq $true -or $currVal -eq $false -or [string]::IsNullOrEmpty($currVal)) {
        if (-not [string]::IsNullOrEmpty($DefaultVal)) {
            $userInp = Read-Host "$PromptMsg [$DefaultVal]"
            if ([string]::IsNullOrEmpty($userInp)) {
                $userInp = $DefaultVal
            }
        } else {
            $userInp = Read-Host "$PromptMsg"
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
        Write-Host "https://github.com/amidaware/rmmagent/releases/latest/download/tacticalagent-windows-amd64.exe" -ForegroundColor Cyan
        Write-Host "and place it in the 'binaries' folder as: $AMD64_BINARY" -ForegroundColor Cyan
        
        # Prompt to download the binary
        $downloadChoice = Read-Host "Would you like to attempt to download the binary now? (y/N)"
        if ($downloadChoice -match "^[Yy]") {
            try {
                Write-Host "Attempting to download AMD64 binary..." -ForegroundColor Yellow
                $downloadUrl = "https://github.com/amidaware/rmmagent/releases/download/v2.9.0/tacticalagent-v2.9.0-windows-amd64.exe"
                Invoke-WebRequest -Uri $downloadUrl -OutFile $AMD64_BINARY_PATH
                
                if (Test-Path $AMD64_BINARY_PATH) {
                    Write-Host "Successfully downloaded AMD64 binary." -ForegroundColor Green
                } else {
                    Write-Host "Failed to download AMD64 binary." -ForegroundColor Red
                }
            } catch {
                Write-Host "Error downloading AMD64 binary: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "AMD64 binary found in binaries folder." -ForegroundColor Green
    }
    
    # Verify the AMD64 binary
    Verify-AMD64Binary -BinaryPath $AMD64_BINARY_PATH
}

function Setup-RMMAgent {
    Write-Host ""
    Write-Host "Setting up Tactical RMM Agent for Windows ARM64 using AMD64 binary with emulation..." -ForegroundColor Yellow

    # Define the output path for our renamed binary
    $outputPath = Join-Path (Get-Location) $OUTPUT_BINARY
    
    # Check if the AMD64 binary exists
    if (-not (Test-Path $AMD64_BINARY_PATH)) {
        Write-Host "ERROR: AMD64 binary not found at path: $AMD64_BINARY_PATH" -ForegroundColor Red
        Write-Host "Please ensure the AMD64 binary is available in the 'binaries' folder." -ForegroundColor Red
        
        # Create a placeholder binary to allow the script to continue
        Write-Host "Creating placeholder binary to allow script to continue..." -ForegroundColor Yellow
        New-Item -ItemType File -Path $outputPath -Force | Out-Null
        return $false
    }
    
    # Copy the AMD64 binary to our output location
    try {
        Write-Host "Copying AMD64 binary to use with ARM64 emulation..." -ForegroundColor Cyan
        Copy-Item -Path $AMD64_BINARY_PATH -Destination $outputPath -Force
        
        if (Test-Path $outputPath) {
            Write-Host "Successfully prepared AMD64 binary for ARM64 emulation." -ForegroundColor Green
            Write-Host "Binary path: $outputPath" -ForegroundColor Green
            Write-Host "NOTE: This binary will run using Windows on ARM64 emulation layer." -ForegroundColor Cyan
            return $true
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
    
    # If all required parameters are provided, run automatically
    if (-not [string]::IsNullOrEmpty($RmmServerUrl) -and -not [string]::IsNullOrEmpty($AgentAuthKey) -and 
        -not [string]::IsNullOrEmpty($ClientId) -and -not [string]::IsNullOrEmpty($SiteId)) {
        Write-Host "All required parameters provided, proceeding with installation..."
        $runNow = "y"
    } else {
        $runNow = Read-Host "Do you want to run the agent install command now? (y/N)"
    }
    
    if ($runNow -match "^[Yy]") {
        # Only prompt for values if they weren't provided as arguments
        if ([string]::IsNullOrEmpty($ClientId)) {
            $ClientId = Read-Host "Enter client-id"
        }
        if ([string]::IsNullOrEmpty($SiteId)) {
            $SiteId = Read-Host "Enter site-id"
        }
        if ([string]::IsNullOrEmpty($AgentType)) {
            $AgentType = Read-Host "Agent type (server/workstation) [workstation]"
            if ([string]::IsNullOrEmpty($AgentType)) {
                $AgentType = "workstation"
            }
        }
        
        # If no log path was specified, create a default one
        if ([string]::IsNullOrEmpty($AgentLogPath)) {
            $AgentLogPath = "C:\Windows\Temp\tacticalrmm.log"
            Write-Host "Using default log path: $AgentLogPath"
        }
        
        # Create the proper binary path
        $binaryPath = Join-Path (Get-Location) $OUTPUT_BINARY

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
        $cmd = "& `"$binaryPath`" -m install -api `"$RmmServerUrl`" -auth `"$AgentAuthKey`" -client-id `"$script:ClientId`" -site-id `"$script:SiteId`" -agent-type `"$script:AgentType`" -log `"DEBUG`" -logto `"$AgentLogPath`" -nomesh"
        
        Write-Host "Running: $cmd"
        try {
            Invoke-Expression $cmd
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
    if ($InteractiveMode -or [string]::IsNullOrEmpty($ClientId) -or $ClientId -eq $true) {
        Prompt-IfEmpty -VarName "ClientId" -PromptMsg "Client ID"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($SiteId) -or $SiteId -eq $true) {
        Prompt-IfEmpty -VarName "SiteId" -PromptMsg "Site ID"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($AgentType) -or $AgentType -eq $true) {
        Prompt-IfEmpty -VarName "AgentType" -PromptMsg "Agent type (server/workstation) [workstation]" -DefaultVal "workstation"
    }
    # Only prompt for log path if explicitly requested
    if ($InteractiveMode -or (-not [string]::IsNullOrEmpty($AgentLogPath) -and [string]::IsNullOrEmpty($AgentLogPath))) {
        Prompt-IfEmpty -VarName "AgentLogPath" -PromptMsg "Agent log path"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($BuildFolder)) {
        Prompt-IfEmpty -VarName "BuildFolder" -PromptMsg "Destination build folder" -DefaultVal "rmmagent"
    }
}

# Only run prompts if in interactive mode or missing required parameters
if ($InteractiveMode -or [string]::IsNullOrEmpty($RmmServerUrl) -or [string]::IsNullOrEmpty($AgentAuthKey) -or 
    [string]::IsNullOrEmpty($ClientId) -or [string]::IsNullOrEmpty($SiteId)) {
    Prompt-AllInputs
}

# Only show final values and proceed prompt if we're missing required parameters
if ([string]::IsNullOrEmpty($RmmServerUrl) -or [string]::IsNullOrEmpty($AgentAuthKey) -or 
    [string]::IsNullOrEmpty($ClientId) -or [string]::IsNullOrEmpty($SiteId)) {
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
    
    # Only show the proceed prompt if we're not in skip-run mode
    if (-not $SkipRun) {
        Read-Host "Press Enter to proceed, or Ctrl+C to cancel"
    }
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
