# Windows Testing Guide for OpenFrame CLI

This guide provides comprehensive instructions for testing the OpenFrame CLI on Windows, including the new Docker installation features.

## Prerequisites

### Required Software
- **Windows 10/11** (64-bit)
- **PowerShell 5.1+** (included with Windows 10/11)
- **Internet Connection** (for downloading dependencies)

### Test Environment Setup

1. **Clean Windows Environment (Recommended)**
   - Use a fresh Windows VM or clean Windows installation
   - This ensures testing starts from a clean state without existing Docker installations

2. **WSL2 Prerequisites**
   - Windows 10 version 2004+ or Windows 11
   - Virtualization enabled in BIOS
   - WSL2 installed (will be configured automatically by Docker Desktop)

## Testing Scenarios

### Scenario 1: Fresh Installation (No Docker)

This tests the complete automated installation flow.

#### Steps:

1. **Verify No Docker Exists**
   ```powershell
   # Should return nothing or error
   docker --version
   ```

2. **Build Windows CLI Binary**
   ```bash
   # On your Mac/Linux development machine
   cd cli
   make build
   ```

3. **Copy Binary to Windows Test Machine**
   - Transfer `openframe-windows-amd64.exe` to your Windows machine
   - Place it in a test directory (e.g., `C:\OpenFrame\`)

4. **Run CLI Without Docker**
   ```powershell
   cd C:\OpenFrame
   .\openframe-windows-amd64.exe cluster create
   ```

5. **Expected Behavior**
   - CLI detects Docker is missing
   - Prompts to install Docker automatically
   - If confirmed:
     - Installs Chocolatey (if not present)
     - Installs Docker Desktop via Chocolatey
     - Prompts for system restart if needed
   - If declined:
     - Shows manual installation instructions

6. **Verify Installation**
   ```powershell
   # After restart (if required)
   docker --version
   # Should show Docker version

   # Check Docker Desktop is running
   docker ps
   # Should list running containers (or empty list)
   ```

7. **Complete Cluster Creation**
   ```powershell
   .\openframe-windows-amd64.exe cluster create
   ```

### Scenario 2: Docker Installed But Not Running

This tests the Docker startup detection and automation.

#### Steps:

1. **Stop Docker Desktop**
   - Right-click Docker Desktop system tray icon
   - Select "Quit Docker Desktop"
   - Or via PowerShell:
     ```powershell
     Stop-Process -Name "Docker Desktop" -Force
     ```

2. **Verify Docker Is Stopped**
   ```powershell
   docker ps
   # Should return connection error
   ```

3. **Run CLI**
   ```powershell
   .\openframe-windows-amd64.exe cluster create
   ```

4. **Expected Behavior**
   - CLI detects Docker is installed but not running
   - Prompts to start Docker
   - If confirmed:
     - Starts Docker Desktop
     - Waits up to 60 seconds for Docker to be ready
     - Verifies Linux containers mode
   - If declined:
     - Shows manual start instructions

5. **Verify Docker Started**
   ```powershell
   docker ps
   # Should work without errors
   ```

### Scenario 3: Docker Running with Windows Containers

This tests the Linux containers mode verification.

#### Steps:

1. **Switch to Windows Containers**
   - Right-click Docker Desktop system tray icon
   - Select "Switch to Windows containers..."

2. **Run CLI**
   ```powershell
   .\openframe-windows-amd64.exe cluster create
   ```

3. **Expected Behavior**
   - CLI detects Docker is running
   - Verifies container mode
   - Shows warning: "Docker Desktop is not in Linux containers mode"
   - Prompts to switch to Linux containers
   - Provides instructions

### Scenario 4: Non-Interactive Mode

This tests the automated installation without user prompts.

#### Steps:

1. **Clean Environment**
   - Uninstall Docker Desktop if present
   - Remove Chocolatey: `Remove-Item -Recurse -Force $env:LOCALAPPDATA\choco`

2. **Run CLI with --yes flag (if implemented)**
   ```powershell
   .\openframe-windows-amd64.exe cluster create --yes
   ```

3. **Expected Behavior**
   - Automatically installs all prerequisites
   - No user prompts
   - Completes cluster creation or exits with clear error messages

### Scenario 5: Chocolatey Already Installed

This tests detection of existing Chocolatey installation.

#### Steps:

1. **Install Chocolatey Manually**
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Run CLI**
   ```powershell
   .\openframe-windows-amd64.exe cluster create
   ```

3. **Expected Behavior**
   - CLI detects existing Chocolatey
   - Skips Chocolatey installation
   - Proceeds to Docker installation

## Test Validation Checklist

After each scenario, verify:

- [ ] CLI detects system state correctly
- [ ] User prompts are clear and helpful
- [ ] Installation completes without errors
- [ ] Docker Desktop starts and is accessible
- [ ] Linux containers mode is active
- [ ] Error messages are descriptive
- [ ] Manual fallback instructions are provided
- [ ] Cluster creation succeeds after prerequisites are met

## Common Issues and Troubleshooting

### Issue 1: Chocolatey Installation Fails

**Symptoms:**
```
failed to install Chocolatey: exit status 1
```

**Solutions:**
1. Check execution policy:
   ```powershell
   Get-ExecutionPolicy
   # Should be RemoteSigned or Unrestricted
   ```

2. Manually set execution policy:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Check internet connectivity:
   ```powershell
   Test-NetConnection community.chocolatey.org -Port 443
   ```

### Issue 2: Docker Desktop Won't Start

**Symptoms:**
```
timeout waiting for Docker Desktop to start after 60 seconds
```

**Solutions:**
1. Check WSL2 is installed:
   ```powershell
   wsl --status
   ```

2. Install WSL2 if missing:
   ```powershell
   wsl --install
   # Restart required
   ```

3. Check Hyper-V is enabled (Windows 10 Pro/Enterprise):
   ```powershell
   Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V
   ```

4. Check virtualization in Task Manager:
   - Open Task Manager
   - Performance tab
   - CPU section
   - "Virtualization" should show "Enabled"

### Issue 3: Docker Path Not Found

**Symptoms:**
```
could not find or start Docker Desktop
```

**Solutions:**
1. Verify Docker Desktop installation:
   ```powershell
   Get-ItemProperty HKCU:\Software\Docker* | Select-Object -ExpandProperty InstallLocation
   ```

2. Check common paths manually:
   ```powershell
   Test-Path "$env:USERPROFILE\AppData\Local\Docker\Docker Desktop.exe"
   Test-Path "C:\Program Files\Docker\Docker\Docker Desktop.exe"
   ```

### Issue 4: Linux Containers Mode Warning

**Symptoms:**
```
Docker Desktop is not in Linux containers mode (current: windows)
```

**Solutions:**
1. Switch via Docker Desktop GUI:
   - Right-click system tray icon
   - Select "Switch to Linux containers..."

2. Or via command line:
   ```powershell
   & "C:\Program Files\Docker\Docker\DockerCli.exe" -SwitchLinuxEngine
   ```

### Issue 5: Permission Denied Errors

**Symptoms:**
```
Access is denied
```

**Solutions:**
1. Run PowerShell as Administrator:
   - Right-click PowerShell
   - "Run as Administrator"

2. Check user is in docker-users group:
   ```powershell
   net localgroup docker-users
   ```

3. Add user to docker-users group:
   ```powershell
   net localgroup docker-users $env:USERNAME /add
   # Restart required
   ```

## Automated Test Script

Create a PowerShell test script for automated validation:

```powershell
# test-openframe-windows.ps1

Write-Host "OpenFrame CLI Windows Test Suite" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Test 1: Check CLI binary exists
Write-Host "`n[TEST 1] Checking CLI binary..." -ForegroundColor Yellow
if (Test-Path ".\openframe-windows-amd64.exe") {
    Write-Host "✓ CLI binary found" -ForegroundColor Green
} else {
    Write-Host "✗ CLI binary not found" -ForegroundColor Red
    exit 1
}

# Test 2: Check Docker installation
Write-Host "`n[TEST 2] Checking Docker..." -ForegroundColor Yellow
$dockerVersion = docker --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker installed: $dockerVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Docker not installed" -ForegroundColor Red
}

# Test 3: Check Docker running
Write-Host "`n[TEST 3] Checking Docker daemon..." -ForegroundColor Yellow
$dockerPs = docker ps 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Docker daemon running" -ForegroundColor Green
} else {
    Write-Host "✗ Docker daemon not running" -ForegroundColor Red
}

# Test 4: Check Linux containers mode
Write-Host "`n[TEST 4] Checking container mode..." -ForegroundColor Yellow
$osType = docker info --format "{{.OSType}}" 2>$null
if ($osType -eq "linux") {
    Write-Host "✓ Linux containers mode active" -ForegroundColor Green
} else {
    Write-Host "✗ Not in Linux containers mode: $osType" -ForegroundColor Red
}

# Test 5: Run CLI help command
Write-Host "`n[TEST 5] Testing CLI help..." -ForegroundColor Yellow
$helpOutput = .\openframe-windows-amd64.exe --help 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ CLI help command works" -ForegroundColor Green
} else {
    Write-Host "✗ CLI help command failed" -ForegroundColor Red
}

# Test 6: Check prerequisites
Write-Host "`n[TEST 6] Checking prerequisites..." -ForegroundColor Yellow
$prereqs = @("kubectl", "k3d")
foreach ($prereq in $prereqs) {
    $version = & $prereq version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $prereq installed" -ForegroundColor Green
    } else {
        Write-Host "✗ $prereq not installed" -ForegroundColor Yellow
    }
}

Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "Test suite completed" -ForegroundColor Cyan
```

## Running the Test Script

```powershell
# Save the script and run
.\test-openframe-windows.ps1
```

## Performance Benchmarks

Track these metrics during testing:

- **Chocolatey Installation Time**: ~30-60 seconds
- **Docker Desktop Installation Time**: ~3-5 minutes
- **Docker Desktop Startup Time**: ~30-60 seconds
- **Total Fresh Install Time**: ~5-7 minutes
- **Cluster Creation Time**: ~2-3 minutes

## Reporting Issues

When reporting Windows-specific issues, include:

1. **System Information**:
   ```powershell
   systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
   ```

2. **PowerShell Version**:
   ```powershell
   $PSVersionTable.PSVersion
   ```

3. **Docker Info**:
   ```powershell
   docker version
   docker info
   ```

4. **CLI Output**: Copy full CLI output including errors

5. **Event Viewer Logs**: Check for Docker-related errors
   - Open Event Viewer
   - Windows Logs → Application
   - Filter by "Docker"

## Next Steps After Testing

1. Document any discovered issues in GitHub
2. Update this guide with new scenarios
3. Create automated CI/CD tests for Windows
4. Consider adding telemetry for common failure modes
5. Improve error messages based on testing feedback

## Additional Resources

- [Docker Desktop for Windows Documentation](https://docs.docker.com/desktop/install/windows-install/)
- [Chocolatey Documentation](https://docs.chocolatey.org/en-us/)
- [WSL2 Installation Guide](https://docs.microsoft.com/en-us/windows/wsl/install)
- [K3d Documentation](https://k3d.io/)
