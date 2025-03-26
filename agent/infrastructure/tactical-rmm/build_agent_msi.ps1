#
# build_agent_msi.ps1
#
# Purpose:
#   - Build Tactical RMM agent for Windows AMD64
#   - Create MSI installer with configurable parameters
#   - Output: MSI installer that can be distributed
#
# Usage:
#   .\build_agent_msi.ps1
#   .\build_agent_msi.ps1 -BuildFolder "rmmagent" -OutputFolder "dist" -Version "1.0.0"
#
# Requirements:
#   - Windows AMD64
#   - PowerShell 5.1 or higher
#   - Administrator privileges
#   - Go 1.21.6 or higher
#   - Git
#   - WiX Toolset (for MSI creation)

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$BuildFolder = "rmmagent",

    [Parameter(Mandatory=$false)]
    [string]$OutputFolder = "dist",

    [Parameter(Mandatory=$false)]
    [string]$Version = "1.0.0"
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

function Install-WiXToolset {
    Write-ColorMessage "Installing WiX Toolset..." "Yellow"

    # Check if WiX is already installed
    if (Test-Path "C:\Program Files (x86)\WiX Toolset v3.11") {
        Write-ColorMessage "WiX Toolset is already installed." "Green"
        return
    }

    # Download WiX Toolset installer
    $wixUrl = "https://github.com/wixtoolset/wix3/releases/download/wix3112rtm/wix311-binaries.zip"
    $wixZip = Join-Path $env:TEMP "wix311-binaries.zip"

    Write-ColorMessage "Downloading WiX Toolset..." "Yellow"
    Invoke-WebRequest -Uri $wixUrl -OutFile $wixZip

    # Create WiX directory
    $wixDir = "C:\Program Files (x86)\WiX Toolset v3.11"
    New-Item -ItemType Directory -Path $wixDir -Force | Out-Null

    # Extract WiX
    Write-ColorMessage "Extracting WiX Toolset..." "Yellow"
    Expand-Archive -Path $wixZip -DestinationPath $wixDir -Force

    # Add WiX to PATH
    $env:Path += ";$wixDir"
    [System.Environment]::SetEnvironmentVariable("Path", $env:Path, "Machine")

    # Cleanup
    Remove-Item $wixZip -Force

    Write-ColorMessage "WiX Toolset installed successfully." "Green"
}

function Install-Go {
    Write-ColorMessage "Installing Go..." "Yellow"

    # Check if Go is already installed
    if (Get-Command "go" -ErrorAction SilentlyContinue) {
        Write-ColorMessage "Go is already installed." "Green"
        return
    }

    # Download Go installer
    $goUrl = "https://golang.org/dl/go1.21.6.windows-amd64.msi"
    $goInstaller = Join-Path $env:TEMP "go1.21.6.windows-amd64.msi"

    Write-ColorMessage "Downloading Go..." "Yellow"
    Invoke-WebRequest -Uri $goUrl -OutFile $goInstaller

    # Install Go
    Write-ColorMessage "Installing Go..." "Yellow"
    Start-Process msiexec.exe -ArgumentList "/i `"$goInstaller`" /quiet /norestart" -Wait

    # Add Go to PATH
    $env:Path += ";C:\Go\bin"
    [System.Environment]::SetEnvironmentVariable("Path", $env:Path, "Machine")

    # Cleanup
    Remove-Item $goInstaller -Force

    Write-ColorMessage "Go installed successfully." "Green"
}

function Install-Git {
    Write-ColorMessage "Installing Git..." "Yellow"

    # Check if Git is already installed
    if (Get-Command "git" -ErrorAction SilentlyContinue) {
        Write-ColorMessage "Git is already installed." "Green"
        return
    }

    # Download Git installer
    $gitUrl = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
    $gitInstaller = Join-Path $env:TEMP "Git-2.43.0-64-bit.exe"

    Write-ColorMessage "Downloading Git..." "Yellow"
    Invoke-WebRequest -Uri $gitUrl -OutFile $gitInstaller

    # Install Git
    Write-ColorMessage "Installing Git..." "Yellow"
    Start-Process $gitInstaller -ArgumentList "/VERYSILENT /NORESTART /SUPPRESSMSGBOXES" -Wait

    # Cleanup
    Remove-Item $gitInstaller -Force

    Write-ColorMessage "Git installed successfully." "Green"
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

function Create-MSIInstaller {
    param(
        [string]$Version,
        [string]$OutputFolder
    )

    Write-ColorMessage "Creating MSI installer..." "Yellow"

    # Create WiX source file
    $wxsContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
    <Product Id="*" Name="Tactical RMM Agent" Language="1033" Version="$Version" Manufacturer="Tactical RMM" UpgradeCode="12345678-1234-1234-1234-123456789012">
        <Package InstallerVersion="200" Compressed="yes" InstallScope="perMachine" />
        <MajorUpgrade DowngradeErrorMessage="A newer version is already installed." />
        <MediaTemplate EmbedCab="yes" />

        <Feature Id="ProductFeature" Title="TacticalRMMAgent" Level="1">
            <ComponentGroupRef Id="ProductComponents" />
        </Feature>

        <Property Id="WIXUI_INSTALLDIR" Value="INSTALLFOLDER" />
        <UIRef Id="WixUI_InstallDir" />

        <Directory Id="TARGETDIR" Name="SourceDir">
            <Directory Id="ProgramFiles64Folder">
                <Directory Id="INSTALLFOLDER" Name="TacticalAgent" />
            </Directory>
            <Directory Id="ProgramMenuFolder">
                <Directory Id="ApplicationProgramsFolder" Name="Tactical RMM Agent" />
            </Directory>
        </Directory>

        <ComponentGroup Id="ProductComponents" Directory="INSTALLFOLDER">
            <Component Id="MainExecutable">
                <File Id="RMMAgentEXE" Name="tacticalrmm.exe" Source="rmmagent.exe" KeyPath="yes" />
                <ServiceControl Id="StartService" Name="tacticalrmm" Start="install" Stop="uninstall" Remove="uninstall" />
                <ServiceInstall Id="ServiceInstaller" Type="ownProcess" Name="tacticalrmm" DisplayName="Tactical RMM Agent" Description="Tactical RMM Agent Service" Start="auto" Account="LocalSystem" />
            </Component>
        </ComponentGroup>

        <Property Id="MSIINSTALLER" Value="1" />
        <Property Id="ALLUSERS" Value="1" />
    </Product>
</Wix>
"@

    # Create WiX source file
    $wxsFile = "TacticalRMMAgent.wxs"
    Set-Content -Path $wxsFile -Value $wxsContent

    # Create output directory
    if (-not (Test-Path $OutputFolder)) {
        New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
    }

    # Compile WiX source
    Write-ColorMessage "Compiling MSI..." "Yellow"
    $msiFile = Join-Path $OutputFolder "TacticalRMMAgent-$Version.msi"
    & candle.exe $wxsFile
    & light.exe -ext WixUIExtension TacticalRMMAgent.wixobj -out $msiFile

    if (Test-Path $msiFile) {
        Write-ColorMessage "MSI created successfully: $msiFile" "Green"
    } else {
        Write-ColorMessage "Error: Failed to create MSI." "Red"
        exit 1
    }

    # Cleanup
    Remove-Item "TacticalRMMAgent.wxs" -Force
    Remove-Item "TacticalRMMAgent.wixobj" -Force
    Remove-Item "TacticalRMMAgent.wixpdb" -Force
}

# Main script flow
try {
    Write-ColorMessage "`nTactical RMM Agent Build Process Started" "Green"
    Write-ColorMessage "======================================" "Green"

    # Store the original directory
    $originalDir = Get-Location

    # Install required tools
    Install-WiXToolset
    Install-Go
    Install-Git

    # Create build directory
    if (Test-Path $BuildFolder) {
        Write-ColorMessage "Removing existing build folder..." "Yellow"
        Remove-Item -Path $BuildFolder -Recurse -Force
    }
    New-Item -ItemType Directory -Path $BuildFolder -Force | Out-Null
    Set-Location $BuildFolder

    # Clone repository
    Clone-Repository -RepoUrl "https://github.com/amidaware/rmmagent.git" -Branch "master" -Folder "."

    # Compile agent
    Compile-Agent

    # Create MSI installer
    Create-MSIInstaller -Version $Version -OutputFolder $OutputFolder

    # Return to original directory
    Set-Location $originalDir

    Write-ColorMessage "`nBuild process completed successfully!" "Green"
    Write-ColorMessage "MSI installer location: $OutputFolder\TacticalRMMAgent-$Version.msi" "Green"
}
catch {
    Write-ColorMessage "`nBuild Failed:" "Red"
    Write-ColorMessage "Error: $($_.Exception.Message)" "Red"
    Write-ColorMessage "Stack Trace: $($_.Exception.StackTrace)" "Red"
    exit 1
}