[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Server,
    
    [Parameter(Mandatory=$false)]
    [string]$NodeId,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help,
    
    [Parameter(Mandatory=$false)]
    [switch]$Uninstall,
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceNewCert
)

# MeshCentral Agent Installer for Windows systems
# Requires -RunAsAdministrator

# Color definitions for Windows console
$Colors = @{
    Green = '[92m'
    Red = '[91m'
    Yellow = '[93m'
    Blue = '[94m'
    Reset = '[0m'
}

function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color,
        [switch]$NoNewLine
    )
    if ($NoNewLine) {
        Write-Host "$($Colors[$Color])$Message$($Colors['Reset'])" -NoNewline
    } else {
        Write-Host "$($Colors[$Color])$Message$($Colors['Reset'])"
    }
}

function Write-VerboseMessage {
    param(
        [string]$Message
    )
    Write-Verbose "  → $Message"
}

function Show-Help {
    Write-ColorMessage "MeshCentral Agent Installer for Windows Systems" "Blue"
    Write-Host "`nUsage: $($MyInvocation.MyCommand.Name) [options]`n"
    Write-Host "Options:"
    Write-Host "  -Server <mesh_server_url>        (Required) URL of your MeshCentral server (without https://)"
    Write-Host "  -NodeId <node_id>                (Optional) NodeID to inject into the MSH file"
    Write-Host "  -Help                            Display this help message"
    Write-Host "  -Uninstall                       Completely remove MeshAgent from this system"
    Write-Host "  -ForceNewCert                    Force certificate reset to resolve server certificate mismatch issues"
    Write-Host "  -Verbose                         Show detailed output`n"
    Write-Host "Example:"
    Write-Host "  $($MyInvocation.MyCommand.Name) -Server mesh.yourdomain.com [-Verbose]"
    Write-Host "  $($MyInvocation.MyCommand.Name) -Server mesh.yourdomain.com -NodeId 'node//1E3vUyW4i1Je`$hiyT8ec87bEXPVj`$sEahRAFDtfNSKgS5XJQBotfsN9Y`$v0hw6xa'"
    exit 1
}

function Stop-MeshAgent {
    Write-VerboseMessage "Stopping any running MeshAgent processes..."
    Get-Process | Where-Object { $_.ProcessName -eq "meshagent" } | ForEach-Object {
        Write-VerboseMessage "Stopping process: $($_.Id)"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2  # Give processes time to stop
}

function Remove-Directory {
    param(
        [string]$Path,
        [switch]$PreserveIdentityFiles
    )
    if (Test-Path $Path) {
        Write-VerboseMessage "Removing directory: $Path"
        
        if ($PreserveIdentityFiles -and $Path -eq $InstallDir) {
            Write-VerboseMessage "Preserving identity files during cleanup"
            try {
                # Remove only specific files, not the entire directory
                $filesToRemove = Get-ChildItem -Path $Path -File | Where-Object { $_.Name -notin $IdentityFilesToPreserve }
                foreach ($file in $filesToRemove) {
                    try {
                        Remove-Item $file.FullName -Force -ErrorAction SilentlyContinue
                        Write-VerboseMessage "Removed: $($file.FullName)"
                    }
                    catch {
                        Write-VerboseMessage "Could not remove: $($file.FullName)"
                    }
                }
                
                # Remove non-identity subdirectories
                $dirsToRemove = Get-ChildItem -Path $Path -Directory | Where-Object { $_.Name -notin $IdentityDirsToPreserve }
                foreach ($dir in $dirsToRemove) {
                    try {
                        Remove-Item $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
                        Write-VerboseMessage "Removed directory: $($dir.FullName)"
                    }
                    catch {
                        Write-VerboseMessage "Could not remove directory: $($dir.FullName)"
                    }
                }
            }
            catch {
                Write-VerboseMessage "Error during selective removal: $($_.Exception.Message)"
            }
        }
        else {
            # Remove the entire directory
            try {
                Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            }
            catch {
                Write-VerboseMessage "Failed to remove directory: $($_.Exception.Message)"
                # Try to remove files individually
                Get-ChildItem -Path $Path -Recurse | ForEach-Object {
                    try {
                        Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
                    }
                    catch {
                        Write-VerboseMessage "Could not remove: $($_.FullName)"
                    }
                }
            }
        }
    }
}

function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-AgentArchitecture {
    if ([Environment]::Is64BitOperatingSystem) {
        return @{
            Arch = "x64"
            AgentId = "3"
        }
    } else {
        return @{
            Arch = "x86"
            AgentId = "1"
        }
    }
}

function Test-ServerConnection {
    param(
        [string]$ServerUrl
    )
    try {
        Write-ColorMessage "Testing connection to $ServerUrl..." "Yellow"
        $request = [System.Net.WebRequest]::Create("https://$ServerUrl")
        $request.Method = "HEAD"
        $request.Timeout = 5000
        $request.ServerCertificateValidationCallback = { $true }
        
        try {
            Write-VerboseMessage "Sending HEAD request to verify server availability..."
            $response = $request.GetResponse()
            $response.Close()
            Write-VerboseMessage "Server connection successful"
            return $true
        }
        catch [System.Net.WebException] {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                # If we get any HTTP response, server is reachable
                Write-VerboseMessage "Server responded with status code: $($_.Exception.Response.StatusCode)"
                return $true
            }
            Write-ColorMessage "Server is not responding. Error: $($_.Exception.Message)" "Red"
            return $false
        }
    }
    catch {
        Write-ColorMessage "Connection test failed: $($_.Exception.Message)" "Red"
        return $false
    }
}

function Backup-IdentityFiles {
    param(
        [string]$SourceDir,
        [string]$BackupDir
    )
    
    if (-not (Test-Path $SourceDir)) {
        Write-VerboseMessage "No existing installation found to backup"
        return $false
    }
    
    # Create backup directory
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Check if any identity files exist
    $hasIdentityFiles = $false
    
    # Look for database files (*.db) and mesh agent state files
    foreach ($file in $IdentityFilesToPreserve) {
        $sourcePath = Join-Path $SourceDir $file
        if (Test-Path $sourcePath) {
            $hasIdentityFiles = $true
            $destPath = Join-Path $BackupDir $file
            Write-VerboseMessage "Backing up identity file: $file"
            Copy-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Backup specific subdirectories that may contain identity information
    foreach ($dir in $IdentityDirsToPreserve) {
        $sourceSubDir = Join-Path $SourceDir $dir
        if (Test-Path $sourceSubDir) {
            $hasIdentityFiles = $true
            $destSubDir = Join-Path $BackupDir $dir
            Write-VerboseMessage "Backing up identity directory: $dir"
            Copy-Item -Path $sourceSubDir -Destination $destSubDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    return $hasIdentityFiles
}

function Restore-IdentityFiles {
    param(
        [string]$BackupDir,
        [string]$TargetDir
    )
    
    if (-not (Test-Path $BackupDir)) {
        Write-VerboseMessage "No backup directory found to restore from"
        return $false
    }
    
    # Ensure target directory exists
    if (-not (Test-Path $TargetDir)) {
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }
    
    # Restore individual files
    foreach ($file in $IdentityFilesToPreserve) {
        $sourcePath = Join-Path $BackupDir $file
        if (Test-Path $sourcePath) {
            $destPath = Join-Path $TargetDir $file
            Write-VerboseMessage "Restoring identity file: $file"
            Copy-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Restore directories
    foreach ($dir in $IdentityDirsToPreserve) {
        $sourceSubDir = Join-Path $BackupDir $dir
        if (Test-Path $sourceSubDir) {
            $destSubDir = Join-Path $TargetDir $dir
            Write-VerboseMessage "Restoring identity directory: $dir"
            Copy-Item -Path $sourceSubDir -Destination $destSubDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    return $true
}

function Download-File {
    param(
        [string]$Url,
        [string]$OutFile
    )
    try {
        Write-ColorMessage "Downloading from: $Url" "Yellow"
        Write-VerboseMessage "Destination: $OutFile"

        # Configure SSL/TLS
        [System.Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}

        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell MeshAgent Installer")

        try {
            $webClient.DownloadFile($Url, $OutFile)
        }
        catch {
            Write-VerboseMessage "First download attempt failed, retrying with different method..."
            Invoke-WebRequest -Uri $Url -OutFile $OutFile -SkipCertificateCheck
        }
        
        if (Test-Path $OutFile) {
            $fileSize = (Get-Item $OutFile).Length
            Write-VerboseMessage "Download completed. File size: $([Math]::Round($fileSize/1KB, 2)) KB"
            return $true
        }
        return $false
    }
    catch {
        Write-ColorMessage "Download failed: $($_.Exception.Message)" "Red"
        Write-VerboseMessage "Full error: $($_.Exception)"
        return $false
    }
}

function Uninstall-MeshAgent {
    param(
        [string]$InstallDir
    )
    
    Write-ColorMessage "`nUninstalling MeshCentral Agent" "Yellow"
    
    # Stop any running instances
    Stop-MeshAgent
    
    # Try to run agent's uninstall method if available
    $agentPath = Join-Path $InstallDir "meshagent.exe"
    if (Test-Path $agentPath) {
        Write-VerboseMessage "Running agent's uninstall command..."
        try {
            Start-Process -FilePath $agentPath -ArgumentList "uninstall" -Wait -NoNewWindow
            Start-Sleep -Seconds 2
        }
        catch {
            Write-VerboseMessage "Error running uninstall command: $($_.Exception.Message)"
        }
    }
    
    # Ensure process is stopped
    Stop-MeshAgent
    
    # Remove entire directory without preserving any files
    Write-VerboseMessage "Removing installation directory..."
    Remove-Directory -Path $InstallDir
    
    # Clean up registry entries
    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\MeshAgent",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\MeshAgent"
    )
    
    foreach ($path in $registryPaths) {
        if (Test-Path $path) {
            Write-VerboseMessage "Removing registry key: $path"
            Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Remove scheduled tasks if any
    $taskName = "MeshAgent"
    $taskExists = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($taskExists) {
        Write-VerboseMessage "Removing scheduled task: $taskName"
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    }
    
    Write-ColorMessage "MeshCentral Agent has been uninstalled." "Green"
    exit 0
}

# Show help if requested or if no parameters provided
if ($Help -or [string]::IsNullOrEmpty($Server)) {
    Show-Help
}

# Check for Administrator privileges
if (-not (Test-Administrator)) {
    Write-ColorMessage "Error: Please run this script as Administrator." "Red"
    exit 1
}

# Set up paths
$TempDir = Join-Path $env:TEMP "mesh_install"
$BackupDir = Join-Path $env:TEMP "mesh_backup"
$LogDir = Join-Path $env:ProgramData "MeshAgent\Logs"
$InstallDir = Join-Path $env:ProgramFiles "MeshAgent"
$DataDir = Join-Path $env:ProgramData "MeshAgent"

# Define identity files and directories to preserve during installation
$IdentityFilesToPreserve = @(
    "mesh.db",           # Main database file
    "meshagent.msh",     # Configuration file
    "meshagent.db",      # Agent database
    "settings.json",     # Agent settings
    "state.json",        # Agent state
    "nodeinfo.json",     # Node information
    "identitydata.json"  # Identity data
)

$IdentityDirsToPreserve = @(
    "data",              # Data directory
    "db",                # Database directory
    "config"             # Configuration directory
)

# Process uninstall request if specified
if ($Uninstall) {
    Uninstall-MeshAgent -InstallDir $InstallDir
    exit 0
}

try {
    Write-ColorMessage "`nMeshCentral Agent Installation Started" "Green"
    Write-ColorMessage "======================================" "Green"

    # Stop any running instances first
    Stop-MeshAgent

    # Check for existing installation and backup identity files
    $hasExistingInstallation = Test-Path $InstallDir
    $hasIdentityBackup = $false
    
    if ($hasExistingInstallation) {
        Write-ColorMessage "Existing installation found. Preserving identity files..." "Yellow"
        
        # If ForceNewCert is specified, modify the identity files list to exclude certificate-related files
        if ($ForceNewCert) {
            Write-ColorMessage "  ● Certificate reset requested - will not preserve certificate data" "Yellow"
            
            # Modified list that excludes certificate-related files
            $IdentityFilesToPreserve = @(
                # Keep only non-certificate related files
                "nodeinfo.json"     # Node information
            )
            
            $IdentityDirsToPreserve = @(
                # No directories to preserve when forcing cert reset
            )
        }
        
        $hasIdentityBackup = Backup-IdentityFiles -SourceDir $InstallDir -BackupDir $BackupDir
        
        if ($hasIdentityBackup) {
            if ($ForceNewCert) {
                Write-ColorMessage "  ● Successfully backed up minimal identity files (certificate reset mode)" "Green"
            } else {
                Write-ColorMessage "  ● Successfully backed up identity files" "Green"
            }
        } else {
            Write-ColorMessage "  ● No identity files found to backup" "Yellow"
        }
    } else {
        Write-VerboseMessage "No existing installation found. Will perform fresh install."
    }

    Write-VerboseMessage "Temporary directory: $TempDir"
    Write-VerboseMessage "Backup directory: $BackupDir"
    Write-VerboseMessage "Log directory: $LogDir"
    Write-VerboseMessage "Installation directory: $InstallDir"
    Write-VerboseMessage "Data directory: $DataDir"

    # Display file destinations for user clarity
    Write-ColorMessage "File Destinations:" "Blue"
    Write-ColorMessage "  ● Temporary directory: $TempDir" "Yellow"
    Write-ColorMessage "  ● Log directory: $LogDir" "Yellow"
    Write-ColorMessage "  ● Installation directory: $InstallDir" "Yellow"

    # Clean up existing temporary directory
    Remove-Directory $TempDir
    
    # Selectively clean installation directory, preserving identity files
    if ($hasExistingInstallation) {
        Write-VerboseMessage "Selectively cleaning installation directory while preserving identity files..."
        Remove-Directory -Path $InstallDir -PreserveIdentityFiles
    }

    # Create temporary directory
    Write-VerboseMessage "Creating temporary directory..."
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

    # Detect architecture and set agent ID
    $archInfo = Get-AgentArchitecture
    Write-ColorMessage "System Information:" "Yellow"
    Write-VerboseMessage "Architecture: $($archInfo.Arch)"
    Write-VerboseMessage "Agent ID: $($archInfo.AgentId)"
    Write-VerboseMessage "Windows Version: $([System.Environment]::OSVersion.Version)"

    # Test server connection first
    if (-not (Test-ServerConnection -ServerUrl $Server)) {
        throw "Unable to connect to MeshCentral server at https://$Server"
    }

    # Configure SSL/TLS
    Write-VerboseMessage "Configuring SSL/TLS settings..."
    [System.Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

    # Disable progress bar for faster downloads
    $ProgressPreference = 'SilentlyContinue'

    # Download files
    Write-ColorMessage "Downloading MeshAgent Files:" "Yellow"

    # Download agent
    $agentUrl = "https://$Server/meshagents?id=$($archInfo.AgentId)"
    $agentPath = Join-Path $TempDir "meshagent.exe"
    Write-ColorMessage "  ● Agent binary location: $agentPath" "Yellow"
    if (-not (Download-File -Url $agentUrl -OutFile $agentPath)) {
        throw "Failed to download MeshAgent binary"
    }

    # Download config
    $configUrl = "https://$Server/openframe_public/meshagent.msh"
    $configPath = Join-Path $TempDir "meshagent.msh"
    Write-ColorMessage "  ● Config file location: $configPath" "Yellow"
    if (-not (Download-File -Url $configUrl -OutFile $configPath)) {
        throw "Failed to download MeshAgent configuration"
    }

    # Add NodeID to the MSH file if provided
    if (-not [string]::IsNullOrEmpty($NodeId)) {
        Write-VerboseMessage "Adding NodeID to the MSH file: $NodeId"
        Add-Content -Path $configPath -Value "NodeID=$NodeId"
        Write-ColorMessage "  ● Added NodeID to configuration file" "Yellow"
    }

    # Verify downloads
    Write-ColorMessage "Verifying downloaded files:" "Yellow"
    if (-not (Test-Path $agentPath)) {
        throw "MeshAgent binary was not downloaded successfully."
    }
    Write-VerboseMessage "Agent binary verified: $agentPath"

    if (-not (Test-Path $configPath)) {
        throw "MeshAgent configuration was not downloaded successfully."
    }
    Write-VerboseMessage "Configuration file verified: $configPath"

    Write-ColorMessage "All files downloaded successfully." "Green"

    # Create directories
    Write-ColorMessage "Setting up directories:" "Yellow"
    
    # Create log directory
    if (-not (Test-Path $LogDir)) {
        Write-VerboseMessage "Creating log directory: $LogDir"
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }

    # Create install directory
    if (-not (Test-Path $InstallDir)) {
        Write-VerboseMessage "Creating installation directory: $InstallDir"
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # Create data directory if needed
    if (-not (Test-Path $DataDir)) {
        Write-VerboseMessage "Creating data directory: $DataDir"
        New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    }

    # Copy files to install directory
    Write-VerboseMessage "Copying files to installation directory..."
    Copy-Item -Path $agentPath -Destination $InstallDir -Force
    
    # Always override the MSH configuration file
    Copy-Item -Path $configPath -Destination $InstallDir -Force
    Write-VerboseMessage "Copied new configuration file to installation directory"
    
    $finalAgentPath = Join-Path $InstallDir "meshagent.exe"
    $finalConfigPath = Join-Path $InstallDir "meshagent.msh"
    Write-ColorMessage "  ● Final agent location: $finalAgentPath" "Yellow"
    Write-ColorMessage "  ● Final config location: $finalConfigPath" "Yellow"

    # Restore identity files if we backed them up
    if ($hasIdentityBackup) {
        Write-ColorMessage "Restoring identity files from backup..." "Yellow"
        Restore-IdentityFiles -BackupDir $BackupDir -TargetDir $InstallDir
    }

    # Clean up temp files before starting agent
    Write-VerboseMessage "Cleaning up temporary directory: $TempDir"
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    
    # Clean up backup directory after successful restore
    if ($hasIdentityBackup) {
        Write-VerboseMessage "Cleaning up backup directory: $BackupDir"
        Remove-Item -Path $BackupDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    # Run agent
    Write-ColorMessage "Starting MeshAgent:" "Yellow"
    Write-VerboseMessage "Executing: $finalAgentPath connect"
    Write-ColorMessage "  ● Executing agent from: $finalAgentPath" "Yellow"
    
    Write-ColorMessage "`nInstallation Summary:" "Green"
    Write-ColorMessage "  ● Agent Location: $finalAgentPath" "Blue"
    Write-ColorMessage "  ● Config Location: $finalConfigPath" "Blue"
    Write-ColorMessage "  ● Log Location: $LogDir" "Blue"
    if ($hasIdentityBackup) {
        Write-ColorMessage "  ● Identity files were preserved from previous installation" "Blue"
    }
    Write-ColorMessage "Installation completed successfully." "Green"
    Write-ColorMessage "`nStarting MeshAgent in connect mode..." "Yellow"
    Write-ColorMessage "Press Ctrl+C to exit (agent will continue running in background)" "Yellow"

    # Start the agent in the foreground
    try {
        & $finalAgentPath connect
    }
    catch {
        Write-ColorMessage "Agent started in background mode" "Green"
    }
}
catch {
    Write-ColorMessage "`nInstallation Failed:" "Red"
    Write-ColorMessage "Error: $($_.Exception.Message)" "Red"
    Write-ColorMessage "Stack Trace: $($_.Exception.StackTrace)" "Red"
    exit 1
} 