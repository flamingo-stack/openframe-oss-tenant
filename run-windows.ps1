# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    $currentUser.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

# Check if script is running as administrator, if not, restart as admin
if (-not (Test-Administrator)) {
    Write-Host "This script requires administrator privileges. Restarting as admin..."
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

Write-Host "OpenFrame installation and setup process completed!" -ForegroundColor Green