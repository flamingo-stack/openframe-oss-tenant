[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Server,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
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
    Write-Host "  -Help                            Display this help message"
    Write-Host "  -Verbose                         Show detailed output`n"
    Write-Host "Example:"
    Write-Host "  $($MyInvocation.MyCommand.Name) -Server mesh.yourdomain.com [-Verbose]"
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
        [string]$Path
    )
    if (Test-Path $Path) {
        Write-VerboseMessage "Removing directory: $Path"
        try {
            Stop-MeshAgent
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

# Show help if requested or if no parameters provided
if ($Help -or [string]::IsNullOrEmpty($Server)) {
    Show-Help
}

# Check for Administrator privileges
if (-not (Test-Administrator)) {
    Write-ColorMessage "Error: Please run this script as Administrator." "Red"
    exit 1
}

try {
    Write-ColorMessage "`nMeshCentral Agent Installation Started" "Green"
    Write-ColorMessage "======================================" "Green"

    # Stop any running instances first
    Stop-MeshAgent

    # Set up paths
    $TempDir = Join-Path $env:TEMP "mesh_install"
    $LogDir = Join-Path $env:ProgramData "MeshAgent\Logs"
    $InstallDir = Join-Path $env:ProgramFiles "MeshAgent"

    Write-VerboseMessage "Temporary directory: $TempDir"
    Write-VerboseMessage "Log directory: $LogDir"
    Write-VerboseMessage "Installation directory: $InstallDir"

    # Clean up existing directories
    Remove-Directory $TempDir
    Remove-Directory $InstallDir

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
    if (-not (Download-File -Url $agentUrl -OutFile $agentPath)) {
        throw "Failed to download MeshAgent binary"
    }

    # Download config
    $configUrl = "https://$Server/openframe_public/meshagent.msh"
    $configPath = Join-Path $TempDir "meshagent.msh"
    if (-not (Download-File -Url $configUrl -OutFile $configPath)) {
        throw "Failed to download MeshAgent configuration"
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

    # Copy files to install directory
    Write-VerboseMessage "Copying files to installation directory..."
    Copy-Item -Path $agentPath -Destination $InstallDir -Force
    Copy-Item -Path $configPath -Destination $InstallDir -Force

    # Clean up temp files before starting agent
    Write-VerboseMessage "Cleaning up temporary directory: $TempDir"
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

    # Run agent
    Write-ColorMessage "Starting MeshAgent:" "Yellow"
    $finalAgentPath = Join-Path $InstallDir "meshagent.exe"
    Write-VerboseMessage "Executing: $finalAgentPath connect"
    
    Write-ColorMessage "`nInstallation Summary:" "Green"
    Write-VerboseMessage "Agent Location: $finalAgentPath"
    Write-VerboseMessage "Config Location: $(Join-Path $InstallDir 'meshagent.msh')"
    Write-VerboseMessage "Log Location: $LogDir"
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