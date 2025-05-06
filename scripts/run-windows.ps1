# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

param(
    [switch]$Help,
    [switch]$Silent,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RunArgs
)

# Required tools and their installation info
$REQUIRED_TOOLS = @{
    "kubectl" = @{
        "url" = "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
        "installPath" = "$env:ProgramFiles\openframe\kubectl\kubectl.exe"
    }
    "helm" = @{
        "url" = "https://get.helm.sh/helm-v3.14.0-windows-amd64.zip"
        "installPath" = "$env:ProgramFiles\openframe\helm\helm.exe"
    }
    "skaffold" = @{
        "url" = "https://storage.googleapis.com/skaffold/releases/latest/skaffold-windows-amd64.exe"
        "installPath" = "$env:ProgramFiles\openframe\skaffold\skaffold.exe"
    }
    "jq" = @{
        "url" = "https://github.com/stedolan/jq/releases/download/jq-1.6/jq-win64.exe"
        "installPath" = "$env:ProgramFiles\openframe\jq\jq.exe"
    }
    "telepresence" = @{
        "url" = "https://github.com/telepresenceio/telepresence/releases/download/v2.22.4/telepresence-windows-amd64.zip"
        "installPath" = "$env:ProgramFiles\openframe\telepresence\telepresence.exe"
    }
    "k3d" = @{
        "url" = "https://github.com/k3d-io/k3d/releases/latest/download/k3d-windows-amd64.exe"
        "installPath" = "$env:ProgramFiles\openframe\k3d\k3d.exe"
    }
}

# Function to check if GitHub token is set and valid
function Test-GitHubToken {
    if (-not $env:GITHUB_TOKEN_CLASSIC) {
        Write-Host "GitHub Personal Access Token (Classic) is required." -ForegroundColor Yellow
        Write-Host "This token needs repo and packages permissions." -ForegroundColor Yellow
        $token = Read-Host "Please enter your GitHub token" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
        $env:GITHUB_TOKEN_CLASSIC = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    }
}

# Function to check if a tool is installed
function Test-ToolInstalled {
    param (
        [string]$tool
    )
    $toolInfo = $REQUIRED_TOOLS[$tool]
    return Test-Path $toolInfo.installPath
}

# Function to install a tool
function Install-Tool {
    param (
        [string]$tool
    )

    try {
        $toolInfo = $REQUIRED_TOOLS[$tool]
        if ($tool -eq "helm" -or $tool -eq "telepresence") {
            $downloadPath = Join-Path $env:TEMP "$tool-download.zip"
        } else {
            $downloadPath = Join-Path $env:TEMP "$tool-download"
        }

        Write-Host "Downloading $tool..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $toolInfo.url -OutFile $downloadPath

        # Ensure destination directory exists
        $destDir = Split-Path $toolInfo.installPath
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        if ($tool -eq "helm") {
            Expand-Archive -Path $downloadPath -DestinationPath $env:TEMP -Force
            Move-Item -Path "$env:TEMP/windows-amd64/helm.exe" -Destination $toolInfo.installPath -Force
            Remove-Item -Path "$env:TEMP/windows-amd64" -Recurse
        }
        elseif ($tool -eq "telepresence") {
            Expand-Archive -Path $downloadPath -DestinationPath $destDir -Force
            Remove-Item -Path "$env:TEMP" -Recurse
        }
        else {
            Move-Item -Path $downloadPath -Destination $toolInfo.installPath -Force
        }

        Write-Host "$tool installed successfully" -ForegroundColor Green

        # Add tool directory to PATH if not present
        $toolDir = Split-Path $toolInfo.installPath
        $currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
        if (-not ($currentPath -split ';' | Where-Object { $_ -eq $toolDir })) {
            [Environment]::SetEnvironmentVariable("Path", $currentPath + ";" + $toolDir, [EnvironmentVariableTarget]::Machine)
            Write-Host "Added $toolDir to system PATH" -ForegroundColor Green
        }

        return $true
    }
    catch {
        Write-Host "Failed to install $tool" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Function to check if Chocolatey is installed
function Test-Chocolatey {
    try {
        $chocoVersion = choco -v
        return $true
    }
    catch {
        return $false
    }
}

# Function to install Chocolatey
function Install-Chocolatey {
    try {
        Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
        Write-Host "Chocolatey installed successfully!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Failed to install Chocolatey" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Function to configure loopback adapter
function Set-LoopbackAdapter {
    try {
        Write-Host "Setting up network for Kind cluster..." -ForegroundColor Cyan
        $ip = '192.168.100.100'
        $switchName = "OpenFrameSwitch"
        $vAdapterName = "vEthernet ($switchName)"

        # Remove the IP from Ethernet or Wi-Fi if present
        $badAdapters = Get-NetAdapter | Where-Object { $_.Name -match 'Ethernet|Wi-Fi' }
        foreach ($adapter in $badAdapters) {
            $badIP = Get-NetIPAddress -InterfaceAlias $adapter.Name -IPAddress $ip -ErrorAction SilentlyContinue
            if ($badIP) {
                Write-Host "Removing $ip from $($adapter.Name) to avoid affecting physical adapters..." -ForegroundColor Yellow
                Remove-NetIPAddress -InterfaceAlias $adapter.Name -IPAddress $ip -Confirm:$false
            }
        }

        # Check if the IP is already configured on the correct virtual adapter
        $existingIP = Get-NetIPAddress -InterfaceAlias $vAdapterName -IPAddress $ip -ErrorAction SilentlyContinue
        if ($existingIP) {
            Write-Host "IP address $ip is already configured on $vAdapterName" -ForegroundColor Green
            return $true
        }

        # Create a new internal virtual switch if it doesn't exist
        $virtualSwitch = Get-VMSwitch -Name $switchName -ErrorAction SilentlyContinue
        if (-not $virtualSwitch) {
            Write-Host "Creating new virtual switch '$switchName'..." -ForegroundColor Yellow
            New-VMSwitch -Name $switchName -SwitchType Internal -ErrorAction Stop
            Write-Host "Virtual switch created successfully" -ForegroundColor Green
        } else {
            Write-Host "Using existing virtual switch '$switchName'" -ForegroundColor Green
        }

        # Get the virtual network adapter associated with the switch
        $vAdapter = Get-NetAdapter -Name $vAdapterName -ErrorAction SilentlyContinue
        if (-not $vAdapter) {
            Write-Host "Virtual adapter $vAdapterName not found. Please check Hyper-V installation." -ForegroundColor Red
            return $false
        }

        # Configure IP on the virtual adapter
        Write-Host "Configuring IP address on $vAdapterName..." -ForegroundColor Yellow
        $netshResult = netsh interface ipv4 add address "$vAdapterName" $ip 255.255.255.0
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully configured IP on $vAdapterName" -ForegroundColor Green
            return $true
        } else {
            Write-Host "Failed to configure IP on $vAdapterName" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error configuring network: $_" -ForegroundColor Red
        return $false
    }
}

# Function to configure Docker
function Set-DockerConfiguration {
    Write-Host "Checking for Docker Desktop installation..." -ForegroundColor Cyan
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "Docker Desktop not found. Installing Docker Desktop with WSL2..." -ForegroundColor Yellow

        # Make sure WSL2 is enabled
        Write-Host "Ensuring WSL2 is enabled..." -ForegroundColor Cyan
        dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
        dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

        # Set WSL2 as default
        Write-Host "Setting WSL2 as default..." -ForegroundColor Cyan
        wsl --set-default-version 2

        # Install Docker Desktop
        choco install docker-desktop -y

        Write-Host "Docker Desktop installed successfully!" -ForegroundColor Green
        Write-Host "NOTE: You may need to restart your computer to complete the Docker installation." -ForegroundColor Yellow

        # Install Docker Buildx
        Write-Host "Installing Docker Buildx..." -ForegroundColor Cyan
        choco install docker-buildx -y

        $restartChoice = Read-Host "Do you want to restart your computer now? (Y/N)"
        if ($restartChoice -eq "Y" -or $restartChoice -eq "y") {
            Restart-Computer -Force
            exit
        }
    } else {
        Write-Host "Docker Desktop is already installed." -ForegroundColor Green
    }
}

# Setting up WSL configuration
function Setup-WSLConfig {
    Write-Host "Setting up WSL configuration..."
    Write-Host "Running in Windows environment"

    # Get total system memory in MB
    $totalMemoryBytes = [math]::Round((Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory)
    $totalMemoryMB = [math]::Round($totalMemoryBytes / 1MB)

    # Calculate values: 60% for memory, but at least 16GB total resources
    $memoryMB = [math]::Round(($totalMemoryMB / 5) * 3)
    $memoryGB = [math]::Round($memoryMB / 1024)

    if ($memoryGB -lt 16) {
        $swapGB = 16 - $memoryGB
    } else {
        $swapGB = 0
    }

    # Get Windows user profile path
    $winHome = $env:USERPROFILE
    $wslConfigPath = Join-Path -Path $winHome -ChildPath ".wslconfig"

    Write-Host "Creating WSL config file with memory=${memoryGB}GB and swap=${swapGB}GB..."

    # Get number of processors
    $numberOfProcessors = $env:NUMBER_OF_PROCESSORS

    # Create WSL configuration with calculated values
    $wslConfigContent = @"
[wsl2]
memory=${memoryGB}GB
processors=${numberOfProcessors}
swap=${swapGB}GB
"@

    # Write the content to the file
    Set-Content -Path $wslConfigPath -Value $wslConfigContent -Force

    Write-Host "Created WSL config at $wslConfigPath"
}

# Function to prevent system sleep
function Disable-SystemSleep {
    try {
        Write-Host "Configuring system power settings..." -ForegroundColor Yellow

        # Prevent sleep when plugged in
        powercfg /change standby-timeout-ac 0
        powercfg /change hibernate-timeout-ac 0
        powercfg /change disk-timeout-ac 0
        powercfg /change monitor-timeout-ac 0

        # Prevent sleep on battery (optional, but recommended for laptops)
        powercfg /change standby-timeout-dc 0
        powercfg /change hibernate-timeout-dc 0
        powercfg /change disk-timeout-dc 0
        powercfg /change monitor-timeout-dc 0

        Write-Host "System power settings configured to prevent sleep!" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Failed to configure power settings" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Show help information and exit if -Help is specified
if ($Help -and $RunArgs.Count -eq 0) {
    Write-Host @"
OpenFrame Installation Script
Usage: .\run-windows-1.ps1 [-Help] [-Silent] [COMMAND]

Options:
    -Help     Show this help message and exit
    -Silent   Run in silent mode (suppress non-essential output and skip confirmations)

Commands (passed to run.sh):
    bootstrap, b        Bootstrap whole cluster with all apps
    platform, p        Bootstrap platform only
    app, a [name]      Manage specific app
    cluster, k         Setup cluster
    pre               Run pre-checks
    swap, s           Setup swap
    delete, d         Delete cluster
    cleanup, c        Cleanup resources
    start             Start cluster
    stop              Stop cluster
    -h, --help        Show run.sh help message

Examples:
    .\run-windows-1.ps1 -Silent bootstrap     # Run bootstrap in silent mode
    .\run-windows-1.ps1 -Silent app nginx deploy    # Deploy nginx app in silent mode
    .\run-windows-1.ps1 platform              # Setup platform in interactive mode
    .\run-windows-1.ps1 -Help                # Show this help message
    .\run-windows-1.ps1 app -Help            # Show run.sh help message
"@
    exit 0
}

# Check if script is running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "This script requires administrator privileges. Restarting as admin..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

Write-Host "Starting OpenFrame installation process..." -ForegroundColor Green


#   Check for GitHub token first
# Always ask for GitHub token
$githubToken = Read-Host "Please enter your GitHub token (leave empty if not needed)"

$tokenCommand = ""
if (-not [string]::IsNullOrWhiteSpace($githubToken)) {
    $tokenCommand = "export GITHUB_TOKEN_CLASSIC='$githubToken'; "
    Write-Host "GitHub token will be set for this session." -ForegroundColor Green
}

# 1. Check/install Chocolatey
if (-not (Test-Chocolatey)) {
    if (-not (Install-Chocolatey)) {
        Write-Host "Failed to install Chocolatey. Exiting..." -ForegroundColor Red
        exit 1
    }
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}

# 2. Configure loopback adapter
if (-not (Set-LoopbackAdapter)) {
    Write-Host "Failed to configure loopback adapter. Continuing anyway..." -ForegroundColor Yellow
}

# 3. Configure Docker
Set-DockerConfiguration

Setup-WSLConfig

# 4. Prevent system sleep
if (-not (Disable-SystemSleep)) {
    Write-Host "Failed to configure power settings. Continuing anyway..." -ForegroundColor Yellow
}

# 5. Handle repository
$currentDir = Get-Location
$repoPath = $currentDir.Path
Write-Host "Working with repository at $repoPath..." -ForegroundColor Cyan

if (-not (Test-Path "$repoPath\.git")) {
    Write-Host "Current directory is not a Git repository." -ForegroundColor Yellow

    if ($Silent) {
        Write-Host "Cloning OpenFrame repository to current directory..." -ForegroundColor Yellow
        git clone https://github.com/openframe/openframe.git .
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." -ForegroundColor Red
            exit 1
        }
        Write-Host "OpenFrame repository cloned successfully!" -ForegroundColor Green
    }
    else {
        $cloneHere = Read-Host "Do you want to clone the OpenFrame repository in the current directory? (Y/N)"
        if ($cloneHere -eq "Y" -or $cloneHere -eq "y") {
            if ((Get-ChildItem -Path $repoPath | Measure-Object).Count -gt 0) {
                $forceClone = Read-Host "Warning: The current directory is not empty. Continue with cloning? (Y/N)"
                if (-not ($forceClone -eq "Y" -or $forceClone -eq "y")) {
                    Write-Host "Operation cancelled by user." -ForegroundColor Red
                    exit 1
                }
            }
            Write-Host "Cloning OpenFrame repository to current directory..." -ForegroundColor Yellow
            git clone https://github.com/openframe/openframe.git .
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." -ForegroundColor Red
                exit 1
            }
            Write-Host "OpenFrame repository cloned successfully!" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "Current directory is a Git repository." -ForegroundColor Green

    if ($Silent) {
        Write-Host "Pulling latest changes from the repository..." -ForegroundColor Cyan
        git pull
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully pulled latest changes." -ForegroundColor Green
        }
        else {
            Write-Host "Failed to pull changes. There might be conflicts or network issues." -ForegroundColor Yellow
        }
    }
    else {
        $pullChanges = Read-Host "Do you want to pull the latest changes? (Y/N)"
        if ($pullChanges -eq "Y" -or $pullChanges -eq "y") {
            Write-Host "Pulling latest changes from the repository..." -ForegroundColor Cyan
            git pull
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Successfully pulled latest changes." -ForegroundColor Green
            }
            else {
                Write-Host "Failed to pull changes. There might be conflicts or network issues." -ForegroundColor Yellow
            }
        }
    }
}

foreach ($tool in $REQUIRED_TOOLS.Keys) {
    if (-not (Test-ToolInstalled $tool)) {
        Install-Tool $tool
    }
}

# 6. Run run.sh in Git Bash
Write-Host "Searching for run.sh in the repository..." -ForegroundColor Cyan
$gitBashPath = "C:\Program Files\Git\bin\bash.exe"

# Search for run.sh in the repository
$runShFiles = Get-ChildItem -Path $repoPath -Filter "run.sh" -Recurse -ErrorAction SilentlyContinue

if ($runShFiles.Count -gt 0) {
    $scriptPath = $runShFiles[0].FullName
    Write-Host "Found run.sh at: $scriptPath" -ForegroundColor Green

    $scriptDir = Split-Path -Parent $scriptPath
    $scriptRelativePath = $scriptPath.Substring($repoPath.Length + 1).Replace("\", "/")

    if (Test-Path $gitBashPath) {
        Write-Host "Executing $scriptRelativePath with args: $RunArgs" -ForegroundColor Green


        # Set environment variables for silent mode
        $silentEnv = ""
        if ($Silent) {
            $silentEnv = @"
export OPENFRAME_SILENT=true;
export OPENFRAME_NONINTERACTIVE=true;
export OPENFRAME_AUTO_APPROVE=true;
"@
        }

        # Prepare run.sh arguments
        $runArgs = if ($RunArgs.Count -gt 0) { $RunArgs -join ' ' } else { '--help' }

        # Create a more interactive experience by opening a proper Git Bash window that stays open
        $bashArgs = "-c `"$tokenCommand $silentEnv cd '$repoPath' && { { ./$scriptRelativePath $runArgs; } || { echo -e '\n\n========== ERROR OCCURRED =========='; echo 'Review the errors above.'; }; }; echo -e '\n\nPress any key to close this window...'; read -n 1`""
        Start-Process -FilePath $gitBashPath -ArgumentList "--login", "-i", $bashArgs -Wait

        if (-not $Silent) {
            $confirmed = Read-Host "Press Enter when the Git Bash script has completed (or Ctrl+C to exit)"
        }
    } else {
        Write-Host "Git Bash not found at expected location." -ForegroundColor Red
        Write-Host "Please run the script manually by opening Git Bash and running:" -ForegroundColor Yellow
        Write-Host "cd '$repoPath' && ./$scriptRelativePath $runArgs" -ForegroundColor Yellow
    }
} else {
    Write-Host "No run.sh script found in the repository. Please check the repository structure." -ForegroundColor Red
}