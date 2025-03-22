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

# We'll store user-provided or prompted values in these variables:
$OrgName = $OrgName -or ""
$ContactEmail = $Email -or ""
$RmmServerUrl = $RmmUrl -or ""
$AgentAuthKey = $AuthKey -or ""
$AgentLogPath = $LogPath -or ""
$BuildFolder = $BuildFolder -or "rmmagent"  # default
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
    Write-Host "  It handles dependency installation, code compilation, and agent configuration."
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

function Install-Go {
    Write-Host "Checking Go..."
    if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Go..."
        # Download Go for Windows ARM64
        $goInstallerUrl = "https://go.dev/dl/go1.21.0.windows-arm64.msi"
        $goInstallerPath = "$env:TEMP\GoInstaller.msi"
        
        Invoke-WebRequest -Uri $goInstallerUrl -OutFile $goInstallerPath
        
        # Install Go silently
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $goInstallerPath, "/quiet", "/norestart" -Wait
        
        # Update PATH environment variable
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Clean up
        Remove-Item $goInstallerPath -Force
        
        # Verify installation
        if (Get-Command go -ErrorAction SilentlyContinue) {
            Write-Host "Go installed successfully."
        } else {
            Write-Host "Go installation failed. Please install Go manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Go found."
    }
}

############################
# Patching NATS WebSocket URL to use ws:// for local development
############################

function Patch-NatsWebsocketUrl {
    Write-Host "Patching agent.go to use ws:// for NATS WebSocket..."
    
    # Print current working directory and list contents for debugging
    Write-Host "Current working directory: $(Get-Location)"
    
    # Find the agent.go file - use correct path
    $agentGoFile = "agent\agent.go"
    
    Write-Host "Checking for agent.go at path: $agentGoFile"
    if (-not (Test-Path $agentGoFile)) {
        Write-Host "ERROR: Cannot find $agentGoFile. Skipping NATS WebSocket URL patch." -ForegroundColor Red
        # Try to find agent.go using Get-ChildItem
        Write-Host "Attempting to locate agent.go:"
        Get-ChildItem -Path . -Filter "agent.go" -Recurse | Where-Object { $_.FullName -notmatch "test" }
        return $false
    }
    
    # Create a backup
    Copy-Item $agentGoFile "$agentGoFile.bak"
    
    # Read the file content
    $content = Get-Content $agentGoFile -Raw
    
    # Replace the wss:// with ws:// in the NATS WebSocket URL construction and hardcode port 8000
    $content = $content -replace 'natsServer = fmt.Sprintf\("wss://%s:%s", ac.APIURL, natsProxyPort\)', 'natsServer = fmt.Sprintf("ws://%s:8000/natsws", ac.APIURL)'
    
    # Also modify the URL construction when NatsStandardPort is set to use hardcoded port 8000
    $content = $content -replace 'natsServer = fmt.Sprintf\("nats://%s:%s", ac.APIURL, ac.NatsStandardPort\)', 'natsServer = fmt.Sprintf("ws://%s:8000/natsws", ac.APIURL)'
    
    # Write the modified content back to the file
    Set-Content -Path $agentGoFile -Value $content
    
    Write-Host "NATS WebSocket URL patch applied to $agentGoFile with hardcoded port 8000"
    
    # Show the diff to verify changes
    Write-Host "Showing diff of changes:"
    $original = Get-Content "$agentGoFile.bak" -Raw
    $modified = Get-Content $agentGoFile -Raw
    
    if ($original -ne $modified) {
        Write-Host "Changes detected in file."
    } else {
        Write-Host "No changes detected in file."
    }
    
    return $true
}

############################
# Patching GetInstalledSoftware method
############################

"@
                    $agentWindowsContent = $agentWindowsContent.Insert($methodEndPos + 1, $newMethod)
                    Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
                    Write-Host "Added GetInstalledSoftware method to agent_windows.go after existing method"
                } else {
                    Write-Host "ERROR: Could not find end of existing method in agent_windows.go" -ForegroundColor Red
                }
            } else {
                # If no existing method found, add it at the end of the file
                $newMethod = @"

// GetInstalledSoftware returns a list of installed software
func (a *Agent) GetInstalledSoftware() ([]win64api.Software, error) {
    return win64api.GetInstalledSoftware()
}
"@
                $agentWindowsContent += $newMethod
                Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
                Write-Host "Added GetInstalledSoftware method to the end of agent_windows.go"
            }
        } else {
            Write-Host "ERROR: Could not find Agent struct definition in agent_windows.go" -ForegroundColor Red
        }
    }
    
    # Fix rpc.go to use the GetInstalledSoftware method correctly
    $rpcContent = Get-Content $rpcGoFile -Raw
    
    # Replace any direct calls to win64api.GetInstalledSoftware() with a.GetInstalledSoftware()
    $rpcContent = $rpcContent -replace "win64api\.GetInstalledSoftware\(\)", "a.GetInstalledSoftware()"
    
    # Write the modified content back to the file
    Set-Content -Path $rpcGoFile -Value $rpcContent
    
    Write-Host "GetInstalledSoftware patch applied to agent_windows.go and rpc.go"
    
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
    
    if ([string]::IsNullOrEmpty($currVal)) {
        if (-not [string]::IsNullOrEmpty($DefaultVal)) {
            $userInp = Read-Host "$PromptMsg [$DefaultVal]"
            if ([string]::IsNullOrEmpty($userInp)) {
                $userInp = $DefaultVal
            }
        } else {
            $userInp = Read-Host "$PromptMsg"
        }
        Set-Variable -Name $VarName -Value $userInp -Scope Script
    }
}

############################
# Cloning/Patching/Building
############################

function Handle-ExistingFolder {
    # If BuildFolder already exists, check if it's a Git repo
    # If yes, do a fetch/pull
    # If no, prompt to remove or rename
    if (Test-Path $BuildFolder) {
        Write-Host "Folder '$BuildFolder' already exists."
        Push-Location $BuildFolder
        if (Test-Path ".git") {
            Write-Host "It appears to be a valid Git repository. Pulling latest changes..."
            git fetch --all
            git checkout $RMMAGENT_BRANCH
            git pull
        } else {
            Write-Host "But it isn't a Git repo (no .git folder)."
            Write-Host "We can either remove it or rename it so we can clone fresh."
            $removeChoice = Read-Host "Remove folder? (y/N)"
            if ($removeChoice -match "^[Yy]") {
                Pop-Location
                Remove-Item -Path $BuildFolder -Recurse -Force
                Write-Host "Removed folder. Now cloning fresh..."
                git clone --branch $RMMAGENT_BRANCH $RMMAGENT_REPO $BuildFolder
                Push-Location $BuildFolder
            } else {
                Write-Host "Aborting script. Please specify a different -BuildFolder or remove the folder manually." -ForegroundColor Red
                exit 1
            }
        }
    } else {
        Write-Host "Cloning $RMMAGENT_REPO into '$BuildFolder'..."
        git clone --branch $RMMAGENT_BRANCH $RMMAGENT_REPO $BuildFolder
        Push-Location $BuildFolder
    }
}

function Patch-Placeholders {
    Write-Host ""
    Write-Host "Patching code for org/email placeholders (if present)."
    
    # Get all .go files in the current directory
    $goFiles = Get-ChildItem -Path . -Filter "*.go" -File
    
    foreach ($file in $goFiles) {
        $content = Get-Content $file.FullName -Raw
        
        # Check if the file contains DefaultOrgName
        if ($content -match 'DefaultOrgName') {
            $content = $content -replace 'DefaultOrgName = ".*"', "DefaultOrgName = `"$OrgName`""
            Set-Content -Path $file.FullName -Value $content
        }
        
        # Check if the file contains DefaultEmail
        if ($content -match 'DefaultEmail') {
            $content = $content -replace 'DefaultEmail = ".*"', "DefaultEmail = `"$ContactEmail`""
            Set-Content -Path $file.FullName -Value $content
        }
    }
}

function Compile-RMMAgent {
    Write-Host ""
    Write-Host "Compiling rmmagent for Windows ARM64..."
    
    # Set environment variables for Go build
    $env:CGO_ENABLED = 0
    $env:GOOS = "windows"
    $env:GOARCH = "arm64"
    
    # Build the binary
    go build -ldflags "-s -w" -o $OUTPUT_BINARY
    
    Write-Host "Compilation done. Output: $(Get-Location)\$OUTPUT_BINARY"
    
    # Check if the file exists
    if (Test-Path $OUTPUT_BINARY) {
        Write-Host "Binary created successfully." -ForegroundColor Green
    } else {
        Write-Host "Failed to create binary." -ForegroundColor Red
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
    Write-Host "=== Build Complete ===" -ForegroundColor Green
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
        
        $cmd = ".\$OUTPUT_BINARY -m install -api `"$RmmServerUrl`" -auth `"$AgentAuthKey`" -client-id `"$ClientId`" -site-id `"$SiteId`" -agent-type `"$AgentType`" -log `"DEBUG`" -logto `"$AgentLogPath`" -nomesh"
        
        Write-Host "Running: $cmd"
        Invoke-Expression $cmd
        
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
    Write-Host "Your agent is at: $(Get-Location)\$OUTPUT_BINARY"
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
        Prompt-IfEmpty -VarName "ClientId" -PromptMsg "Client ID"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($SiteId)) {
        Prompt-IfEmpty -VarName "SiteId" -PromptMsg "Site ID"
    }
    if ($InteractiveMode -or [string]::IsNullOrEmpty($AgentType)) {
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

# 3) Clone & patch & build
Handle-ExistingFolder
Patch-NatsWebsocketUrl
Patch-GetInstalledSoftware
Patch-Placeholders
Compile-RMMAgent

# 4) Prompt to run (and configure service if installed)
Prompt-RunAgent

# Return to original directory
Pop-Location
function Patch-GetInstalledSoftware {
    Write-Host "Patching agent_windows.go and rpc.go to fix GetInstalledSoftware method..."
    
    # Find the agent_windows.go file
    $agentWindowsGoFile = "agent\agent_windows.go"
    $rpcGoFile = "agent\rpc.go"
    
    Write-Host "Checking for agent_windows.go at path: $agentWindowsGoFile"
    if (-not (Test-Path $agentWindowsGoFile)) {
        Write-Host "ERROR: Cannot find $agentWindowsGoFile. Skipping GetInstalledSoftware patch." -ForegroundColor Red
        return $false
    }
    
    Write-Host "Checking for rpc.go at path: $rpcGoFile"
    if (-not (Test-Path $rpcGoFile)) {
        Write-Host "ERROR: Cannot find $rpcGoFile. Skipping GetInstalledSoftware patch." -ForegroundColor Red
        return $false
    }
    
    # Create backups
    Copy-Item $agentWindowsGoFile "$agentWindowsGoFile.bak"
    Copy-Item $rpcGoFile "$rpcGoFile.bak"
    
    # Add GetInstalledSoftware method to Agent struct in agent_windows.go
    $agentWindowsContent = Get-Content $agentWindowsGoFile -Raw
    
    # Check if the file already has the GetInstalledSoftware method
    if ($agentWindowsContent -match "func \(a \*Agent\) GetInstalledSoftware\(\)") {
        Write-Host "GetInstalledSoftware method already exists in agent_windows.go. Skipping patch."
        
        # Even if method exists, check for syntax errors and fix them
        if ($agentWindowsContent -match "syntax error") {
            Write-Host "Found potential syntax errors in existing GetInstalledSoftware method. Attempting to fix..."
            
            # Find the method and replace it with a corrected version
            $pattern = "(?ms)func \(a \*Agent\) GetInstalledSoftware\(\).*?return win64api\.GetInstalledSoftware\(\).*?\}"
            
            # Create the replacement string without using a here-string
            $replacement = "`r`n// GetInstalledSoftware returns a list of installed software`r`nfunc (a *Agent) GetInstalledSoftware() ([]win64api.Software, error) {`r`n    return win64api.GetInstalledSoftware()`r`n}`r`n"
            
            $agentWindowsContent = $agentWindowsContent -replace $pattern, $replacement
            Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
            Write-Host "Fixed syntax in existing GetInstalledSoftware method"
        }
    } else {
        # Find the Agent struct definition
        if ($agentWindowsContent -match "type Agent struct {") {
            # Find an existing method of the Agent struct to insert our method after
            if ($agentWindowsContent -match "func \(a \*Agent\)") {
                # Find the end of an existing method
                $methodEndPos = $agentWindowsContent.IndexOf("}", $agentWindowsContent.IndexOf("func (a *Agent)"))
                if ($methodEndPos -gt 0) {
                    # Create the new method string without using a here-string
                    $newMethod = "`r`n`r`n// GetInstalledSoftware returns a list of installed software`r`nfunc (a *Agent) GetInstalledSoftware() ([]win64api.Software, error) {`r`n    return win64api.GetInstalledSoftware()`r`n}`r`n"
                    
                    $agentWindowsContent = $agentWindowsContent.Insert($methodEndPos + 1, $newMethod)
                    Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
                    Write-Host "Added GetInstalledSoftware method to agent_windows.go after existing method"
                } else {
                    Write-Host "ERROR: Could not find end of existing method in agent_windows.go" -ForegroundColor Red
                    
                    # Fallback: Add at the end of the file
                    $newMethod = "`r`n`r`n// GetInstalledSoftware returns a list of installed software`r`nfunc (a *Agent) GetInstalledSoftware() ([]win64api.Software, error) {`r`n    return win64api.GetInstalledSoftware()`r`n}`r`n"
                    
                    $agentWindowsContent += $newMethod
                    Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
                    Write-Host "Added GetInstalledSoftware method to the end of agent_windows.go (fallback)"
                }
            } else {
                # If no existing method found, add it at the end of the file
                $newMethod = "`r`n`r`n// GetInstalledSoftware returns a list of installed software`r`nfunc (a *Agent) GetInstalledSoftware() ([]win64api.Software, error) {`r`n    return win64api.GetInstalledSoftware()`r`n}`r`n"
                
                $agentWindowsContent += $newMethod
                Set-Content -Path $agentWindowsGoFile -Value $agentWindowsContent
                Write-Host "Added GetInstalledSoftware method to the end of agent_windows.go"
            }
        } else {
            Write-Host "ERROR: Could not find Agent struct definition in agent_windows.go" -ForegroundColor Red
        }
    }
    
    # Fix rpc.go to use the GetInstalledSoftware method correctly
    $rpcContent = Get-Content $rpcGoFile -Raw
    
    # Replace any direct calls to win64api.GetInstalledSoftware() with a.GetInstalledSoftware()
    $rpcContent = $rpcContent -replace "win64api\.GetInstalledSoftware\(\)", "a.GetInstalledSoftware()"
    
    # Write the modified content back to the file
    Set-Content -Path $rpcGoFile -Value $rpcContent
    
    Write-Host "GetInstalledSoftware patch applied to agent_windows.go and rpc.go"
    
    return $true
}
