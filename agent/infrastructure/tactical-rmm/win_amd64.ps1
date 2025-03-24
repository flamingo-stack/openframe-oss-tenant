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
    [string]$AgentAuthKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ClientId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SiteId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$AgentType = "workstation",
    
    [Parameter(Mandatory=$false)]
    [string]$LogPath = "",
    
    [Parameter(Mandatory=$false)]
    [string]$BuildFolder = "rmmagent",
    
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

function Show-Help {
    Write-ColorMessage "Tactical RMM Agent Installer for Windows AMD64" "Blue"
    Write-Host "`nUsage: $($MyInvocation.MyCommand.Name) [options]`n"
    Write-Host "Options:"
    Write-Host "  -OrgName <name>              Organization name"
    Write-Host "  -ContactEmail <email>        Contact email"
    Write-Host "  -RmmServerUrl <url>          RMM server URL"
    Write-Host "  -AgentAuthKey <key>          Agent authentication key"
    Write-Host "  -ClientId <id>               Client ID"
    Write-Host "  -SiteId <id>                 Site ID"
    Write-Host "  -AgentType <type>            Agent type (workstation/server) [default: workstation]"
    Write-Host "  -LogPath <path>              Agent log file path"
    Write-Host "  -BuildFolder <folder>        Build folder [default: rmmagent]"
    Write-Host "  -SkipRun                     Skip running the agent after installation"
    Write-Host "  -Help                        Display this help message"
    Write-Host "  -Verbose                     Show detailed output`n"
    Write-Host "Example:"
    Write-Host "  $($MyInvocation.MyCommand.Name) -RmmServerUrl https://rmm.example.com -AgentAuthKey abc123"
    exit 1
}

function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Go {
    Write-ColorMessage "Checking Go installation..." "Yellow"
    if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
        Write-ColorMessage "Installing Go..." "Yellow"
        $goUrl = "https://golang.org/dl/go1.21.6.windows-amd64.msi"
        $goInstaller = "$env:TEMP\go_installer.msi"
        
        Invoke-WebRequest -Uri $goUrl -OutFile $goInstaller
        Start-Process msiexec.exe -Wait -ArgumentList '/i', $goInstaller, '/quiet'
        Remove-Item $goInstaller
        
        # Add Go to PATH
        $env:Path += ";C:\Go\bin"
        [Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::Machine)
    } else {
        Write-ColorMessage "Go is already installed." "Green"
    }
}

function Install-Git {
    Write-ColorMessage "Checking Git installation..." "Yellow"
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-ColorMessage "Installing Git..." "Yellow"
        $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
        $gitInstaller = "$env:TEMP\git_installer.exe"
        
        Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller
        Start-Process $gitInstaller -Wait -ArgumentList '/VERYSILENT /NORESTART'
        Remove-Item $gitInstaller
    } else {
        Write-ColorMessage "Git is already installed." "Green"
    }
}

function Clone-Repository {
    param(
        [string]$RepoUrl,
        [string]$Branch,
        [string]$Folder
    )
    
    if (Test-Path $Folder) {
        Write-ColorMessage "Folder '$Folder' already exists. Updating..." "Yellow"
        Set-Location $Folder
        git fetch --all
        git checkout $Branch
        git pull
    } else {
        Write-ColorMessage "Cloning repository..." "Yellow"
        git clone --branch $Branch $RepoUrl $Folder
        Set-Location $Folder
    }
}

function Patch-NatsWebsocketUrl {
    Write-ColorMessage "Patching NATS WebSocket URL..." "Yellow"
    $agentGoFile = "agent/agent.go"
    
    if (Test-Path $agentGoFile) {
        $content = Get-Content $agentGoFile -Raw
        $content = $content -replace 'natsServer = fmt.Sprintf\("wss://%s:%s", ac.APIURL, natsProxyPort\)', 'natsServer = fmt.Sprintf("ws://%s:8000/natsws", ac.APIURL)'
        $content = $content -replace 'natsServer = fmt.Sprintf\("nats://%s:%s", ac.APIURL, ac.NatsStandardPort\)', 'natsServer = fmt.Sprintf("ws://%s:8000/natsws", ac.APIURL)'
        Set-Content $agentGoFile $content
        Write-ColorMessage "NATS WebSocket URL patched successfully." "Green"
    } else {
        Write-ColorMessage "Warning: agent.go file not found." "Red"
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
        [string]$AgentType,
        [string]$LogPath
    )
    
    Write-ColorMessage "Installing agent..." "Yellow"
    
    $args = @(
        "-m", "install",
        "-api", $RmmUrl,
        "-auth", $AuthKey,
        "-client-id", $ClientId,
        "-site-id", $SiteId,
        "-agent-type", $AgentType
    )
    
    if ($LogPath) {
        $args += @("-log", "DEBUG", "-logto", $LogPath)
    }
    
    $args += @("-nomesh")
    
    Start-Process ".\rmmagent.exe" -ArgumentList $args -Wait -NoNewWindow
    
    Write-ColorMessage "Agent installation completed." "Green"
}

# Show help if requested
if ($Help) {
    Show-Help
}

# Check for Administrator privileges
if (-not (Test-Administrator)) {
    Write-ColorMessage "Error: Please run this script as Administrator." "Red"
    exit 1
}

try {
    Write-ColorMessage "`nTactical RMM Agent Installation Started" "Green"
    Write-ColorMessage "======================================" "Green"

    # Install dependencies
    Install-Go
    Install-Git

    # Clone repository
    Clone-Repository -RepoUrl "https://github.com/amidaware/rmmagent.git" -Branch "master" -Folder $BuildFolder

    # Patch NATS WebSocket URL
    Patch-NatsWebsocketUrl

    # Compile agent
    Compile-Agent

    # Prompt for missing parameters
    if (-not $RmmServerUrl) {
        $RmmServerUrl = Read-Host "Enter RMM Server URL"
    }
    if (-not $AgentAuthKey) {
        $AgentAuthKey = Read-Host "Enter Agent Auth Key"
    }
    if (-not $ClientId) {
        $ClientId = Read-Host "Enter Client ID"
    }
    if (-not $SiteId) {
        $SiteId = Read-Host "Enter Site ID"
    }
    if (-not $LogPath) {
        $LogPath = "C:\ProgramData\TacticalRMM\logs\agent.log"
    }

    # Install agent if not skipping
    if (-not $SkipRun) {
        Install-Agent -RmmUrl $RmmServerUrl -AuthKey $AgentAuthKey -ClientId $ClientId -SiteId $SiteId -AgentType $AgentType -LogPath $LogPath
    }

    Write-ColorMessage "`nInstallation completed successfully!" "Green"
    Write-ColorMessage "Agent binary location: $(Get-Location)\rmmagent.exe" "Green"
}
catch {
    Write-ColorMessage "`nInstallation Failed:" "Red"
    Write-ColorMessage "Error: $($_.Exception.Message)" "Red"
    Write-ColorMessage "Stack Trace: $($_.Exception.StackTrace)" "Red"
    exit 1
} 