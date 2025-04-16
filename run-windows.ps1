# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
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
        Write-Host "Please ensure Docker Desktop is running and try again." -ForegroundColor Red
        return $false
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

        # Enable Kubernetes in extensions
        if (-not ($settings.extensions.kubernetes.PSObject.Properties['enabled'] -and $settings.extensions.kubernetes.enabled)) {
            $settings.extensions.kubernetes | Add-Member -Type NoteProperty -Name 'enabled' -Value $true -Force
            $settingsChanged = $true
        }
        
        if ($settingsChanged) {
            Write-Host "Updating Docker Desktop settings..." -ForegroundColor Yellow
            
            # Create backup of current settings
            $backupPath = "$settingsPath.backup"
            Copy-Item -Path $settingsPath -Destination $backupPath -Force
            Write-Host "Created backup of settings at: $backupPath" -ForegroundColor Cyan
            
            # Save modified settings
            $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
            
            # Restart Docker Desktop
            Write-Host "Restarting Docker Desktop to apply Kubernetes settings..." -ForegroundColor Yellow
            
            # Try to gracefully stop Docker Desktop
            $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
            if ($dockerProcess) {
                $dockerProcess | Stop-Process -Force
                Start-Sleep -Seconds 5
            }
            
            # Start Docker Desktop
            Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
            
            # Wait for Docker to start
            Write-Host "Waiting for Docker Desktop to initialize (this may take several minutes)..." -ForegroundColor Yellow
            $retryCount = 0
            $maxRetries = 12 # 2 minutes total
            
            do {
                $retryCount++
                Write-Host "Waiting for Docker... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 10
                
                try {
                    $dockerRunning = docker info 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        break
                    }
                } catch {
                    # Continue waiting
                }
            } while ($retryCount -lt $maxRetries)
            
            # Additional wait for Kubernetes to initialize
            Write-Host "Waiting for Kubernetes to initialize..." -ForegroundColor Yellow
            Start-Sleep -Seconds 30
            
            return $true
        } else {
            Write-Host "Kubernetes is already enabled in settings." -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "Error modifying Docker Desktop settings: $_" -ForegroundColor Red
        Write-Host "Stack Trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        return $false
    }
}

# Function to check Kubernetes status
function Test-KubernetesStatus {
    Write-Host "Checking Kubernetes status..." -ForegroundColor Cyan

    # Check if kubectl is available
    if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: kubectl is not installed." -ForegroundColor Red
        return $false
    }

    # First check if Kubernetes is enabled in Docker Desktop
    try {
        $settingsPath = "$env:USERPROFILE\AppData\Roaming\Docker\settings.json"
        if (Test-Path $settingsPath) {
            $dockerSettings = Get-Content $settingsPath -ErrorAction Stop | ConvertFrom-Json
            $k8sEnabled = $false

            if ($dockerSettings.PSObject.Properties['kubernetes'] -and 
                $dockerSettings.kubernetes.PSObject.Properties['enabled']) {
                $k8sEnabled = $dockerSettings.kubernetes.enabled
            }

            if (-not $k8sEnabled) {
                Write-Host "Kubernetes is not enabled in Docker Desktop" -ForegroundColor Yellow
                
                # Try to enable Kubernetes
                if (-not (Enable-Kubernetes)) {
                    Write-Host "Failed to enable Kubernetes automatically." -ForegroundColor Red
                    Write-Host "Please enable Kubernetes manually in Docker Desktop settings:" -ForegroundColor Yellow
                    Write-Host "1. Open Docker Desktop" -ForegroundColor Yellow
                    Write-Host "2. Go to Settings > Kubernetes" -ForegroundColor Yellow
                    Write-Host "3. Check 'Enable Kubernetes'" -ForegroundColor Yellow
                    Write-Host "4. Click 'Apply & Restart'" -ForegroundColor Yellow
                    return $false
                }
            }
        }
    } catch {
        Write-Host "Could not check Docker Desktop settings: $_" -ForegroundColor Yellow
        Write-Host "Continuing with Kubernetes checks..." -ForegroundColor Yellow
    }

    # Check if Kubernetes is running
    $retryCount = 0
    $maxRetries = 6  # Increased retries for initial startup
    $k8sRunning = $false

    while ($retryCount -lt $maxRetries -and -not $k8sRunning) {
        try {
            Write-Host ("Checking Kubernetes connection... (Attempt " + ($retryCount + 1) + " of $maxRetries)") -ForegroundColor Yellow
            
            # Try to get cluster info with a timeout
            $job = Start-Job -ScriptBlock { kubectl cluster-info }
            $completed = Wait-Job $job -Timeout 10
            
            if ($null -eq $completed) {
                Stop-Job $job
                Remove-Job $job -Force
                Write-Host "Timeout while checking Kubernetes. Still starting..." -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            } else {
                $result = Receive-Job $job
                Remove-Job $job
                
                if ($result -match "Kubernetes control plane") {
                    $k8sRunning = $true
                    Write-Host "Kubernetes is running properly:" -ForegroundColor Green
                    Write-Host $result -ForegroundColor Green
                    
                    # Show node status with timeout
                    Write-Host "`nChecking Kubernetes nodes status..." -ForegroundColor Cyan
                    $nodeJob = Start-Job -ScriptBlock { kubectl get nodes }
                    $nodeCompleted = Wait-Job $nodeJob -Timeout 5
                    
                    if ($nodeCompleted) {
                        Receive-Job $nodeJob | ForEach-Object {
                            Write-Host $_ -ForegroundColor Green
                        }
                    } else {
                        Write-Host "Timeout while getting node status, but Kubernetes is running." -ForegroundColor Yellow
                    }
                    Remove-Job $nodeJob -Force
                }
            }
        }
        catch {
            Write-Host "Error checking Kubernetes: $_" -ForegroundColor Red
        }
        
        if (-not $k8sRunning) {
            $retryCount++
            if ($retryCount -lt $maxRetries) {
                Write-Host "Waiting for Kubernetes to be ready... (Attempt $retryCount of $maxRetries)" -ForegroundColor Yellow
                Start-Sleep -Seconds 10
            }
        }
    }

    if (-not $k8sRunning) {
        Write-Host "`nERROR: Kubernetes is not running properly after $maxRetries attempts." -ForegroundColor Red
        Write-Host "Please try these steps:" -ForegroundColor Yellow
        Write-Host "1. Right-click Docker Desktop icon in system tray" -ForegroundColor Yellow
        Write-Host "2. Select 'Restart...'" -ForegroundColor Yellow
        Write-Host "3. Wait a few minutes for everything to initialize" -ForegroundColor Yellow
        Write-Host "4. Run this script again" -ForegroundColor Yellow
        return $false
    }

    return $true
}

# Function to check and configure network for Kind cluster
function Set-KindNetwork {
    Write-Host "Checking network configuration for Kind cluster..." -ForegroundColor Cyan
    
    try {
        # Get the primary network adapter
        $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.InterfaceDescription -notlike "*Loopback*" } | Select-Object -First 1
        
        if (-not $adapter) {
            Write-Host "ERROR: Could not find active network adapter" -ForegroundColor Red
            return $false
        }
        
        # Check if the IP already exists
        $existingIP = Get-NetIPAddress -IPAddress "192.168.0.23" -ErrorAction SilentlyContinue
        
        if ($existingIP) {
            Write-Host "Kind cluster IP (192.168.0.23) is already configured." -ForegroundColor Green
            return $true
        }
        
        Write-Host "Adding IP address 192.168.0.23 to adapter $($adapter.Name)..." -ForegroundColor Yellow
        
        # Add the IP address with a different subnet to avoid conflicts
        $result = New-NetIPAddress -IPAddress "192.168.0.23" -PrefixLength 32 -InterfaceIndex $adapter.ifIndex -SkipAsSource $true
        
        if ($result) {
            Write-Host "Successfully configured network for Kind cluster." -ForegroundColor Green
            return $true
        } else {
            Write-Host "Failed to configure network for Kind cluster." -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error configuring network: $_" -ForegroundColor Red
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

# Function to configure network for OpenFrame
function Configure-OpenFrameNetwork {
    param (
        [string]$ConfigPath = ".\config\service-domains.yaml"
    )
    
    Write-Host "Configuring network for OpenFrame..." -ForegroundColor Cyan
    
    # Check if yaml module is available
    if (-not (Get-Module -ListAvailable -Name powershell-yaml)) {
        Write-Host "Installing powershell-yaml module..." -ForegroundColor Yellow
        Install-Module -Name powershell-yaml -Force -Scope CurrentUser
    }

    # Read configuration
    try {
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Yaml
        $activeConfig = $config.domains[$config.active_config]
        
        if (-not $activeConfig) {
            Write-Host "No active configuration found in $ConfigPath" -ForegroundColor Red
            return $false
        }

        # If using localhost configuration, no additional setup needed
        if (-not $activeConfig.use_nip_io) {
            Write-Host "Using localhost configuration - no additional network setup needed." -ForegroundColor Green
            return $true
        }

        # For custom IP configuration
        $customIP = $activeConfig.base_domain
        
        # Validate IP address
        try {
            $null = [System.Net.IPAddress]::Parse($customIP)
        } catch {
            Write-Host "Invalid IP address in configuration: $customIP" -ForegroundColor Red
            return $false
        }

        # Check if IP is already configured
        $existingIP = Get-NetIPAddress -IPAddress $customIP -ErrorAction SilentlyContinue
        if ($existingIP) {
            Write-Host "IP address $customIP is already configured." -ForegroundColor Green
            return $true
        }

        # Get default network adapter
        $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.InterfaceDescription -notlike "*Loopback*" } | Select-Object -First 1
        if (-not $adapter) {
            Write-Host "No suitable network adapter found." -ForegroundColor Red
            return $false
        }

        # Add IP address
        try {
            New-NetIPAddress -IPAddress $customIP -PrefixLength 24 -InterfaceIndex $adapter.ifIndex | Out-Null
            Write-Host "Successfully configured IP address $customIP" -ForegroundColor Green
            
            # Add hosts file entry if needed
            $hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"
            $hostsContent = Get-Content $hostsFile
            if (-not ($hostsContent -match $customIP)) {
                Add-Content -Path $hostsFile -Value "`n$customIP kind.local # Added by OpenFrame setup" -Force
                Write-Host "Added hosts file entry for $customIP" -ForegroundColor Green
            }
            
            return $true
        } catch {
            Write-Host "Failed to configure IP address: $_" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "Error reading configuration from $ConfigPath : $_" -ForegroundColor Red
        return $false
    }
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

# Check Docker and Kubernetes status
if (-not (Test-DockerStatus)) {
    Write-Host "Please fix Docker issues and run the script again." -ForegroundColor Red
    Exit 1
}

if (-not (Test-KubernetesStatus)) {
    Write-Host "Please fix Kubernetes issues and run the script again." -ForegroundColor Red
    Exit 1
}

# 3. Handle repository
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

# 5. Find and run the run.sh script using Git Bash
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
        $bashArgs = "-c `"$tokenCommand cd '$repoPath' && { { ./$scriptRelativePath b; } || { echo -e '\n\n========== ERROR OCCURRED =========='; echo 'Review the errors above.'; }; }; echo -e '\n\nPress any key to close this window...'; read -n 1`""
        Start-Process -FilePath $gitBashPath -ArgumentList "--login", "-i", $bashArgs

        # Ask user to confirm completion
        $confirmed = Read-Host "Press Enter when the Git Bash script has completed (or Ctrl+C to exit)"
    } else {
        Write-Host "Git Bash not found at expected location." -ForegroundColor Red
        Write-Host "Please run the script manually by opening Git Bash and running:" -ForegroundColor Yellow
        Write-Host "export GITHUB_TOKEN_CLASSIC='your-token'; cd '$repoPath' && ./$scriptRelativePath b" -ForegroundColor Yellow
    }
} else {
    Write-Host "No run.sh script found in the repository. Please check the repository structure." -ForegroundColor Red

    # Ask user if they want to specify the path manually
    $manualPath = Read-Host "Do you want to specify the path to run.sh manually? (Y/N)"

    if ($manualPath -eq "Y" -or $manualPath -eq "y") {
        $customScriptPath = Read-Host "Please enter the full path to the run.sh script"

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

# Add these lines before creating the Kind cluster
if (-not (Set-KindNetwork)) {
    Write-Host "Failed to configure network for Kind cluster. Please check network settings and try again." -ForegroundColor Red
    Exit 1
}

# Add cleanup to your existing error handling
trap {
    Write-Host "Error occurred: $_" -ForegroundColor Red
    Cleanup-Environment
    Exit 1
}

# Add this to your main script flow
if (-not (Configure-OpenFrameNetwork)) {
    Write-Host "Failed to configure network. Please check the configuration and try again." -ForegroundColor Red
    exit 1
}

Write-Host "OpenFrame installation and setup process completed!" -ForegroundColor Green