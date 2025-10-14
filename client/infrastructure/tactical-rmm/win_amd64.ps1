#
# windows_amd64.ps1
#
# Purpose:
#   - Install Tactical RMM agent on Windows AMD64
#   - Uses native AMD64 binary
#   - Simple flow: check if installed, uninstall if yes, install from binary
#   - Automatically configures the agent to use ws:// protocol instead of wss:// for WebSockets
#
# Usage Examples:
#   1) Interactive mode:
#      .\windows_amd64.ps1
#   2) Provide all args:
#      .\windows_amd64.ps1 -RmmHost "rmm.example.com" -RmmPort 8000 -Secure -AuthKey "your-key" -ClientId "1" -SiteId "1" -AgentType "server"
#
# Requirements:
#   - Windows AMD64
#   - PowerShell 5.1 or higher
#   - Administrator privileges for installing dependencies and services
#

# Windows AMD64 Tactical RMM Agent Installer
# Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$OrgName = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ContactEmail = "",
    
    [Parameter(Mandatory=$false)]
    [string]$RmmServerUrl = "",
    
    [Parameter(Mandatory=$false)]
    [string]$AuthKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ClientId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SiteId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$AgentType = "workstation",
    
    [Parameter(Mandatory=$false)]
    [string]$BuildFolder = "rmmagent",
    
    [Parameter(Mandatory=$false)]
    [string]$NatsPort = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color,
        [switch]$NoNewLine
    )
    switch ($Color) {
        "Green" { $colorParam = "Green" }
        "Red" { $colorParam = "Red" }
        "Yellow" { $colorParam = "Yellow" }
        "Blue" { $colorParam = "Blue" }
        default { $colorParam = "White" }
    }
    if ($NoNewLine) {
        Write-Host $Message -ForegroundColor $colorParam -NoNewline
    } else {
        Write-Host $Message -ForegroundColor $colorParam
    }
}

# Ensure script is running with administrator privileges
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "This script requires administrator privileges. Please restart as administrator." -ForegroundColor Red
    exit 1
}

############################
# Functions
############################

function Get-SystemArchitecture {
    Write-Host "Detecting system architecture..." -ForegroundColor Yellow
    $architecture = (Get-WmiObject Win32_OperatingSystem).OSArchitecture
    Write-Host "System architecture: $architecture" -ForegroundColor Green
    
    # Handle different architecture string formats
    switch ($architecture) {
        "64-bit" { return "64-bit" }
        "ARM64" { return "ARM64" }
        "ARM 64-bit Processor" { return "ARM64" }
        default {
            Write-Host "Unsupported architecture: $architecture" -ForegroundColor Red
            exit 1
        }
    }
}

function Install-Software {
    param (
        [string]$SoftwareName,
        [string]$CommandName,
        [string]$VersionCommand,
        [string]$InstallPath,
        [string]$PathToAdd,
        [string]$DownloadUrl,
        [string]$InstallerArgs,
        [string]$InstallerType
    )

    Write-Host "=============== Installing $SoftwareName ===============" -ForegroundColor Cyan
    Write-Host "Download URL: $DownloadUrl"
    Write-Host "Installer Type: $InstallerType"
    Write-Host "Install Path: $InstallPath"
    Write-Host "Installer Args: $InstallerArgs"

    # Check if already installed
    Write-Host "Checking $SoftwareName installation..."
    try {
        $version = & $CommandName $VersionCommand
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$SoftwareName is already installed: $version" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "$SoftwareName is not installed or not in PATH" -ForegroundColor Yellow
    }

    # Download installer
    $installerName = $SoftwareName.ToLower().Replace(" ", "")
    $installer = Join-Path $env:TEMP "${installerName}_installer.$InstallerType"
    $logFile = Join-Path $env:TEMP "${installerName}_install.log"
    
    Write-Host "Downloading installer to: $installer"
    Write-Host "Installation log will be saved to: $logFile"
    
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $installer
        if (-not (Test-Path $installer)) {
            throw "Failed to download installer"
        }
    } catch {
        Write-Host "Failed to download installer: $_" -ForegroundColor Red
        return $false
    }

    # Install software
    Write-Host "Installing $SoftwareName..."
    try {
        if ($InstallerType -eq "msi") {
            $msiArgs = @(
                '/i',
                "`"$installer`"",
                '/quiet',
                '/l*v',
                "`"$logFile`""
            )
            $process = Start-Process msiexec.exe -ArgumentList $msiArgs -Wait -PassThru -Verb RunAs
            if ($process.ExitCode -ne 0) {
                Write-Host "Installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
                Write-Host "Installation log from ${logFile}:" -ForegroundColor Yellow
                if (Test-Path $logFile) {
                    Get-Content $logFile -Tail 10
                }
                return $false
            }
        } else {
            $process = Start-Process $installer -ArgumentList $InstallerArgs -Wait -PassThru -Verb RunAs
            if ($process.ExitCode -ne 0) {
                Write-Host "Installation failed with exit code: $($process.ExitCode)" -ForegroundColor Red
                return $false
            }
        }

        # Update PATH if needed
        if ($PathToAdd) {
            $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
            if ($currentPath -notlike "*$PathToAdd*") {
                Write-Host "Adding $PathToAdd to system PATH..."
                [System.Environment]::SetEnvironmentVariable("Path", $currentPath + ";$PathToAdd", "Machine")
            }
        }

        # Update current session's PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        # Verify installation
        Write-Host "Verifying installation..."
        Start-Sleep -Seconds 2  # Give the system time to update PATH
        try {
            $version = & $CommandName $VersionCommand
            if ($LASTEXITCODE -eq 0) {
                Write-Host "$SoftwareName installed successfully: $version" -ForegroundColor Green
                return $true
            } else {
                Write-Host "Installation verification failed" -ForegroundColor Red
                return $false
            }
        } catch {
            Write-Host "Installation verification failed: $_" -ForegroundColor Red
            return $false
        }
    } finally {
        # Cleanup
        if (Test-Path $installer) {
            Remove-Item $installer -Force
        }
    }
}

function Install-Go {
    $architecture = Get-SystemArchitecture
    
    # Select appropriate Go installer based on architecture
    $goUrl = switch ($architecture) {
        "64-bit" { "https://golang.org/dl/go1.21.6.windows-amd64.msi" }
        "ARM64" { "https://golang.org/dl/go1.21.6.windows-arm64.msi" }
        default {
            Write-Host "Unsupported architecture: $architecture" -ForegroundColor Red
            exit 1
        }
    }
    
    Install-Software -SoftwareName "Go" `
                    -CommandName "go" `
                    -VersionCommand "version" `
                    -InstallPath "C:\Go" `
                    -PathToAdd "C:\Go\bin" `
                    -DownloadUrl $goUrl `
                    -InstallerArgs "/quiet /norestart ADDLOCAL=ALL ALLUSERS=1" `
                    -InstallerType "msi"
}

function Install-Git {
    $architecture = Get-SystemArchitecture
    
    # Select appropriate Git installer based on architecture
    $gitUrl = switch ($architecture) {
        "64-bit" { "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe" }
        "ARM64" { "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-arm64.exe" }
        default {
            Write-Host "Unsupported architecture: $architecture" -ForegroundColor Red
            exit 1
        }
    }
    
    Install-Software -SoftwareName "Git" `
                    -CommandName "git" `
                    -VersionCommand "--version" `
                    -InstallPath "C:\Program Files\Git" `
                    -PathToAdd "" `
                    -DownloadUrl $gitUrl `
                    -InstallerArgs "/VERYSILENT /NORESTART /SUPPRESSMSGBOXES" `
                    -InstallerType "exe"
}

function Clone-Repository {
    param(
        [string]$RepoUrl,
        [string]$Branch,
        [string]$Folder
    )
    
    if (Test-Path $Folder) {
        Write-Host "Folder '$Folder' already exists. Updating..." -ForegroundColor Yellow
        Set-Location $Folder
        git fetch --all
        git checkout $Branch
        git pull
    } else {
        Write-Host "Cloning repository..." -ForegroundColor Yellow
        git clone --branch $Branch $RepoUrl $Folder
        Set-Location $Folder
    }
}

function Patch-NatsWebsocketUrl {
    param(
        [string]$RmmUrl,
        [string]$NatsPort
    )
    
    Write-Host "Patching NATS WebSocket URL..." -ForegroundColor Yellow
    $agentGoFile = "agent/agent.go"
    
    if (Test-Path $agentGoFile) {
        $content = Get-Content $agentGoFile -Raw
        
        # Extract host from RMM URL
        $uri = [System.Uri]$RmmUrl
        $rmmHost = $uri.Host
        
        # Set the NATS server URL using the RMM server host and provided NATS port
        $natsUrl = "ws://${rmmHost}:${NatsPort}/natsws"
        
        # Pattern 1: WebSocket secure pattern
        $wsPattern = 'natsServer = fmt.Sprintf\("wss://%s:%s", ac.APIURL, natsProxyPort\)'
        $wsMatches = [regex]::Matches($content, $wsPattern)
        if ($wsMatches.Count -gt 0) {
            Write-Host "`nFound WebSocket secure pattern in ${agentGoFile}:" -ForegroundColor Yellow
            foreach ($match in $wsMatches) {
                $lineNumber = [regex]::Matches($content.Substring(0, $match.Index), "`n").Count + 1
                Write-Host "Line $lineNumber - $($match.Value)" -ForegroundColor Yellow
            }
        }
        
        # Pattern 2: Standard NATS pattern
        $natsPattern = 'natsServer = fmt.Sprintf\("nats://%s:%s", ac.APIURL, ac.NatsStandardPort\)'
        $natsMatches = [regex]::Matches($content, $natsPattern)
        if ($natsMatches.Count -gt 0) {
            Write-Host "`nFound standard NATS pattern in ${agentGoFile}:" -ForegroundColor Yellow
            foreach ($match in $natsMatches) {
                $lineNumber = [regex]::Matches($content.Substring(0, $match.Index), "`n").Count + 1
                Write-Host "Line $lineNumber - $($match.Value)" -ForegroundColor Yellow
            }
        }
        
        # Perform the replacements
        $content = $content -replace $wsPattern, "natsServer = `"${natsUrl}`""
        $content = $content -replace $natsPattern, "natsServer = `"${natsUrl}`""
        
        Write-Host "`nReplacing with:" -ForegroundColor Yellow
        Write-Host "natsServer = `"${natsUrl}`"" -ForegroundColor Green
        
        Set-Content $agentGoFile $content
        
        Write-Host "`nNATS WebSocket URL patched successfully with: $natsUrl" -ForegroundColor Green
    } else {
        Write-Host "Warning: agent.go file not found." -ForegroundColor Red
    }
}

function Compile-Agent {
    Write-ColorMessage "Compiling agent..." "Yellow"
    $env:GOOS = "windows"
    $env:GOARCH = "amd64"
    go build -ldflags "-s -w" -o "rmmagent.exe"
    
    if (Test-Path "rmmagent.exe") {
        Write-ColorMessage "Agent compiled successfully." "Green"
    } else {
        Write-ColorMessage "Error: Agent compilation failed." "Red"
        exit 1
    }
}

function Install-Agent {
    param(
        [string]$RmmUrl,
        [string]$AuthKey,
        [string]$ClientId,
        [string]$SiteId,
        [string]$AgentType
    )
    
    Write-ColorMessage "Installing agent..." "Yellow"
    
    # Validate required parameters
    if ([string]::IsNullOrEmpty($AuthKey)) {
        Write-ColorMessage "Error: AuthKey is required" "Red"
        exit 1
    }
    
    # Get the full path to the agent executable from ProgramData
    $agentPath = Join-Path $env:ProgramData "TacticalRMM\rmmagent.exe"
    
    if (-not (Test-Path $agentPath)) {
        Write-ColorMessage "Error: Agent executable not found at: $agentPath" "Red"
        exit 1
    }
    
    Write-ColorMessage "Found agent executable at: $agentPath" "Green"
    
    # Create Program Files directory if it doesn't exist
    $programFilesDir = Join-Path $env:ProgramFiles "TacticalAgent"
    if (-not (Test-Path $programFilesDir)) {
        Write-ColorMessage "Creating Program Files directory: $programFilesDir" "Yellow"
        Write-ColorMessage "Executing command: New-Item -ItemType Directory -Path '$programFilesDir' -Force" "Blue"
        New-Item -ItemType Directory -Path $programFilesDir -Force | Out-Null
    }
    
    # Copy binary to Program Files with new name
    $targetPath = Join-Path $programFilesDir "tacticalrmm.exe"
    Write-ColorMessage "Copying binary to: $targetPath" "Yellow"
    Write-ColorMessage "Executing command: Copy-Item -Path '$agentPath' -Destination '$targetPath' -Force" "Blue"
    Copy-Item -Path $agentPath -Destination $targetPath -Force
    
    if (-not (Test-Path $targetPath)) {
        Write-ColorMessage "Error: Failed to copy binary to Program Files" "Red"
        exit 1
    }
    Write-ColorMessage "Successfully copied binary to Program Files" "Green"
    
    # Build the arguments array to match mac_arm64.sh exactly
    $args = @(
        "-m", "install",
        "-api", "`"$RmmUrl`"",
        "-auth", "`"$AuthKey`"",
        "-client-id", "`"$ClientId`"",
        "-site-id", "`"$SiteId`"",
        "-agent-type", "`"$AgentType`"",
        "-log", "`"DEBUG`"",
        "-nomesh",
        "/VERYSILENT",
        "/SUPPRESSMSGBOXES",
        "-silent"
    )
    
    Write-ColorMessage "Running agent installation with parameters..." "Yellow"
    Write-ColorMessage "RMM URL: $RmmUrl" "Yellow"
    Write-Host "Client ID: $ClientId" -ForegroundColor Yellow
    Write-Host "Site ID: $SiteId" -ForegroundColor Yellow
    Write-Host "Agent Type: $AgentType" -ForegroundColor Yellow
    Write-Host "Agent Path: $targetPath" -ForegroundColor Yellow
    
    # Convert arguments array to a single string
    $argsString = $args -join " "
    Write-ColorMessage "Full command: $targetPath $argsString" "Blue"
    
    # Start the process with the full path and arguments string
    Write-ColorMessage "Starting agent installation process..." "Yellow"
    Write-ColorMessage "Executing command: Start-Process -FilePath '$targetPath' -ArgumentList '$argsString' -Wait -NoNewWindow -PassThru" "Blue"
    $process = Start-Process -FilePath $targetPath -ArgumentList $argsString -Wait -NoNewWindow -PassThru
    
    Write-ColorMessage "Process exit code: $($process.ExitCode)" "Yellow"
    
    if ($process.ExitCode -ne 0) {
        Write-ColorMessage "Error: Agent installation failed with exit code $($process.ExitCode)" "Red"
        exit 1
    }
    
    # Wait for service to be created
    Write-ColorMessage "Waiting for service to be created..." "Yellow"
    $maxAttempts = 30
    $attempt = 0
    $serviceCreated = $false
    
    while (-not $serviceCreated -and $attempt -lt $maxAttempts) {
        Write-ColorMessage "Executing command: Get-Service -Name 'tacticalrmm' -ErrorAction SilentlyContinue" "Blue"
        $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
        if ($service) {
            $serviceCreated = $true
            Write-ColorMessage "Tactical RMM service was created successfully." "Green"
            Write-ColorMessage "Service status: $($service.Status)" "Yellow"
        } else {
            $attempt++
            Start-Sleep -Seconds 1
        }
    }
    
    if (-not $serviceCreated) {
        Write-ColorMessage "Error: Service was not created after $maxAttempts seconds" "Red"
        exit 1
    }
    
    # Try to start the service
    try {
        Write-ColorMessage "Attempting to start the service..." "Yellow"
        
        # Try to start the service using sc.exe
        Write-ColorMessage "Starting service using sc.exe..." "Yellow"
        Write-ColorMessage "Executing command: sc.exe start tacticalrmm" "Blue"
        $scResult = & sc.exe start tacticalrmm
        Write-ColorMessage "sc.exe result: $scResult" "Yellow"
        
        # Wait for service to start
        $startAttempts = 0
        $maxStartAttempts = 30
        $serviceStarted = $false
        
        while (-not $serviceStarted -and $startAttempts -lt $maxStartAttempts) {
            $service.Refresh()
            if ($service.Status -eq "Running") {
                $serviceStarted = $true
                Write-ColorMessage "Service started successfully." "Green"
            } else {
                $startAttempts++
                Start-Sleep -Seconds 1
            }
        }
        
        if (-not $serviceStarted) {
            Write-ColorMessage "Error: Service failed to start after $maxStartAttempts seconds" "Red"
            exit 1
        }
        
    } catch {
        Write-ColorMessage "Error: Could not start service: $_" "Red"
        exit 1
    }
    
    # Check if the agent executable was installed
    $installedPath = Join-Path $env:ProgramFiles "TacticalAgent\tacticalrmm.exe"
    if (Test-Path $installedPath) {
        Write-ColorMessage "Agent was installed successfully at: $installedPath" "Green"
    } else {
        Write-ColorMessage "Error: Agent executable not found at expected location: $installedPath" "Red"
        exit 1
    }
    
    Write-ColorMessage "Agent installation process completed successfully." "Green"
}

function Get-ValueIfEmpty {
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
    
    # Check for TacticalRMM registry key
    $tacticalRmmKey = "HKLM:\SOFTWARE\TacticalRMM"
    $registryExists = Test-Path $tacticalRmmKey
    
    if ($tacticalService -or $tacticalExeExists -or $tacticalExeX86Exists -or $registryExists) {
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
        
        if ($registryExists) {
            Write-Host "Found TacticalRMM registry key at: $tacticalRmmKey" -ForegroundColor Yellow
            try {
                $values = Get-ItemProperty -Path $tacticalRmmKey -ErrorAction SilentlyContinue
                if ($values) {
                    Write-Host "Registry values found:" -ForegroundColor Yellow
                    $values.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" } | ForEach-Object {
                        Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Yellow
                    }
                }
            } catch {
                Write-Host "Could not read registry values: $_" -ForegroundColor Yellow
            }
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
            Start-Sleep -Seconds 5
        }
    } catch {
        Write-Host "Warning: Could not stop service: ${_}" -ForegroundColor Yellow
    }
    
    # Kill any running tactical processes
    Write-Host "Terminating any running Tactical RMM processes..." -ForegroundColor Yellow
    Get-Process -Name "tacticalrmm" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "meshagent" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 3
    
    # Check for uninstaller and agent executable in Program Files
    $programFilesPath = "${env:ProgramFiles}"
    $programFilesX86Path = "${env:ProgramFiles(x86)}"
    
    $uninstallerPath = "$programFilesPath\TacticalAgent\unins000.exe"
    $uninstallerX86Path = "$programFilesX86Path\TacticalAgent\unins000.exe"
    $agentPath = "$programFilesPath\TacticalAgent\tacticalrmm.exe"
    $agentX86Path = "$programFilesX86Path\TacticalAgent\tacticalrmm.exe"
    
    # First try to run the agent's uninstall command if available
    if (Test-Path $agentPath) {
        Write-Host "Running agent uninstall command: & `"$agentPath`" -m uninstall -silent /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Yellow
        Start-Process -FilePath $agentPath -ArgumentList "-m uninstall -silent /VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
        Write-Host "Agent uninstall command completed." -ForegroundColor Green
        Start-Sleep -Seconds 10
    } elseif (Test-Path $agentX86Path) {
        Write-Host "Running agent uninstall command: & `"$agentX86Path`" -m uninstall -silent /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Yellow
        Start-Process -FilePath $agentX86Path -ArgumentList "-m uninstall -silent /VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
        Write-Host "Agent uninstall command completed." -ForegroundColor Green
        Start-Sleep -Seconds 10
    }
    
    # Then run the uninstaller if available
    if (Test-Path $uninstallerPath) {
        Write-Host "Running uninstaller: $uninstallerPath /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Yellow
        Start-Process -FilePath $uninstallerPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
        Write-Host "Uninstaller completed." -ForegroundColor Green
        Start-Sleep -Seconds 10
    } elseif (Test-Path $uninstallerX86Path) {
        Write-Host "Running uninstaller: $uninstallerX86Path /VERYSILENT /SUPPRESSMSGBOXES" -ForegroundColor Yellow
        Start-Process -FilePath $uninstallerX86Path -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
        Write-Host "Uninstaller completed." -ForegroundColor Green
        Start-Sleep -Seconds 10
    }
    
    # Finally, attempt manual cleanup
    Write-Host "Performing final cleanup..." -ForegroundColor Yellow
    
    # Try to remove service
    try {
        $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
        if ($service) {
            Write-Host "Stopping and removing Tactical RMM service..." -ForegroundColor Yellow
            # First stop the service
            Stop-Service -Name "tacticalrmm" -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            
            # Then remove it using sc.exe
            $scResult = & sc.exe delete "tacticalrmm"
            Write-Host "sc.exe delete result: $scResult" -ForegroundColor Yellow
            
            # Verify service is removed
            $service = Get-Service -Name "tacticalrmm" -ErrorAction SilentlyContinue
            if ($service) {
                Write-Host "Warning: Service still exists after removal attempt. Trying alternative method..." -ForegroundColor Yellow
                # Try alternative method using WMI
                $wmiService = Get-WmiObject -Class Win32_Service -Filter "Name='tacticalrmm'" -ErrorAction SilentlyContinue
                if ($wmiService) {
                    $wmiService.Delete()
                    Write-Host "Service removed using WMI method." -ForegroundColor Green
                }
            } else {
                Write-Host "Service removed successfully." -ForegroundColor Green
            }
            Start-Sleep -Seconds 5
        }
    } catch {
        Write-Host ("Warning: Could not remove service {0}: {1}" -f "tacticalrmm", $_.Exception.Message) -ForegroundColor Yellow
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
        
        if (Test-Path "$programFilesPath\Mesh Agent") {
            Write-Host "Removing $programFilesPath\Mesh Agent directory..." -ForegroundColor Yellow
            Remove-Item -Path "$programFilesPath\Mesh Agent" -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        if (Test-Path "$programFilesX86Path\Mesh Agent") {
            Write-Host "Removing $programFilesX86Path\Mesh Agent directory..." -ForegroundColor Yellow
            Remove-Item -Path "$programFilesX86Path\Mesh Agent" -Recurse -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host ("Warning: Could not remove directories {0}: {1}" -f $_, $_.Exception.Message) -ForegroundColor Yellow
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
        $meshExists = (Test-Path "$programFilesPath\Mesh Agent") -or (Test-Path "$programFilesX86Path\Mesh Agent")
        $processes = Get-Process -Name "tacticalrmm" -ErrorAction SilentlyContinue
        $meshProcesses = Get-Process -Name "meshagent" -ErrorAction SilentlyContinue

        if (-not $service -and -not $programFilesExists -and -not $programFilesX86Exists -and -not $meshExists -and -not $processes -and -not $meshProcesses) {
            $uninstallComplete = $true
            Write-Host "Uninstallation verified successfully." -ForegroundColor Green
        } else {
            Write-Host "Uninstallation verification attempt $attempt of $maxAttempts..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            $attempt++
        }
    }

    if (-not $uninstallComplete) {
        Write-Host "Warning: Could not verify complete uninstallation. Some components may still be present." -ForegroundColor Yellow
    }
    
    # Final wait after uninstallation
    Write-Host "Waiting for system to stabilize after uninstallation..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

function Remove-TacticalRMMCompletely {
    Write-Host "=== Performing aggressive cleanup of Tactical RMM components ===" -ForegroundColor Cyan
    
    # First try to run uninstall from installation directory
    $installDir = "${env:ProgramFiles}\TacticalAgent"
    $agentExe = Join-Path $installDir "tacticalrmm.exe"
    if (Test-Path $agentExe) {
        Write-Host "Found agent executable at: $agentExe" -ForegroundColor Yellow
        Write-Host "Running uninstall command..." -ForegroundColor Yellow
        Write-Host "Executing command: Start-Process -FilePath '$agentExe' -ArgumentList '-m uninstall -silent /VERYSILENT /SUPPRESSMSGBOXES' -Wait -NoNewWindow" -ForegroundColor Blue
        try {
            Start-Process -FilePath $agentExe -ArgumentList "-m uninstall -silent /VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
            Write-Host "Uninstall command completed." -ForegroundColor Green
            Start-Sleep -Seconds 10  # Wait for uninstall to complete
        } catch {
            Write-Host ("Warning: Could not run uninstall command: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    
    # Then remove the TacticalRMM registry key if it exists
    $tacticalRmmKey = "HKLM:\SOFTWARE\TacticalRMM"
    if (Test-Path $tacticalRmmKey) {
        Write-Host "Found TacticalRMM registry key: $tacticalRmmKey" -ForegroundColor Yellow
        try {
            # Get all values in the main key
            Write-Host "Executing command: Get-ItemProperty -Path '$tacticalRmmKey' -ErrorAction SilentlyContinue" -ForegroundColor Blue
            $values = Get-ItemProperty -Path $tacticalRmmKey -ErrorAction SilentlyContinue
            if ($values) {
                Write-Host "Found values in main key to remove:" -ForegroundColor Yellow
                $values.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" } | ForEach-Object {
                    Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Yellow
                }
            }

            # Get all subkeys
            Write-Host "Executing command: Get-ChildItem -Path '$tacticalRmmKey' -Recurse -ErrorAction SilentlyContinue" -ForegroundColor Blue
            $subkeys = Get-ChildItem -Path $tacticalRmmKey -Recurse -ErrorAction SilentlyContinue
            if ($subkeys) {
                Write-Host "Found subkeys to remove:" -ForegroundColor Yellow
                foreach ($subkey in $subkeys) {
                    Write-Host "  - $($subkey.PSPath)" -ForegroundColor Yellow
                    # Remove all values in subkey first
                    Write-Host "Executing command: Get-ItemProperty -Path '$($subkey.PSPath)' -ErrorAction SilentlyContinue" -ForegroundColor Blue
                    $subValues = Get-ItemProperty -Path $subkey.PSPath -ErrorAction SilentlyContinue
                    if ($subValues) {
                        $subValues.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" } | ForEach-Object {
                            Write-Host "    - Value: $($_.Name): $($_.Value)" -ForegroundColor Yellow
                            Write-Host "Executing command: Remove-ItemProperty -Path '$($subkey.PSPath)' -Name '$($_.Name)' -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
                            Remove-ItemProperty -Path $subkey.PSPath -Name $_.Name -Force -ErrorAction SilentlyContinue
                        }
                    }
                    # Remove the subkey
                    Write-Host "Executing command: Remove-Item -Path '$($subkey.PSPath)' -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
                    Remove-Item -Path $subkey.PSPath -Recurse -Force -ErrorAction SilentlyContinue
                }
            }

            # Remove all values in main key
            $values.PSObject.Properties | Where-Object { $_.Name -notlike "PS*" } | ForEach-Object {
                Write-Host "Executing command: Remove-ItemProperty -Path '$tacticalRmmKey' -Name '$($_.Name)' -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
                Remove-ItemProperty -Path $tacticalRmmKey -Name $_.Name -Force -ErrorAction SilentlyContinue
            }

            # Remove the main key itself
            Write-Host "Executing command: Remove-Item -Path '$tacticalRmmKey' -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
            Remove-Item -Path $tacticalRmmKey -Recurse -Force -ErrorAction SilentlyContinue
            
            # Verify removal
            if (Test-Path $tacticalRmmKey) {
                Write-Host "Warning: Registry key still exists after removal attempt. Trying alternative method..." -ForegroundColor Yellow
                # Try using reg.exe as alternative
                $regKeyPath = "HKLM\SOFTWARE\TacticalRMM"
                Write-Host "Executing command: reg.exe delete '$regKeyPath' /f" -ForegroundColor Blue
                & reg.exe delete $regKeyPath /f
                Start-Sleep -Seconds 2
                
                if (Test-Path $tacticalRmmKey) {
                    Write-Host "Error: Could not remove registry key completely." -ForegroundColor Red
                } else {
                    Write-Host "Successfully removed TacticalRMM registry key using alternative method." -ForegroundColor Green
                }
            } else {
                Write-Host "Successfully removed TacticalRMM registry key." -ForegroundColor Green
            }
            
            Start-Sleep -Seconds 5  # Wait for registry changes to take effect
        } catch {
            Write-Host ("Warning: Could not remove TacticalRMM registry key: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
            Write-Host "Attempting alternative removal method..." -ForegroundColor Yellow
            try {
                # Try using reg.exe as fallback
                $regKeyPath = "HKLM\SOFTWARE\TacticalRMM"
                Write-Host "Executing command: reg.exe delete '$regKeyPath' /f" -ForegroundColor Blue
                & reg.exe delete $regKeyPath /f
                Start-Sleep -Seconds 2
                
                if (-not (Test-Path $tacticalRmmKey)) {
                    Write-Host "Successfully removed TacticalRMM registry key using alternative method." -ForegroundColor Green
                }
            } catch {
                Write-Host ("Error: Alternative removal method failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
            }
        }
    }
    
    # Then try to run the uninstaller if it exists
    $uninstallerPath = "${env:ProgramFiles}\TacticalAgent\unins000.exe"
    if (Test-Path $uninstallerPath) {
        Write-Host "Running Tactical RMM uninstaller..." -ForegroundColor Yellow
        Write-Host "Executing command: Start-Process -FilePath '$uninstallerPath' -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES' -Wait -NoNewWindow" -ForegroundColor Blue
        try {
            Start-Process -FilePath $uninstallerPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES" -Wait -NoNewWindow
            Write-Host "Uninstaller completed." -ForegroundColor Green
            Start-Sleep -Seconds 10  # Wait for uninstaller to complete
        } catch {
            Write-Host ("Warning: Could not run uninstaller: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    
    # Stop and remove all related services
    $services = @(
        "tacticalrmm",
        "tacticalagent",
        "tacticalrpc",
        "checkrunner",
        "Mesh Agent"
    )
    
    foreach ($service in $services) {
        try {
            Write-Host "Executing command: Get-Service -Name '$service' -ErrorAction SilentlyContinue" -ForegroundColor Blue
            $svc = Get-Service -Name $service -ErrorAction SilentlyContinue
            if ($svc) {
                Write-Host "Stopping and removing service: $service" -ForegroundColor Yellow
                Write-Host "Executing command: Stop-Service -Name '$service' -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
                Stop-Service -Name $service -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
                Write-Host "Executing command: sc.exe delete '$service'" -ForegroundColor Blue
                & sc.exe delete $service
                Write-Host "Service $service removed." -ForegroundColor Green
            }
        } catch {
            Write-Host ("Warning: Could not remove service {0}: {1}" -f $service, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    
    # Kill any running processes
    $processes = @(
        "tacticalrmm",
        "tacticalagent",
        "meshagent"
    )
    
    foreach ($proc in $processes) {
        try {
            Write-Host "Executing command: Get-Process -Name '$proc' -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Blue
            Get-Process -Name $proc -ErrorAction SilentlyContinue | Stop-Process -Force
            Write-Host "Terminated process: $proc" -ForegroundColor Yellow
        } catch {
            Write-Host ("Warning: Could not terminate process {0}: {1}" -f $proc, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    
    # Remove files and directories
    $paths = @(
        "${env:ProgramFiles}\TacticalAgent",
        "${env:ProgramFiles(x86)}\TacticalAgent",
        "${env:ProgramFiles}\Mesh Agent",
        "${env:ProgramFiles(x86)}\Mesh Agent",
        "${env:ProgramData}\TacticalRMM",
        "${env:ProgramData}\Microsoft\Windows\Start Menu\Programs\Tactical RMM Agent"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            Write-Host "Removing directory: $path" -ForegroundColor Yellow
            Write-Host "Executing command: Remove-Item -Path '$path' -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
            Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Clean registry entries
    Write-Host "Cleaning registry entries..." -ForegroundColor Yellow
    
        # Then remove other registry entries
    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\*",
        "HKLM:\SYSTEM\CurrentControlSet\Services\tacticalrmm",
        "HKLM:\SYSTEM\CurrentControlSet\Services\tacticalagent",
        "HKLM:\SYSTEM\CurrentControlSet\Services\tacticalrpc",
        "HKLM:\SYSTEM\CurrentControlSet\Services\checkrunner",
        "HKLM:\SYSTEM\CurrentControlSet\Services\Mesh Agent"
    )
    
    Write-Host "Found registry keys to remove:" -ForegroundColor Yellow
    foreach ($regPath in $registryPaths) {
        if (Test-Path $regPath) {
            Write-Host "  - $regPath" -ForegroundColor Yellow
        }
    }
    
    foreach ($regPath in $registryPaths) {
        try {
            if (Test-Path $regPath) {
                Write-Host "Removing registry key: $regPath" -ForegroundColor Yellow
                Write-Host "Executing command: Remove-Item -Path '$regPath' -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
                Remove-Item -Path $regPath -Recurse -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Host ("Warning: Could not remove registry key {0}: {1}" -f $regPath, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    
    # Search for and remove any remaining Tactical RMM related registry entries
    Write-Host "Searching for remaining Tactical RMM registry entries..." -ForegroundColor Yellow
    $searchTerms = @("TacticalRMM", "TacticalAgent", "tacticalrmm", "tacticalagent")
    
    # Define specific registry locations to search
    $registryLocations = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\InProgress",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UpgradeCodes",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Components",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Patches",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Products",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Features",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\SourceList",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Subscriptions",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\Transforms",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Products",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Components",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Patches",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Features",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Installer\UserData\S-1-5-18\Transforms"
    )
    
    Write-Host "Searching in registry locations:" -ForegroundColor Yellow
    foreach ($location in $registryLocations) {
        Write-Host "  - $location" -ForegroundColor Yellow
    }
    
    foreach ($location in $registryLocations) {
        try {
            if (Test-Path $location) {
                foreach ($term in $searchTerms) {
                    Write-Host "Executing command: Get-ChildItem -Path '$location' -ErrorAction SilentlyContinue | Where-Object { `$_.PSPath -like '*$term*' }" -ForegroundColor Blue
                    $keys = Get-ChildItem -Path $location -ErrorAction SilentlyContinue | 
                           Where-Object { $_.PSPath -like "*$term*" }
                    
                    if ($keys) {
                        Write-Host "Found matching keys in $location for term '$term':" -ForegroundColor Yellow
                        foreach ($key in $keys) {
                            Write-Host "  - $($key.PSPath)" -ForegroundColor Yellow
                        }
                    }
                    
                    foreach ($key in $keys) {
                        Write-Host "Removing registry key: $($key.PSPath)" -ForegroundColor Yellow
                        Write-Host "Executing command: Remove-Item -Path '$($key.PSPath)' -Recurse -Force -ErrorAction SilentlyContinue" -ForegroundColor Blue
                        Remove-Item -Path $key.PSPath -Recurse -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        } catch {
            Write-Host ("Warning: Could not search/remove registry entries in {0}: {1}" -f $location, $_.Exception.Message) -ForegroundColor Yellow
        }
    }
    
    # Final verification
    Write-Host "Performing final verification..." -ForegroundColor Yellow
    $remaining = @()
    
    # Check services
    foreach ($service in $services) {
        Write-Host "Executing command: Get-Service -Name '$service' -ErrorAction SilentlyContinue" -ForegroundColor Blue
        if (Get-Service -Name $service -ErrorAction SilentlyContinue) {
            $remaining += "Service: $service"
        }
    }
    
    # Check processes
    foreach ($proc in $processes) {
        Write-Host "Executing command: Get-Process -Name '$proc' -ErrorAction SilentlyContinue" -ForegroundColor Blue
        if (Get-Process -Name $proc -ErrorAction SilentlyContinue) {
            $remaining += "Process: $proc"
        }
    }
    
    # Check directories
    foreach ($path in $paths) {
        Write-Host "Executing command: Test-Path '$path'" -ForegroundColor Blue
        if (Test-Path $path) {
            $remaining += "Directory: $path"
        }
    }
    
    # Check for TacticalRMM registry key
    Write-Host "Executing command: Test-Path '$tacticalRmmKey'" -ForegroundColor Blue
    if (Test-Path $tacticalRmmKey) {
        $remaining += "Registry Key: $tacticalRmmKey"
    }
    
    if ($remaining.Count -gt 0) {
        Write-Host "Warning: The following components could not be removed:" -ForegroundColor Yellow
        $remaining | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    } else {
        Write-Host "All Tactical RMM components have been removed successfully." -ForegroundColor Green
    }
    
    # Final wait
    Write-Host "Waiting for system to stabilize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

function Show-Help {
    [CmdletBinding()]
    param()
    
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "Windows AMD64 Tactical RMM Agent Installer" -ForegroundColor Cyan
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script installs the Tactical RMM agent on Windows AMD64 systems."
    Write-Host "It uses the native AMD64 binary."
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\windows_amd64.ps1 -Help"
    Write-Host "  .\windows_amd64.ps1 [parameters]"
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -RmmHost        Hostname or IP of the RMM server"
    Write-Host "  -NatsPort       NATS WebSocket port (required)"
    Write-Host "  -Secure         Use HTTPS/WSS for secure connection"
    Write-Host "  -AuthKey        Authentication key for the RMM server"
    Write-Host "  -ClientId       Client ID"
    Write-Host "  -SiteId         Site ID"
    Write-Host "  -AgentType      Agent type (workstation/server)"
    Write-Host "  -Help           Display this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  # Show help:"
    Write-Host "  .\windows_amd64.ps1 -Help"
    Write-Host ""
    Write-Host "  # Non-interactive mode with all parameters:"
    Write-Host "  .\windows_amd64.ps1 -RmmHost 'rmm.example.com' -NatsPort 8000 -AuthKey 'your-auth-key' -ClientId 1 -SiteId 1 -AgentType 'server'"
    Write-Host ""
    Write-Host "Note: This script requires administrator privileges." -ForegroundColor Red
    Write-Host "=========================================================" -ForegroundColor Cyan
    exit 0
}

function Remove-ExistingBuildFolder {
    param(
        [string]$Folder
    )
    
    if (Test-Path $Folder) {
        Write-ColorMessage "Removing existing build folder: $Folder" "Yellow"
        Remove-Item -Path $Folder -Recurse -Force
        Write-ColorMessage "Build folder removed successfully." "Green"
    }
}

function Patch-AgentCode {
    Write-ColorMessage "Patching agent code..." "Yellow"
    
    # Get all .go files in the current directory
    $goFiles = Get-ChildItem -Path . -Filter "*.go" -File
    
    foreach ($file in $goFiles) {
        Write-ColorMessage "Checking file: $($file.Name)" "Yellow"
        
        # Read the file content
        $content = Get-Content $file.FullName -Raw
        
        # Check and replace DefaultOrgName
        if ($content -match 'DefaultOrgName = ".*"') {
            Write-ColorMessage "Found DefaultOrgName in $($file.Name)" "Yellow"
            $content = $content -replace 'DefaultOrgName = ".*"', "DefaultOrgName = `"$OrgName`""
            Write-ColorMessage "Replaced DefaultOrgName with: $OrgName" "Green"
        }
        
        # Check and replace DefaultEmail
        if ($content -match 'DefaultEmail = ".*"') {
            Write-ColorMessage "Found DefaultEmail in $($file.Name)" "Yellow"
            $content = $content -replace 'DefaultEmail = ".*"', "DefaultEmail = `"$ContactEmail`""
            Write-ColorMessage "Replaced DefaultEmail with: $ContactEmail" "Green"
        }

        # If this is main.go, patch the log level
        if ($file.Name -eq "main.go") {
            Write-ColorMessage "Found main.go, checking for log level configuration..." "Yellow"
            
            # Pattern to match the entire setupLogging function
            $setupLoggingPattern = 'func setupLogging\(level, to \*string\) \{[\s\S]*?ll, err := logrus\.ParseLevel\(\*level\)[\s\S]*?if err != nil \{[\s\S]*?ll = logrus\.InfoLevel[\s\S]*?\}[\s\S]*?log\.SetLevel\(ll\)'
            
            $setupLoggingMatches = [regex]::Matches($content, $setupLoggingPattern)
            if ($setupLoggingMatches.Count -gt 0) {
                Write-Host "`nFound setupLogging function in main.go:" -ForegroundColor Yellow
                foreach ($match in $setupLoggingMatches) {
                    $lineNumber = [regex]::Matches($content.Substring(0, $match.Index), "`n").Count + 1
                    Write-Host "Starting at Line $lineNumber" -ForegroundColor Yellow
                    Write-Host $match.Value -ForegroundColor Yellow
                }
                
                # New setupLogging implementation that directly sets debug level
                $newSetupLogging = @'
func setupLogging(level, to *string) {
    // Always set debug level
    log.SetLevel(logrus.DebugLevel)
'@
                
                Write-Host "`nReplacing with:" -ForegroundColor Yellow
                Write-Host $newSetupLogging -ForegroundColor Green
                
                $content = $content -replace $setupLoggingPattern, $newSetupLogging
                Write-Host "`nSetupLogging function updated to always use DEBUG level" -ForegroundColor Green
            }

            # Keep the rest of the setupLogging function (output configuration) unchanged
            Write-ColorMessage "Log level patching completed" "Green"
        }
        
        # Write the modified content back to the file
        Set-Content -Path $file.FullName -Value $content
        Write-ColorMessage "Updated $($file.Name)" "Green"
    }
}

############################
# Default / Config
############################

$OUTPUT_BINARY = "rmmagent-windows-amd64.exe"
$AMD64_BINARY = "tacticalagent-v2.9.0-windows-amd64.exe"
$AMD64_BINARY_PATH = Join-Path (Split-Path -Parent $PSCommandPath) "binaries\$AMD64_BINARY"

# We'll store user-provided or prompted values in these variables:
$script:RmmHost = if ([string]::IsNullOrEmpty($RmmHost) -or $RmmHost -eq $true -or $RmmHost -eq "True") { "" } else { $RmmHost }
$script:RmmPort = if ($RmmPort -eq 0) { 8000 } else { $RmmPort }
$script:Secure = $Secure
$script:AuthKey = if ([string]::IsNullOrEmpty($AuthKey) -or $AuthKey -eq $true -or $AuthKey -eq "True") { "" } else { $AuthKey }

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
    Write-ColorMessage "`nTactical RMM Agent Installation Started" "Green"
    Write-ColorMessage "======================================" "Green"

    # Store the original directory
    $originalDir = Get-Location

    # Check for existing installation and perform thorough cleanup if found
    if (Check-TacticalInstalled) {
        Write-ColorMessage "Existing installation found. Performing thorough cleanup..." "Yellow"
        Remove-TacticalRMMCompletely
        Start-Sleep -Seconds 10  # Wait for cleanup to complete
    }

    # Install dependencies
    Install-Go
    Install-Git

    # Remove any existing build folder
    Remove-ExistingBuildFolder -Folder $BuildFolder

    # Clone repository
    Clone-Repository -RepoUrl "https://github.com/amidaware/rmmagent.git" -Branch "master" -Folder $BuildFolder

    # Validate NATS port is provided
    if ([string]::IsNullOrEmpty($NatsPort)) {
        Write-ColorMessage "Error: NATS port is required. Please provide -NatsPort parameter." "Red"
        exit 1
    }

    # Patch NATS WebSocket URL with the RMM server URL and NATS port
    Patch-NatsWebsocketUrl -RmmUrl $RmmServerUrl -NatsPort $NatsPort

    # Patch agent code (org name, email, and log level)
    Patch-AgentCode

    # Compile agent
    Compile-Agent

    # Create ProgramData directory if it doesn't exist
    $programDataDir = Join-Path $env:ProgramData "TacticalRMM"
    if (-not (Test-Path $programDataDir)) {
        New-Item -ItemType Directory -Path $programDataDir -Force | Out-Null
        Write-ColorMessage "Created ProgramData directory: $programDataDir" "Green"
    }

    # Copy the compiled binary to ProgramData
    $sourceBinary = Join-Path (Get-Location) "rmmagent.exe"
    $targetBinary = Join-Path $programDataDir "rmmagent.exe"
    if (Test-Path $sourceBinary) {
        Copy-Item -Path $sourceBinary -Destination $targetBinary -Force
        Write-ColorMessage "Copied binary to: $targetBinary" "Green"
    } else {
        Write-ColorMessage "Error: Compiled binary not found at: $sourceBinary" "Red"
        exit 1
    }

    # Return to original directory
    Set-Location $originalDir

    # Clean up the build folder
    if (Test-Path $BuildFolder) {
        Write-ColorMessage "Cleaning up build folder..." "Yellow"
        Remove-Item -Path $BuildFolder -Recurse -Force
        Write-ColorMessage "Build folder cleaned up successfully." "Green"
    }

    # Install agent if not skipping
    if (-not $SkipRun) {
        # Validate required parameters
        if ([string]::IsNullOrEmpty($AuthKey)) {
            Write-ColorMessage "Error: AuthKey is required" "Red"
            exit 1
        }

        Write-ColorMessage "Installing agent with parameters:" "Yellow"
        Write-ColorMessage "RMM URL: $RmmServerUrl" "Yellow"
        Write-ColorMessage "Auth Key: $AuthKey" "Yellow"
        Write-ColorMessage "Client ID: $ClientId" "Yellow"
        Write-ColorMessage "Site ID: $SiteId" "Yellow"
        Write-ColorMessage "Agent Type: $AgentType" "Yellow"
        
        # Pass the parameters directly to Install-Agent
        Install-Agent -RmmUrl $RmmServerUrl -AuthKey $AuthKey -ClientId $ClientId -SiteId $SiteId -AgentType $AgentType
    }

    Write-ColorMessage "`nInstallation completed successfully!" "Green"
    Write-ColorMessage "Agent binary location: $targetBinary" "Green"
    
    # Add log monitoring instructions
    $agentLogPath = Join-Path $env:ProgramFiles "TacticalAgent\agent.log"
    Write-ColorMessage "`nTo monitor the agent log in real-time, run one of these commands in PowerShell:" "Yellow"
    Write-ColorMessage "Option 1 (PowerShell):" "Blue"
    Write-ColorMessage "    Get-Content -Path '$agentLogPath' -Wait" "White"
    Write-ColorMessage "Option 2 (PowerShell, last 50 lines):" "Blue"
    Write-ColorMessage "    Get-Content -Path '$agentLogPath' -Tail 50 -Wait" "White"
    Write-ColorMessage "Option 3 (Command Prompt):" "Blue"
    Write-ColorMessage "    type '$agentLogPath'" "White"
}
catch {
    Write-ColorMessage "`nInstallation Failed:" "Red"
    Write-ColorMessage "Error: $($_.Exception.Message)" "Red"
    Write-ColorMessage "Stack Trace: $($_.Exception.StackTrace)" "Red"
    exit 1
}
