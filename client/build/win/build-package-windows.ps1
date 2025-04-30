# PowerShell script to build OpenFrame Windows package
# Similar structure to build-package.sh but for Windows MSI creation
# TODO: Replace placeholder comments with actual implementation

# Set error handling
$ErrorActionPreference = "Stop"

# Colors for output (PowerShell equivalents)
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Parse arguments
$FORCE_DEV_MODE = $false
foreach ($arg in $args) {
    if ($arg -eq "--dev") {
        $FORCE_DEV_MODE = $true
    }
}

Write-ColorOutput "Blue" "Building OpenFrame for Windows..."

# Setup directory paths
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$CLIENT_DIR = Split-Path -Parent $SCRIPT_DIR
$TARGET_DIR = Join-Path $CLIENT_DIR "target"
$PKG_DIR = Join-Path $TARGET_DIR "pkg_build"
$PAYLOAD_ROOT = Join-Path $PKG_DIR "payload_root"
$PROGRAM_FILES_DIR = Join-Path $PAYLOAD_ROOT "Program Files"
$APP_DIR = Join-Path $PROGRAM_FILES_DIR "OpenFrame"
$LOGS_DIR = Join-Path $PAYLOAD_ROOT "ProgramData\OpenFrame\logs"
$SUPPORT_DIR = Join-Path $PAYLOAD_ROOT "ProgramData\OpenFrame"
$DIST_DIR = Join-Path $TARGET_DIR "dist"
$ASSETS_DIR = Join-Path $CLIENT_DIR "assets"
$PKG_ASSETS_DIR = Join-Path $ASSETS_DIR "pkg"

Write-ColorOutput "Blue" "Cleaning target directory..."
# Clean the target directory
cargo clean
if (Test-Path $TARGET_DIR) {
    Remove-Item -Recurse -Force $TARGET_DIR -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $TARGET_DIR
New-Item -ItemType Directory -Force -Path $PKG_DIR
New-Item -ItemType Directory -Force -Path $DIST_DIR
New-Item -ItemType Directory -Force -Path $APP_DIR
New-Item -ItemType Directory -Force -Path $LOGS_DIR
New-Item -ItemType Directory -Force -Path $SUPPORT_DIR

Write-ColorOutput "Blue" "Setting up build environment..."

# Check if Rust is installed
if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "Yellow" "Installing Rust..."
    Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile "$env:TEMP\rustup-init.exe"
    Start-Process -FilePath "$env:TEMP\rustup-init.exe" -ArgumentList "-y" -Wait
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
}

# Check if .NET SDK is installed
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "Yellow" "Installing .NET SDK..."
    Invoke-WebRequest -Uri https://dotnet.microsoft.com/download/dotnet/scripts/v1/dotnet-install.ps1 -OutFile "$env:TEMP\dotnet-install.ps1"
    & "$env:TEMP\dotnet-install.ps1" -Channel 9.0 -InstallDir "$env:ProgramFiles\dotnet"
    $env:Path = "$env:ProgramFiles\dotnet;$env:Path"
}

# Check if Velopack CLI is installed
if (-not (Get-Command vpk -ErrorAction SilentlyContinue)) {
    Write-ColorOutput "Yellow" "Installing Velopack CLI..."
    dotnet tool install --global vpk
    $env:Path = "$env:USERPROFILE\.dotnet\tools;$env:Path"
}

# Verify .NET and vpk are working
try {
    dotnet --version | Out-Null
}
catch {
    Write-ColorOutput "Red" "Error: .NET SDK installation failed"
    exit 1
}

try {
    vpk --help | Out-Null
}
catch {
    Write-ColorOutput "Red" "Error: Velopack CLI installation failed"
    exit 1
}

# Verify required files exist
if (-not (Test-Path (Join-Path $CLIENT_DIR "config\agent.toml"))) {
    Write-ColorOutput "Red" "Error: config/agent.toml not found"
    exit 1
}

Write-ColorOutput "Blue" "Building release version..."
cargo build --release --target x86_64-pc-windows-msvc

Write-ColorOutput "Blue" "Creating package structure..."

# Copy the binary to the app directory
Copy-Item "$TARGET_DIR\release\openframe.exe" $APP_DIR

# Generate a unique agent ID using UUID
$AGENT_UUID = [guid]::NewGuid().ToString().ToLower()
Write-ColorOutput "Blue" "Setting default agent ID to $AGENT_UUID..."

# Create a temporary copy with the updated agent ID
$TMP_CONFIG = [System.IO.Path]::GetTempFileName()
$configContent = Get-Content (Join-Path $CLIENT_DIR "config\agent.toml") -Raw
$configContent = $configContent -replace 'id = ""', "id = `"$AGENT_UUID`""

# Also ensure debug logging is enabled for initial deployment
Write-ColorOutput "Blue" "Setting debug logging in agent configuration..."
$configContent = $configContent -replace 'log_level = "info"', 'log_level = "debug"'

# Ensure log path is explicitly set
if (-not ($configContent -match "log_path")) {
    Write-ColorOutput "Blue" "Adding explicit log path to configuration..."
    $configContent = $configContent -replace '\[logging\]', "[logging]`nlog_path = `"C:\\ProgramData\\OpenFrame\\logs`"  # Explicit log path for Windows"
}

# Copy the modified config to both locations
$configContent | Set-Content $TMP_CONFIG
Copy-Item $TMP_CONFIG (Join-Path $APP_DIR "agent.toml")
Copy-Item $TMP_CONFIG (Join-Path $SUPPORT_DIR "agent.toml")
Remove-Item $TMP_CONFIG

# Create Windows service registration file (for post-install)
$ServiceInstallScript = @"
# PowerShell script to install OpenFrame as a Windows service
`$ServiceName = "OpenFrameClient"
`$ServicePath = "`$env:ProgramFiles\OpenFrame\openframe.exe"

# Check if service already exists
if (Get-Service -Name `$ServiceName -ErrorAction SilentlyContinue) {
    # Service exists, try to stop and remove it
    Stop-Service -Name `$ServiceName -Force
    `$service = Get-WmiObject -Class Win32_Service -Filter "Name='`$ServiceName'"
    `$service.delete()
}

# Create the service
New-Service -Name `$ServiceName -BinaryPathName `$ServicePath -DisplayName "OpenFrame Client" -Description "OpenFrame client for remote management and monitoring" -StartupType Automatic
Start-Service -Name `$ServiceName
"@

$ServiceInstallScript | Set-Content (Join-Path $PKG_DIR "scripts\install-service.ps1")

# TODO: Create the actual MSI using WiX Toolset or similar
# This is a placeholder - actual implementation needed
Write-ColorOutput "Yellow" "TODO: Create MSI package using WiX Toolset or similar"

# For now, just copy all files to the dist directory
$MSI_PATH = Join-Path $DIST_DIR "OpenFrame-Setup.msi"
Write-ColorOutput "Blue" "Creating MSI package at $MSI_PATH..."

# Here we would integrate with an MSI creation tool like WiX
# TODO: Actual MSI creation code

Write-ColorOutput "Green" "Build and packaging complete!"
Write-ColorOutput "Green" "MSI installer: $MSI_PATH" 