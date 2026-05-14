[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$Server,

    [Parameter(Mandatory=$false)]
    [switch]$Help,

    [Parameter(Mandatory=$false)]
    [switch]$Uninstall
)

# OpenFrame Client Updater Installer for Windows systems
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
    param([string]$Message)
    Write-Verbose "  -> $Message"
}

function Show-Help {
    Write-ColorMessage "OpenFrame Client Updater Installer for Windows Systems" "Blue"
    Write-Host "`nUsage: $($MyInvocation.MyCommand.Name) [options]`n"
    Write-Host "Options:"
    Write-Host "  -Server <openframe_server_url>   (Required) URL of your OpenFrame server (without https://)"
    Write-Host "  -Help                            Display this help message"
    Write-Host "  -Uninstall                       Completely remove the OpenFrame Client Updater from this system"
    Write-Host "  -Verbose                         Show detailed output`n"
    Write-Host "Example:"
    Write-Host "  $($MyInvocation.MyCommand.Name) -Server openframe.yourdomain.com"
    Write-Host "  $($MyInvocation.MyCommand.Name) -Uninstall"
    exit 1
}

function Test-Administrator {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-ServerConnection {
    param([string]$ServerUrl)
    try {
        Write-ColorMessage "Testing connection to $ServerUrl..." "Yellow"
        $request = [System.Net.WebRequest]::Create("https://$ServerUrl")
        $request.Method = "HEAD"
        $request.Timeout = 5000
        $request.ServerCertificateValidationCallback = { $true }
        try {
            $response = $request.GetResponse()
            $response.Close()
            Write-VerboseMessage "Server connection successful"
            return $true
        }
        catch [System.Net.WebException] {
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                Write-VerboseMessage "Server responded with status: $($_.Exception.Response.StatusCode)"
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

        [System.Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

        $webClient = New-Object System.Net.WebClient
        $webClient.Headers.Add("User-Agent", "PowerShell OpenFrame Updater Installer")

        try {
            $webClient.DownloadFile($Url, $OutFile)
        }
        catch {
            Write-VerboseMessage "First download attempt failed, retrying with Invoke-WebRequest..."
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

function Stop-UpdaterService {
    Write-VerboseMessage "Stopping OpenFrame Client Updater service if running..."
    $service = Get-Service -Name "com.openframe.client-updater" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-VerboseMessage "Stopping service: com.openframe.client-updater"
        Stop-Service -Name "com.openframe.client-updater" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
}

function Uninstall-Updater {
    Write-ColorMessage "`nUninstalling OpenFrame Client Updater" "Yellow"

    # Stop the service first
    Stop-UpdaterService

    # Run the binary's own uninstall command from the known install location
    $installPath = Join-Path $env:ProgramFiles "OpenFrame\bin\openframe-client-updater.exe"
    if (Test-Path $installPath) {
        Write-VerboseMessage "Running uninstall command: $installPath uninstall"
        try {
            Start-Process -FilePath $installPath -ArgumentList "uninstall" -Wait -NoNewWindow
            Start-Sleep -Seconds 2
        }
        catch {
            Write-VerboseMessage "Error running uninstall command: $($_.Exception.Message)"
        }
    }

    # Belt-and-suspenders: stop service and remove binary if still present
    Stop-UpdaterService

    if (Test-Path $installPath) {
        Write-VerboseMessage "Removing remaining binary at: $installPath"
        Remove-Item -Path $installPath -Force -ErrorAction SilentlyContinue
    }

    Write-ColorMessage "OpenFrame Client Updater has been uninstalled." "Green"
    exit 0
}

# Show help if -Help is requested or if no Server and not uninstalling
if ($Help -or ([string]::IsNullOrEmpty($Server) -and -not $Uninstall)) {
    Show-Help
}

# Check for Administrator privileges
if (-not (Test-Administrator)) {
    Write-ColorMessage "Error: Please run this script as Administrator." "Red"
    exit 1
}

$TempDir = Join-Path $env:TEMP "updater_install"

# Handle uninstall request
if ($Uninstall) {
    Uninstall-Updater
    exit 0
}

try {
    Write-ColorMessage "`nOpenFrame Client Updater Installation Started" "Green"
    Write-ColorMessage "=============================================" "Green"

    Write-VerboseMessage "Temporary directory: $TempDir"

    # Test server connectivity before attempting download
    if (-not (Test-ServerConnection -ServerUrl $Server)) {
        throw "Unable to connect to OpenFrame server at https://$Server"
    }

    [System.Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    $ProgressPreference = 'SilentlyContinue'

    # Clean up and create temp directory
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

    # Download the updater binary
    Write-ColorMessage "Downloading OpenFrame Client Updater:" "Yellow"
    $binaryUrl = "https://$Server/openframe_public/openframe-client-updater.exe"
    $binaryPath = Join-Path $TempDir "openframe-client-updater.exe"
    Write-ColorMessage "  * Binary location: $binaryPath" "Yellow"

    if (-not (Download-File -Url $binaryUrl -OutFile $binaryPath)) {
        throw "Failed to download openframe-client-updater binary"
    }

    if (-not (Test-Path $binaryPath)) {
        throw "Updater binary was not downloaded successfully"
    }
    Write-ColorMessage "Binary downloaded successfully." "Green"

    # Run the install subcommand — copies binary to Program Files and registers OS service
    Write-ColorMessage "Installing OpenFrame Client Updater service..." "Yellow"
    Write-VerboseMessage "Executing: $binaryPath install"

    $process = Start-Process -FilePath $binaryPath -ArgumentList "install" -Wait -NoNewWindow -PassThru
    if ($process.ExitCode -ne 0) {
        throw "Updater install command failed with exit code: $($process.ExitCode)"
    }

    # Clean up temp directory
    Write-VerboseMessage "Cleaning up temporary directory: $TempDir"
    Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

    Write-ColorMessage "`nInstallation Summary:" "Green"
    Write-ColorMessage "  * Installed to: $($env:ProgramFiles)\OpenFrame\bin\openframe-client-updater.exe" "Blue"
    Write-ColorMessage "  * Service registered: com.openframe.client-updater" "Blue"
    Write-ColorMessage "Installation completed successfully." "Green"
}
catch {
    Write-ColorMessage "`nInstallation Failed:" "Red"
    Write-ColorMessage "Error: $($_.Exception.Message)" "Red"
    Write-ColorMessage "Stack Trace: $($_.Exception.StackTrace)" "Red"
    exit 1
}
