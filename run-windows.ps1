# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

# Function to reliably set up virtual adapter with the required IP
function Set-KindLoopbackAdapter {
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

# Function to cleanup network configuration
function Remove-KindNetwork {
    Write-Host "Cleaning up network configuration..." -ForegroundColor Cyan

    try {
        # Remove the IP address if it exists
        $existingIP = Get-NetIPAddress -IPAddress "192.168.100.100" -ErrorAction SilentlyContinue
        if ($existingIP) {
            Remove-NetIPAddress -IPAddress "192.168.100.100" -Confirm:$false
            Write-Host "Removed IP configuration" -ForegroundColor Green
        }

        # Remove the virtual switch if it exists
        $switchName = "OpenFrameSwitch"
        $virtualSwitch = Get-VMSwitch -Name $switchName -ErrorAction SilentlyContinue
        if ($virtualSwitch) {
            Remove-VMSwitch -Name $switchName -Force
            Write-Host "Removed virtual switch" -ForegroundColor Green
        }
    } catch {
        Write-Host "Error during cleanup: $_" -ForegroundColor Red
    }
}

# Function to perform a complete Docker restart
function Restart-DockerDesktop {
    Write-Host "Restarting Docker Desktop..." -ForegroundColor Cyan

    # First, try to gracefully stop Docker Desktop
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerProcess) {
        Write-Host "Stopping Docker Desktop gracefully..." -ForegroundColor Yellow
        $dockerProcess | Stop-Process -Force
        Start-Sleep -Seconds 5
    }

    # Force kill any remaining Docker processes
    Get-Process | Where-Object {$_.Name -like "*docker*"} | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3

    # Start Docker Desktop again
    Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
    Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

    # Wait for Docker to start
    Write-Host "Waiting for Docker to initialize (this may take several minutes)..." -ForegroundColor Yellow
    $retryCount = 0
    $maxRetries = 12 # 2 minutes
    $dockerRunning = $false

    while ($retryCount -lt $maxRetries -and -not $dockerRunning) {
        $retryCount++
        Write-Host "Checking if Docker is ready... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 10

        try {
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "Docker is now running properly." -ForegroundColor Green
            }
        } catch {
            # Continue waiting
        }
    }

    if (-not $dockerRunning) {
        Write-Host "WARNING: Docker may not be running properly after restart attempts." -ForegroundColor Red
        return $false
    }

    return $true
}
# Function to check Docker status
function Test-DockerStatus {
    Write-Host "Checking Docker status..." -ForegroundColor Cyan

    # Check if Docker Desktop is installed
    $dockerDesktop = Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue
    if (-not $dockerDesktop) {
        Write-Host "Docker Desktop is not running." -ForegroundColor Yellow
        Write-Host "Starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
        Write-Host "Waiting for Docker to start (this may take a few minutes)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }

    # Check if Docker engine is responsive
    $retryCount = 0
    $maxRetries = 6
    $dockerRunning = $false

    while ($retryCount -lt $maxRetries -and -not $dockerRunning) {
        try {
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "Docker is running properly." -ForegroundColor Green
            }
        }
        catch {
            Write-Host "Waiting for Docker to be ready... (Attempt $($retryCount + 1)/$maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            $retryCount++
        }
    }

    if (-not $dockerRunning) {
        Write-Host "ERROR: Docker is not running properly after multiple attempts." -ForegroundColor Red
        Write-Host "Attempting to restart Docker Desktop..." -ForegroundColor Yellow

        if (Restart-DockerDesktop) {
            Write-Host "Docker restart successful! Checking status again..." -ForegroundColor Green
            $result = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                $dockerRunning = $true
                Write-Host "Docker is now running properly after restart." -ForegroundColor Green
            } else {
                Write-Host "Docker is still not responding properly after restart." -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "Failed to restart Docker. Please try manually restarting Docker Desktop." -ForegroundColor Red
            return $false
        }
    }

    return $true
}

# Function to enable Kubernetes in Docker Desktop
function Enable-Kubernetes {
    Write-Host "Attempting to enable Kubernetes in Docker Desktop..." -ForegroundColor Cyan
    
    try {
        $settingsPath = "$env:USERPROFILE\AppData\Roaming\Docker\settings.json"
        
        # Read current settings
        $settings = Get-Content $settingsPath -ErrorAction Stop | ConvertFrom-Json
        
        # Check if we need to modify settings
        $settingsChanged = $false
        
        # Create kubernetes object if it doesn't exist
        if (-not $settings.PSObject.Properties['kubernetes']) {
            $settings | Add-Member -Type NoteProperty -Name 'kubernetes' -Value @{}
        }
        
        # Enable Kubernetes
        if (-not ($settings.kubernetes.PSObject.Properties['enabled'] -and $settings.kubernetes.enabled)) {
            $settings.kubernetes | Add-Member -Type NoteProperty -Name 'enabled' -Value $true -Force
            $settingsChanged = $true
        }

        # Create extensions object if it doesn't exist
        if (-not $settings.PSObject.Properties['extensions']) {
            $settings | Add-Member -Type NoteProperty -Name 'extensions' -Value @{}
        }

        # Create kubernetes object in extensions if it doesn't exist
        if (-not $settings.extensions.PSObject.Properties['kubernetes']) {
            $settings.extensions | Add-Member -Type NoteProperty -Name 'kubernetes' -Value @{}
        }
    } catch {
        Write-Host "Error modifying Docker Desktop settings: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        return $false
    }
}

# Function to remove Kind network configuration
function Remove-KindNetwork {
    Write-Host "Removing Kind cluster network configuration..." -ForegroundColor Cyan
    
    try {
        $existingIP = Get-NetIPAddress -IPAddress "192.168.0.23" -ErrorAction SilentlyContinue
        
        if ($existingIP) {
            Remove-NetIPAddress -IPAddress "192.168.0.23" -Confirm:$false
            Write-Host "Removed Kind cluster IP configuration." -ForegroundColor Green
        }
    } catch {
        Write-Host "Error removing network configuration: $_" -ForegroundColor Yellow
    }
}

# Add this to your existing cleanup code
function Cleanup-Environment {
    Write-Host "Cleaning up environment..." -ForegroundColor Cyan
    
    # Remove Kind cluster if it exists
    $kindCluster = $(kind get clusters 2>&1)
    if ($LASTEXITCODE -eq 0 -and $kindCluster -contains "kind") {
        Write-Host "Removing existing Kind cluster..." -ForegroundColor Yellow
        kind delete cluster
        Remove-Item -Path "/tmp/control-plane", "/tmp/worker1", "/tmp/worker2", "/tmp/worker3" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Remove network configuration
    Remove-KindNetwork
}

# Check if script is running as administrator, if not, restart as admin
if (-not (Test-Administrator)) {
    Write-Host "This script requires administrator privileges. Restarting as admin..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    Exit
}

Write-Host "Starting OpenFrame installation process..." -ForegroundColor Green

# 1. Check/install Chocolatey
Write-Host "Checking for Chocolatey installation..." -ForegroundColor Cyan
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Chocolatey not found. Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Chocolatey installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Chocolatey is already installed." -ForegroundColor Green
}

# 2. Check/install Git CLI
Write-Host "Checking for Git installation..." -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Installing Git..." -ForegroundColor Yellow
    choco install git -y

    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "Git installed successfully!" -ForegroundColor Green
} else {
    Write-Host "Git is already installed." -ForegroundColor Green
}

# 3. Check/install Docker Desktop with WSL2
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

    $restartChoice = Read-Host "Do you want to restart your computer now? (Y/N)"
    if ($restartChoice -eq "Y" -or $restartChoice -eq "y") {
        Restart-Computer -Force
        exit
    }
} else {
    Write-Host "Docker Desktop is already installed." -ForegroundColor Green
}

# 4. Configure network for Kind cluster and create Kind cluster (before any kubectl checks)
if (-not (Set-KindLoopbackAdapter)) {
    Write-Host "Failed to configure IP for Kind cluster." -ForegroundColor Red
    Write-Host "Will attempt to continue with the installation..." -ForegroundColor Yellow
} else {
    # Check if Kind cluster already exists
    $kindClusters = kind get clusters 2>&1
    if ($LASTEXITCODE -eq 0 -and $kindClusters -match "kind") {
        Write-Host "Kind cluster already exists. Skipping creation." -ForegroundColor Green
    } else {
        Write-Host "No Kind cluster found. Creating a new Kind cluster..." -ForegroundColor Yellow
        # Prompt for config file and version
        $defaultConfig = Join-Path $repoPath "kind-cluster\deploy\kind\cluster.template.yaml"
        $defaultVersion = "v1.32.3"
        $configFile = Read-Host "Enter path to Kind cluster config file [`$defaultConfig`]"
        if ([string]::IsNullOrWhiteSpace($configFile)) { $configFile = $defaultConfig }
        $kindVersion = Read-Host "Enter Kind node image version [`$defaultVersion`]"
        if ([string]::IsNullOrWhiteSpace($kindVersion)) { $kindVersion = $defaultVersion }

        # Create the cluster
        kind create cluster --config "$configFile" --image kindest/node:$kindVersion
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Kind cluster created successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to create Kind cluster. Please check the config file and try again." -ForegroundColor Red
        }
    }
}

# 5. Handle repository
# Use the current directory where the script is running
$currentDir = Get-Location
$repoPath = $currentDir.Path

Write-Host "Working with repository at $repoPath..." -ForegroundColor Cyan

# Check if the current directory is a git repository
if (-not (Test-Path "$repoPath\.git")) {
    Write-Host "Current directory is not a Git repository." -ForegroundColor Yellow

    # Ask user if they want to clone the repo here or specify a different location
    $cloneHere = Read-Host "Do you want to clone the OpenFrame repository in the current directory? (Y/N)"

    if ($cloneHere -eq "Y" -or $cloneHere -eq "y") {
        # If directory is not empty, warn the user
        if ((Get-ChildItem -Path $repoPath | Measure-Object).Count -gt 0) {
            $forceClone = Read-Host "Warning: The current directory is not empty. Continue with cloning? (Y/N)"
            if (-not ($forceClone -eq "Y" -or $forceClone -eq "y")) {
                Write-Host "Operation cancelled by user." -ForegroundColor Red
                exit 1
            }
        }

        # Clone the repository to the current directory
        Write-Host "Cloning OpenFrame repository to current directory..." -ForegroundColor Yellow
        git clone https://github.com/openframe/openframe.git .

        if ($LASTEXITCODE -eq 0) {
            Write-Host "OpenFrame repository cloned successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." -ForegroundColor Red
            exit 1
        }
    } else {
        # Ask for custom path
        $customPath = Read-Host "Please enter the full path where you want to clone the repository"

        if (-not (Test-Path $customPath)) {
            $createDir = Read-Host "Directory does not exist. Create it? (Y/N)"
            if ($createDir -eq "Y" -or $createDir -eq "y") {
                New-Item -ItemType Directory -Path $customPath -Force | Out-Null
            } else {
                Write-Host "Operation cancelled by user." -ForegroundColor Red
                exit 1
            }
        }

        # Clone the repository to the specified directory
        Write-Host "Cloning OpenFrame repository to $customPath..." -ForegroundColor Yellow
        git clone https://github.com/openframe/openframe.git $customPath

        if ($LASTEXITCODE -eq 0) {
            Write-Host "OpenFrame repository cloned successfully!" -ForegroundColor Green
            $repoPath = $customPath
        } else {
            Write-Host "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "Current directory is a Git repository." -ForegroundColor Green

    # Ask if user wants to pull latest changes
    $pullChanges = Read-Host "Do you want to pull the latest changes? (Y/N)"
    if ($pullChanges -eq "Y" -or $pullChanges -eq "y") {
        Write-Host "Pulling latest changes from the repository..." -ForegroundColor Cyan
        git pull

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully pulled latest changes." -ForegroundColor Green
        } else {
            Write-Host "Failed to pull changes. There might be conflicts or network issues." -ForegroundColor Yellow
        }
    }
}

# 4. Check/install Docker Desktop with WSL2
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

    $restartChoice = Read-Host "Do you want to restart your computer now? (Y/N)"
    if ($restartChoice -eq "Y" -or $restartChoice -eq "y") {
        Restart-Computer -Force
        exit
    }
} else {
    Write-Host "Docker Desktop is already installed." -ForegroundColor Green
}

# 6. Find and run the run-windows-wrapper.sh script using Git Bash
Write-Host "Searching for run-windows-wrapper.sh in the repository..." -ForegroundColor Cyan
$gitBashPath = "C:\Program Files\Git\bin\bash.exe"

# Search for run-windows-wrapper.sh in the repository
$runShFiles = Get-ChildItem -Path $repoPath -Filter "run-windows-wrapper.sh" -Recurse -ErrorAction SilentlyContinue

if ($runShFiles.Count -gt 0) {
    $scriptPath = $runShFiles[0].FullName
    Write-Host "Found run-windows-wrapper.sh at: $scriptPath" -ForegroundColor Green

    $scriptDir = Split-Path -Parent $scriptPath
    $scriptRelativePath = $scriptPath.Substring($repoPath.Length + 1).Replace("\", "/")

    if (Test-Path $gitBashPath) {
        Write-Host "Executing $scriptRelativePath b using Git Bash..." -ForegroundColor Green

        # Ask for GitHub token
        $githubToken = Read-Host "Please enter your GitHub token (leave empty if not needed)"
        $tokenCommand = ""
        if (-not [string]::IsNullOrWhiteSpace($githubToken)) {
            $tokenCommand = "export GITHUB_TOKEN_CLASSIC='$githubToken'; "
            Write-Host "GitHub token will be set for this session." -ForegroundColor Green
        }

        # Always use a separate window for interactive scripts
        Write-Host "Launching Git Bash in a new window. Please interact with any prompts in that window..." -ForegroundColor Yellow

        # Create a more interactive experience by opening a proper Git Bash window that stays open
        # Add trap to keep window open on errors, and add explicit pause at the end
        $bashArgs = "-c `"$tokenCommand cd '$repoPath' && { { ./$scriptRelativePath; } || { echo -e '\n\n========== ERROR OCCURRED =========='; echo 'Review the errors above.'; }; }; echo -e '\n\nPress any key to close this window...'; read -n 1`""
        Start-Process -FilePath $gitBashPath -ArgumentList "--login", "-i", $bashArgs

        # Ask user to confirm completion
        $confirmed = Read-Host "Press Enter when the Git Bash script has completed (or Ctrl+C to exit)"
    } else {
        Write-Host "Git Bash not found at expected location." -ForegroundColor Red
        Write-Host "Please run the script manually by opening Git Bash and running:" -ForegroundColor Yellow
        Write-Host "export GITHUB_TOKEN_CLASSIC='your-token'; cd '$repoPath' && ./$scriptRelativePath b" -ForegroundColor Yellow
    }
} else {
    Write-Host "No run-windows-wrapper.sh script found in the repository. Please check the repository structure." -ForegroundColor Red

    # Ask user if they want to specify the path manually
    $manualPath = Read-Host "Do you want to specify the path to run-windows-wrapper.sh manually? (Y/N)"

    if ($manualPath -eq "Y" -or $manualPath -eq "y") {
        $customScriptPath = Read-Host "Please enter the full path to the run-windows-wrapper.shrun-windows-wrapper.sh script"

        if (Test-Path $customScriptPath) {
            Write-Host "Found script at: $customScriptPath" -ForegroundColor Green
            $scriptDir = Split-Path -Parent $customScriptPath

            if (Test-Path $gitBashPath) {
                Write-Host "Executing custom script using Git Bash..." -ForegroundColor Green

                # Ask user if they want to see output in the current console or in a new window
                $showOutput = Read-Host "Do you want to see the script output in the current PowerShell window? (Y/N)"

                # Ask for GitHub token
                $githubToken = Read-Host "Please enter your GitHub token (leave empty if not needed)"
                $tokenCommand = ""
                if (-not [string]::IsNullOrWhiteSpace($githubToken)) {
                    $tokenCommand = "export GITHUB_TOKEN_CLASSIC='$githubToken'; "
                    Write-Host "GitHub token will be set for this session." -ForegroundColor Green
                }

                # Always use a separate window for interactive scripts
                Write-Host "Launching Git Bash in a new window. Please interact with any prompts in that window..." -ForegroundColor Yellow

                # Create a more interactive experience by opening a proper Git Bash window that stays open
                $scriptFileName = Split-Path -Leaf $customScriptPath
                # Add trap to keep window open on errors, and add explicit pause at the end
                $bashArgs = "-c `"$tokenCommand cd '$scriptDir' && { { ./$scriptFileName b; } || { echo -e '\n\n========== ERROR OCCURRED =========='; echo 'Review the errors above.'; }; }; echo -e '\n\nPress any key to close this window...'; read -n 1`""
                Start-Process -FilePath $gitBashPath -ArgumentList "--login", "-i", $bashArgs

                # Ask user to confirm completion
                $confirmed = Read-Host "Press Enter when the Git Bash script has completed (or Ctrl+C to exit)"
            } else {
                Write-Host "Git Bash not found at expected location." -ForegroundColor Red
                Write-Host "Please run the script manually by opening Git Bash and running:" -ForegroundColor Yellow
                Write-Host "cd '$scriptDir' && ./$(Split-Path -Leaf $customScriptPath)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "The specified path does not exist. Please check the path and try again." -ForegroundColor Red
        }
    }
}

# Add trap to handle errors
trap {
    Write-Host "Error occurred: $_" -ForegroundColor Red
    Cleanup-Environment
    Exit 1
}

# Ask if user wants to clean up the network configuration
$cleanupNetwork = Read-Host "Do you want to clean up the network configuration? (Y/N)"
if ($cleanupNetwork -eq "Y" -or $cleanupNetwork -eq "y") {
    Remove-KindNetwork
    Write-Host "Network configuration has been removed." -ForegroundColor Green
} else {
    Write-Host "Network configuration has been preserved for future use." -ForegroundColor Green
}

Write-Host "OpenFrame installation and setup process completed!" -ForegroundColor Green