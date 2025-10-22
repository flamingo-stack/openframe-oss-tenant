package docker

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type DockerInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isDockerInstalled() bool {
	// Just check if docker command exists, don't try to connect to daemon
	return commandExists("docker")
}

func IsDockerRunning() bool {
	if !commandExists("docker") {
		return false
	}
	// Check if Docker daemon is accessible by running docker ps
	cmd := exec.Command("docker", "ps")
	err := cmd.Run()
	return err == nil
}

func IsDockerInstalledButNotRunning() bool {
	// Docker command exists but daemon is not accessible
	return isDockerInstalled() && !IsDockerRunning()
}

func dockerInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "Docker: Install Docker Desktop from https://docker.com/products/docker-desktop or run 'brew install --cask docker'"
	case "linux":
		return "Docker: Install using your package manager or from https://docs.docker.com/engine/install/"
	case "windows":
		return "Docker: Install Docker Desktop from https://docker.com/products/docker-desktop"
	default:
		return "Docker: Please install Docker from https://docker.com/"
	}
}

func NewDockerInstaller() *DockerInstaller {
	return &DockerInstaller{}
}

func (d *DockerInstaller) IsInstalled() bool {
	return isDockerInstalled()
}

func (d *DockerInstaller) GetInstallHelp() string {
	return dockerInstallHelp()
}

func (d *DockerInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return d.installMacOS()
	case "linux":
		return d.installLinux()
	case "windows":
		return d.installWindows()
	default:
		return fmt.Errorf("automatic Docker installation not supported on %s", runtime.GOOS)
	}
}

func (d *DockerInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic Docker installation on macOS. Please install brew first: https://brew.sh")
	}

	fmt.Println("Installing Docker Desktop via Homebrew...")
	cmd := exec.Command("brew", "install", "--cask", "docker")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Docker Desktop: %w", err)
	}

	fmt.Println("Starting Docker Desktop...")
	cmd = exec.Command("open", "-a", "Docker")
	if err := cmd.Run(); err != nil {
		fmt.Printf("Warning: Could not start Docker Desktop automatically: %v\n", err)
		fmt.Println("Please start Docker Desktop manually from Applications")
	}

	return nil
}

func (d *DockerInstaller) installLinux() error {
	if commandExists("apt") {
		return d.installUbuntu()
	} else if commandExists("yum") {
		return d.installRedHat()
	} else if commandExists("dnf") {
		return d.installFedora()
	} else if commandExists("pacman") {
		return d.installArch()
	} else {
		return fmt.Errorf("no supported package manager found. Please install Docker manually from https://docs.docker.com/engine/install/")
	}
}

func (d *DockerInstaller) installUbuntu() error {
	fmt.Println("Installing Docker on Ubuntu/Debian...")

	commands := [][]string{
		{"sudo", "apt", "update"},
		{"sudo", "apt", "install", "-y", "apt-transport-https", "ca-certificates", "curl", "gnupg", "lsb-release"},
	}

	for _, cmdArgs := range commands {
		if err := d.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to run %s: %w", cmdArgs[0], err)
		}
	}

	// Add Docker's official GPG key
	gpgCmd := "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg"
	if err := d.runShellCommand(gpgCmd); err != nil {
		return fmt.Errorf("failed to add Docker GPG key: %w", err)
	}

	// Add Docker repository
	repoCmd := `echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`
	if err := d.runShellCommand(repoCmd); err != nil {
		return fmt.Errorf("failed to add Docker repository: %w", err)
	}

	// Install Docker
	installCommands := [][]string{
		{"sudo", "apt", "update"},
		{"sudo", "apt", "install", "-y", "docker-ce", "docker-ce-cli", "containerd.io"},
		{"sudo", "systemctl", "enable", "docker"},
		{"sudo", "systemctl", "start", "docker"},
	}

	for _, cmdArgs := range installCommands {
		if err := d.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to run %s: %w", cmdArgs[0], err)
		}
	}

	// Add user to docker group
	user := os.Getenv("USER")
	if user != "" {
		if err := d.runCommand("sudo", "usermod", "-aG", "docker", user); err != nil {
			fmt.Printf("Warning: Could not add user to docker group: %v\n", err)
		} else {
			fmt.Println("Note: You may need to log out and back in for Docker group permissions to take effect")
		}
	}

	return nil
}

func (d *DockerInstaller) installRedHat() error {
	fmt.Println("Installing Docker on CentOS/RHEL...")

	commands := [][]string{
		{"sudo", "yum", "install", "-y", "yum-utils"},
		{"sudo", "yum-config-manager", "--add-repo", "https://download.docker.com/linux/centos/docker-ce.repo"},
		{"sudo", "yum", "install", "-y", "docker-ce", "docker-ce-cli", "containerd.io"},
		{"sudo", "systemctl", "enable", "docker"},
		{"sudo", "systemctl", "start", "docker"},
	}

	for _, cmdArgs := range commands {
		if err := d.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to run %s: %w", cmdArgs[0], err)
		}
	}

	// Add user to docker group
	user := os.Getenv("USER")
	if user != "" {
		if err := d.runCommand("sudo", "usermod", "-aG", "docker", user); err != nil {
			fmt.Printf("Warning: Could not add user to docker group: %v\n", err)
		} else {
			fmt.Println("Note: You may need to log out and back in for Docker group permissions to take effect")
		}
	}

	return nil
}

func (d *DockerInstaller) installFedora() error {
	fmt.Println("Installing Docker on Fedora...")

	commands := [][]string{
		{"sudo", "dnf", "install", "-y", "dnf-plugins-core"},
		{"sudo", "dnf", "config-manager", "--add-repo", "https://download.docker.com/linux/fedora/docker-ce.repo"},
		{"sudo", "dnf", "install", "-y", "docker-ce", "docker-ce-cli", "containerd.io"},
		{"sudo", "systemctl", "enable", "docker"},
		{"sudo", "systemctl", "start", "docker"},
	}

	for _, cmdArgs := range commands {
		if err := d.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to run %s: %w", cmdArgs[0], err)
		}
	}

	// Add user to docker group
	user := os.Getenv("USER")
	if user != "" {
		if err := d.runCommand("sudo", "usermod", "-aG", "docker", user); err != nil {
			fmt.Printf("Warning: Could not add user to docker group: %v\n", err)
		} else {
			fmt.Println("Note: You may need to log out and back in for Docker group permissions to take effect")
		}
	}

	return nil
}

func (d *DockerInstaller) installArch() error {
	fmt.Println("Installing Docker on Arch Linux...")

	commands := [][]string{
		{"sudo", "pacman", "-S", "--noconfirm", "docker"},
		{"sudo", "systemctl", "enable", "docker"},
		{"sudo", "systemctl", "start", "docker"},
	}

	for _, cmdArgs := range commands {
		if err := d.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to run %s: %w", cmdArgs[0], err)
		}
	}

	// Add user to docker group
	user := os.Getenv("USER")
	if user != "" {
		if err := d.runCommand("sudo", "usermod", "-aG", "docker", user); err != nil {
			fmt.Printf("Warning: Could not add user to docker group: %v\n", err)
		} else {
			fmt.Println("Note: You may need to log out and back in for Docker group permissions to take effect")
		}
	}

	return nil
}

func (d *DockerInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	// Completely silence output during installation
	return cmd.Run()
}

func (d *DockerInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	// Completely silence output during installation
	return cmd.Run()
}

// StartDocker attempts to start Docker based on the operating system
func StartDocker() error {
	switch runtime.GOOS {
	case "darwin":
		return startDockerMacOS()
	case "linux":
		return startDockerLinux()
	case "windows":
		return startDockerWindows()
	default:
		return fmt.Errorf("starting Docker is not supported on %s", runtime.GOOS)
	}
}

func startDockerMacOS() error {
	// Try to start Docker Desktop on macOS
	cmd := exec.Command("open", "-a", "Docker")
	if err := cmd.Run(); err != nil {
		// Try alternative command
		cmd = exec.Command("open", "/Applications/Docker.app")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to start Docker Desktop: %w", err)
		}
	}
	return nil
}

func startDockerLinux() error {
	// Try to start Docker daemon on Linux
	// First check if systemctl exists (systemd)
	if commandExists("systemctl") {
		cmd := exec.Command("sudo", "systemctl", "start", "docker")
		if err := cmd.Run(); err != nil {
			// Try without sudo in case user has permissions
			cmd = exec.Command("systemctl", "start", "docker")
			if err := cmd.Run(); err != nil {
				return fmt.Errorf("failed to start Docker daemon with systemctl: %w", err)
			}
		}
		return nil
	}

	// Try service command (older systems)
	if commandExists("service") {
		cmd := exec.Command("sudo", "service", "docker", "start")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to start Docker daemon with service: %w", err)
		}
		return nil
	}

	return fmt.Errorf("unable to start Docker daemon: no supported init system found")
}

func (d *DockerInstaller) installWindows() error {
	fmt.Println("Installing Docker on Windows...")

	// Detect if this is Windows Server
	isServer, err := IsWindowsServer()
	if err != nil {
		fmt.Printf("Warning: Could not detect Windows edition: %v\n", err)
		fmt.Println("Assuming Windows Desktop...")
		isServer = false
	}

	// Check Hyper-V hardware capability for Desktop editions (not needed for Server)
	if !isServer {
		fmt.Println("Checking hardware virtualization support...")
		capable, err := CheckHyperVCapability()
		if err != nil {
			fmt.Printf("Warning: Could not determine Hyper-V capability: %v\n", err)
			fmt.Println("Proceeding anyway, but Docker Desktop may not work...")
		} else if !capable {
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println("⚠  HARDWARE VIRTUALIZATION NOT SUPPORTED")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()
			fmt.Println(GetHyperVCapabilityMessage())
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			return fmt.Errorf("OpenFrame CLI is not supported on this system due to lack of virtualization features")
		}
		fmt.Println("✓ Hardware virtualization is supported")
	}

	if isServer {
		fmt.Println("Detected: Windows Server - will install Docker Engine")
	} else {
		fmt.Println("Detected: Windows Desktop - will install Docker Desktop")
		fmt.Println("Note: Installation requires user interaction for Docker Desktop installer.")
	}

	// Step 1: Install Chocolatey if needed
	fmt.Println("\nStep 1/2: Checking Chocolatey package manager...")

	// Check if chocolatey is actually installed by checking the file path
	chocoPath := d.getChocoPath()
	if _, err := os.Stat(chocoPath); os.IsNotExist(err) {
		fmt.Println("Installing Chocolatey (this may take several minutes)...")
		if err := d.installChocolatey(); err != nil {
			return fmt.Errorf("failed to install Chocolatey: %w", err)
		}
		fmt.Println("Chocolatey installed successfully.")
	} else {
		fmt.Println("Chocolatey is already installed.")
		fmt.Printf("Found at: %s\n", chocoPath)
	}

	// Step 2: Install Docker (Engine for Server, Desktop for Windows)
	fmt.Println("\nStep 2/2: Installing Docker...")
	if isServer {
		return d.installDockerEngine()
	}
	return d.installDockerDesktop()
}

// getChocoPath returns the path to choco.exe, checking user-local installation first
func (d *DockerInstaller) getChocoPath() string {
	// Try user-local installation first (%LOCALAPPDATA%\choco\bin\choco.exe)
	userChocoPath := os.Getenv("LOCALAPPDATA") + "\\choco\\bin\\choco.exe"
	if _, err := os.Stat(userChocoPath); err == nil {
		return userChocoPath
	}

	// Try system-wide installation (C:\ProgramData\chocolatey\bin\choco.exe)
	systemChocoPath := "C:\\ProgramData\\chocolatey\\bin\\choco.exe"
	if _, err := os.Stat(systemChocoPath); err == nil {
		return systemChocoPath
	}

	// If choco is in PATH, just use "choco"
	if commandExists("choco") {
		return "choco"
	}

	// Default to user-local path (will be created by installation)
	return userChocoPath
}

func (d *DockerInstaller) installChocolatey() error {
	fmt.Println("Installing Chocolatey package manager (user-only mode)...")
	fmt.Println("Note: This is a fully automated installation with no dialogs or prompts.")

	// Non-admin Chocolatey installation
	// Reference: https://docs.chocolatey.org/en-us/choco/setup#non-administrative-install
	userChocoPath := os.Getenv("LOCALAPPDATA") + "\\choco"

	installScript := `
# Set environment variable for non-admin install
$ChocolateyInstall = "$env:LOCALAPPDATA\choco"
[System.Environment]::SetEnvironmentVariable('ChocolateyInstall', $ChocolateyInstall, [System.EnvironmentVariableTarget]::User)
$env:ChocolateyInstall = $ChocolateyInstall

# Download and run installer
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Show what was installed
Write-Host "Chocolatey installation directory contents:"
if (Test-Path "$ChocolateyInstall\bin") {
    Get-ChildItem "$ChocolateyInstall\bin" | Select-Object Name, Length | Format-Table -AutoSize
} else {
    Write-Host "WARNING: bin directory not found!"
    Get-ChildItem $ChocolateyInstall | Select-Object Name | Format-Table -AutoSize
}
`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", installScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Chocolatey in user mode: %w", err)
	}

	fmt.Printf("Chocolatey installation script completed. Checking %s\n", userChocoPath)

	// Update PATH for current session - use user's local chocolatey installation
	userChocoBinPath := userChocoPath + "\\bin"
	currentPath := os.Getenv("PATH")
	if !strings.Contains(currentPath, userChocoBinPath) {
		_ = os.Setenv("PATH", userChocoBinPath+";"+currentPath)
	}

	// Also set ChocolateyInstall for current session
	_ = os.Setenv("ChocolateyInstall", userChocoPath)

	// Configure Chocolatey for fully unattended operation
	fmt.Println("Configuring Chocolatey for unattended installation...")

	// Use the full path to choco.exe since PATH may not be updated yet
	chocoExePath := userChocoBinPath + "\\choco.exe"

	// First verify the installation by checking if choco.exe exists
	if _, err := os.Stat(chocoExePath); os.IsNotExist(err) {
		// Try to diagnose the issue
		fmt.Printf("ERROR: choco.exe not found at expected location: %s\n", chocoExePath)
		fmt.Println("Checking what was actually installed...")

		// Check what's in the chocolatey directory
		checkCmd := exec.Command("powershell", "-Command", fmt.Sprintf("Get-ChildItem '%s' -Recurse | Select-Object FullName", userChocoPath))
		if output, err := checkCmd.CombinedOutput(); err == nil {
			fmt.Printf("Contents of %s:\n%s\n", userChocoPath, string(output))
		}

		return fmt.Errorf("chocolatey installation completed but choco.exe not found at %s - installation may have failed silently", chocoExePath)
	}

	configCmd := exec.Command(chocoExePath, "feature", "enable", "-n", "allowGlobalConfirmation")
	configCmd.Env = append(os.Environ(), "ChocolateyInstall="+userChocoPath)
	_ = configCmd.Run() // Ignore errors, proceed anyway

	fmt.Println("Chocolatey user-only installation completed successfully!")
	fmt.Printf("Chocolatey installed to: %s\n", userChocoPath)
	fmt.Printf("Chocolatey executable: %s\n", chocoExePath)

	// Test that choco command works
	testCmd := exec.Command(chocoExePath, "--version")
	testCmd.Env = append(os.Environ(), "ChocolateyInstall="+userChocoPath)
	if output, err := testCmd.CombinedOutput(); err != nil {
		fmt.Printf("Warning: Chocolatey installed but cannot execute: %v\n", err)
		fmt.Printf("Output: %s\n", string(output))
	} else {
		fmt.Printf("Chocolatey version: %s", string(output))
	}

	return nil
}

// installDockerEngineViaChocolatey is a fallback method if DockerMsftProvider fails
func (d *DockerInstaller) installDockerEngineViaChocolatey() error {
	fmt.Println("Installing Docker Engine via Chocolatey...")
	fmt.Println("Note: This is a fully unattended installation with no user prompts.")

	// Get choco path - try user-local first, then system-wide
	chocoPath := d.getChocoPath()

	// Use flags for completely silent, unattended installation
	cmd := exec.Command(chocoPath, "install", "docker-engine", "-y", "--no-progress", "--force", "--accept-license", "--confirm", "--limit-output")

	// Set environment variables for Chocolatey
	cmd.Env = append(os.Environ(), "ChocolateyInstall="+os.Getenv("LOCALAPPDATA")+"\\choco")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		// Check if error message contains .NET or reboot related text
		errMsg := err.Error()
		if strings.Contains(errMsg, "exit status") {
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println("⚠  SYSTEM REBOOT REQUIRED")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()
			fmt.Println("Chocolatey has installed .NET Framework 4.8, but a system")
			fmt.Println("reboot is required before Docker can be installed.")
			fmt.Println()
			fmt.Println("Next steps:")
			fmt.Println("  1. Restart your computer now")
			fmt.Println("  2. Run this installer again after reboot")
			fmt.Println("  3. Docker Engine will install successfully")
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			return fmt.Errorf("system reboot required - please restart and run again")
		}
		return fmt.Errorf("failed to install Docker Engine via Chocolatey: %w", err)
	}

	fmt.Println("Docker Engine installed successfully.")
	return nil
}

func (d *DockerInstaller) installDockerEngine() error {
	fmt.Println("Installing Docker Engine using Microsoft's official method...")
	fmt.Println()

	// Step 0: Install NuGet provider first (required for PowerShell Gallery)
	fmt.Println("Step 1/4: Installing NuGet provider...")
	nugetCmd := exec.Command("powershell", "-Command",
		"Install-PackageProvider -Name NuGet -Scope CurrentUser -Force -ErrorAction SilentlyContinue")
	nugetCmd.Stdout = os.Stdout
	nugetCmd.Stderr = os.Stderr
	_ = nugetCmd.Run() // Ignore errors, may already be installed

	// Step 1: Install DockerMsftProvider module (user scope - no admin required)
	fmt.Println("Step 2/4: Installing DockerMsftProvider PowerShell module...")
	installModuleCmd := exec.Command("powershell", "-Command",
		"Install-Module -Name DockerMsftProvider -Repository PSGallery -Scope CurrentUser -Force")
	installModuleCmd.Stdout = os.Stdout
	installModuleCmd.Stderr = os.Stderr

	if err := installModuleCmd.Run(); err != nil {
		fmt.Printf("Warning: Could not install DockerMsftProvider module: %v\n", err)
		fmt.Println("Falling back to Chocolatey installation method...")
		return d.installDockerEngineViaChocolatey()
	}

	fmt.Println("DockerMsftProvider module installed successfully.")
	fmt.Println()

	// Step 2: Install Docker Engine and Client
	fmt.Println("Step 3/4: Installing Docker Engine and Client...")
	fmt.Println("(This may take several minutes, please wait...)")
	installDockerCmd := exec.Command("powershell", "-Command",
		"Install-Package -Name docker -ProviderName DockerMsftProvider -Force")
	installDockerCmd.Stdout = os.Stdout
	installDockerCmd.Stderr = os.Stderr

	if err := installDockerCmd.Run(); err != nil {
		fmt.Printf("Warning: Could not install Docker via DockerMsftProvider: %v\n", err)
		fmt.Println("Falling back to Chocolatey installation method...")
		return d.installDockerEngineViaChocolatey()
	}

	fmt.Println("Docker Engine installed successfully.")
	fmt.Println()

	// Step 3: Enable Windows Containers feature on Windows Server
	fmt.Println("Step 4/4: Enabling Windows Containers feature...")
	containersCmd := exec.Command("powershell", "-Command", "Install-WindowsFeature -Name Containers -Restart:$false | Select-Object -ExpandProperty RestartNeeded")
	output, err := containersCmd.CombinedOutput()
	outputStr := string(output)

	if err != nil {
		fmt.Printf("Warning: Could not enable Containers feature: %v\n", err)
		fmt.Println("You may need to enable it manually: Install-WindowsFeature -Name Containers")
	} else {
		fmt.Println("Windows Containers feature enabled.")

		// Check if restart is explicitly required
		if strings.Contains(outputStr, "Yes") || strings.Contains(outputStr, "True") {
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println("⚠  SYSTEM REBOOT REQUIRED")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()
			fmt.Println("The Windows Containers feature has been installed, but a system")
			fmt.Println("reboot is REQUIRED before Docker Engine can start.")
			fmt.Println()
			fmt.Println("Next steps:")
			fmt.Println("  1. Restart your computer now: shutdown /r /t 0")
			fmt.Println("  2. Docker service will start automatically after reboot")
			fmt.Println()
			fmt.Println("After reboot, verify Docker is running:")
			fmt.Println("  powershell -Command \"Get-Service Docker\"")
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			return nil // Don't try to start Docker if restart is required
		}

		fmt.Println("Note: A system restart may be required for the feature to take full effect.")
	}

	// Start Docker service on Windows Server with retry logic
	fmt.Println("\nStarting Docker service...")

	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			fmt.Printf("Retry %d/%d: Waiting for Docker service to be ready...\n", i, maxRetries-1)
			time.Sleep(5 * time.Second)
		}

		startCmd := exec.Command("powershell", "-Command", "Start-Service Docker; Set-Service -Name Docker -StartupType Automatic")
		startCmd.Stdout = os.Stdout
		startCmd.Stderr = os.Stderr

		if err := startCmd.Run(); err != nil {
			continue
		}

		// Success!
		fmt.Println("Docker service started and configured for automatic startup")
		return nil
	}

	// All retries failed - show restart message
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("⚠  SYSTEM REBOOT REQUIRED")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()
	fmt.Println("Docker Engine has been installed, but the Windows Containers")
	fmt.Println("feature requires a system reboot to complete activation.")
	fmt.Println()
	fmt.Println("Next steps:")
	fmt.Println("  1. Restart your computer now")
	fmt.Println("  2. Docker service will start automatically after reboot")
	fmt.Println()
	fmt.Println("After reboot, verify Docker is running:")
	fmt.Println("  powershell -Command \"Get-Service Docker\"")
	fmt.Println()
	fmt.Println("If Docker still doesn't start after reboot, run:")
	fmt.Println("  powershell -Command \"Start-Service Docker\"")
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

	// Don't fail the installation - Docker is installed, just needs restart
	return nil
}

func (d *DockerInstaller) installDockerDesktop() error {
	// Check if Hyper-V is enabled (required for Docker Desktop)
	fmt.Println("Checking Hyper-V status...")

	// Use DISM to check Hyper-V status (more reliable than PowerShell cmdlet)
	checkHyperV := exec.Command("powershell", "-Command", "dism /Online /Get-FeatureInfo /FeatureName:Microsoft-Hyper-V-All")
	output, err := checkHyperV.CombinedOutput()
	outputStr := string(output)

	isEnabled := strings.Contains(outputStr, "State : Enabled")

	if err != nil || !isEnabled {
		fmt.Println("Hyper-V is not enabled. Enabling Hyper-V...")
		fmt.Println()
		fmt.Println("IMPORTANT: Enabling Hyper-V requires administrator privileges.")
		fmt.Println("Windows will prompt for UAC elevation. Please click 'Yes' when prompted.")
		fmt.Println("Note: A system restart will be required after enabling Hyper-V.")
		fmt.Println()

		// Try Install-WindowsFeature first (more reliable on Windows Server and some editions)
		fmt.Println("Enabling Hyper-V platform and management tools...")

		// Use Start-Process with -Verb RunAs to request elevation
		enableScript := `Start-Process powershell -Verb RunAs -ArgumentList '-Command','Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart:$false' -Wait`
		enableCmd := exec.Command("powershell", "-Command", enableScript)
		enableCmd.Stdout = os.Stdout
		enableCmd.Stderr = os.Stderr

		err := enableCmd.Run()

		// If Install-WindowsFeature fails (not available on some Windows editions), fall back to DISM
		if err != nil {
			fmt.Println("Install-WindowsFeature not available, trying DISM method...")
			dismScript := `Start-Process powershell -Verb RunAs -ArgumentList '-Command','dism /Online /Enable-Feature /FeatureName:Microsoft-Hyper-V-All /All /NoRestart' -Wait`
			enableCmd = exec.Command("powershell", "-Command", dismScript)
			enableCmd.Stdout = os.Stdout
			enableCmd.Stderr = os.Stderr
			err = enableCmd.Run()
		}

		if err != nil {
			fmt.Println()
			fmt.Printf("Error enabling Hyper-V: %v\n", err)
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println("⚠  MANUAL HYPER-V ENABLEMENT REQUIRED")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()
			fmt.Println("Automatic Hyper-V enablement failed. Please enable it manually:")
			fmt.Println()
			fmt.Println("Method 1: Using Install-WindowsFeature (run as Administrator):")
			fmt.Println("  powershell -Command \"Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart:$false\"")
			fmt.Println()
			fmt.Println("Method 2: Using Enable-WindowsOptionalFeature (run as Administrator):")
			fmt.Println("  powershell -Command \"Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All\"")
			fmt.Println()
			fmt.Println("Method 3: Using DISM (run as Administrator):")
			fmt.Println("  powershell -Command \"dism /Online /Enable-Feature /FeatureName:Microsoft-Hyper-V-All /All\"")
			fmt.Println()
			fmt.Println("Method 4: Using Windows Features GUI:")
			fmt.Println("  1. Open Control Panel > Programs > Turn Windows features on or off")
			fmt.Println("  2. Check 'Hyper-V' (all sub-items)")
			fmt.Println("  3. Click OK and restart when prompted")
			fmt.Println()
			fmt.Println("After enabling Hyper-V and restarting, run this installer again.")
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			return fmt.Errorf("Hyper-V enablement failed - please enable manually and run again")
		}

		fmt.Println()
		fmt.Println("Hyper-V enabled successfully.")
		fmt.Println()
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Println("⚠  SYSTEM REBOOT REQUIRED")
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		fmt.Println()
		fmt.Println("Hyper-V has been enabled, but a system reboot is required")
		fmt.Println("before Docker Desktop can be installed.")
		fmt.Println()
		fmt.Println("Next steps:")
		fmt.Println("  1. Restart your computer now")
		fmt.Println("  2. Run this installer again after reboot")
		fmt.Println("  3. Docker Desktop will install successfully")
		fmt.Println()
		fmt.Println("To restart now, run:")
		fmt.Println("  shutdown /r /t 0")
		fmt.Println()
		fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		return fmt.Errorf("system reboot required for Hyper-V activation - please restart and run again")
	}

	fmt.Println("Hyper-V is already enabled.")

	fmt.Println("Installing Docker Desktop via Chocolatey...")
	fmt.Println("Note: This is a fully unattended installation with no user prompts.")
	fmt.Println()
	fmt.Println("IMPORTANT: Docker Desktop installation requires administrator privileges.")
	fmt.Println("The Chocolatey package will attempt to elevate privileges automatically.")
	fmt.Println("If prompted by UAC (User Account Control), please click 'Yes' to allow the installation.")
	fmt.Println()

	// Get choco path - try user-local first, then system-wide
	chocoPath := d.getChocoPath()

	// Use flags for completely silent, unattended installation
	// --no-progress: Suppress progress output
	// --force: Force installation even if already installed
	// --accept-license: Auto-accept license
	// --confirm: Auto-confirm all prompts (redundant with -y but explicit)
	cmd := exec.Command(chocoPath, "install", "docker-desktop", "-y", "--no-progress", "--force", "--accept-license", "--confirm")

	// Set environment variables for Chocolatey
	cmd.Env = append(os.Environ(), "ChocolateyInstall="+os.Getenv("LOCALAPPDATA")+"\\choco")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		// Check if error message contains .NET or reboot related text
		errMsg := err.Error()
		if strings.Contains(errMsg, "exit status") {
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println("⚠  SYSTEM REBOOT REQUIRED")
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			fmt.Println()
			fmt.Println("Chocolatey has installed .NET Framework 4.8, but a system")
			fmt.Println("reboot is required before Docker can be installed.")
			fmt.Println()
			fmt.Println("Next steps:")
			fmt.Println("  1. Restart your computer now")
			fmt.Println("  2. Run this installer again after reboot")
			fmt.Println("  3. Docker Desktop will install successfully")
			fmt.Println()
			fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			return fmt.Errorf("system reboot required - please restart and run again")
		}
		return fmt.Errorf("failed to install Docker Desktop via Chocolatey: %w", err)
	}

	fmt.Println("Docker Desktop installed successfully.")
	fmt.Println("Starting Docker Desktop...")
	if err := startDockerWindows(); err != nil {
		fmt.Printf("Warning: Could not start Docker Desktop automatically: %v\n", err)
		fmt.Println("Please start Docker Desktop manually from the Start Menu")
	}

	return nil
}

func startDockerWindows() error {
	// Check if this is Windows Server (has Docker Engine service)
	checkService := exec.Command("powershell", "-Command", "Get-Service -Name Docker -ErrorAction SilentlyContinue")
	if err := checkService.Run(); err == nil {
		// Docker Engine service exists - start it instead of Docker Desktop
		fmt.Println("Starting Docker Engine service...")
		startCmd := exec.Command("powershell", "-Command", "Start-Service Docker")
		startCmd.Stdout = os.Stdout
		startCmd.Stderr = os.Stderr

		if err := startCmd.Run(); err != nil {
			// Get detailed error information
			statusCmd := exec.Command("powershell", "-Command", "Get-Service -Name Docker | Select-Object Status,StartType | Format-List")
			output, _ := statusCmd.Output()
			fmt.Println("\nDocker service status:")
			fmt.Println(string(output))
			return fmt.Errorf("failed to start Docker Engine service: %w", err)
		}
		return nil
	}

	// This is Windows Desktop - try to start Docker Desktop
	cmd := exec.Command("cmd", "/c", "start", "", "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		// Try alternative path
		cmd = exec.Command("powershell", "-Command", "Start-Process", "'Docker Desktop'")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			fmt.Printf("\nError details: %v\n", err)
			return fmt.Errorf("failed to start Docker Desktop: %w", err)
		}
	}
	return nil
}

// WaitForDocker waits for Docker daemon to become available
func WaitForDocker() error {
	maxAttempts := 30 // 30 seconds timeout
	for i := 0; i < maxAttempts; i++ {
		if IsDockerRunning() {
			return nil
		}
		time.Sleep(1 * time.Second)
	}
	return fmt.Errorf("timeout waiting for Docker to start")
}

// ShowDockerDiagnostics displays detailed diagnostic information about Docker
func ShowDockerDiagnostics() {
	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println("🔍 DOCKER DIAGNOSTICS")
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
	fmt.Println()

	switch runtime.GOOS {
	case "windows":
		showWindowsDockerDiagnostics()
	case "linux":
		showLinuxDockerDiagnostics()
	case "darwin":
		showMacOSDockerDiagnostics()
	default:
		fmt.Println("Docker diagnostics not available for this platform")
	}

	fmt.Println()
	fmt.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

func showWindowsDockerDiagnostics() {
	// Check if Windows Server or Desktop
	isServer, _ := IsWindowsServer()

	if isServer {
		fmt.Println("Platform: Windows Server")
		fmt.Println()

		// Check Docker service status
		fmt.Println("1. Docker Service Status:")
		statusCmd := exec.Command("powershell", "-Command", "Get-Service -Name Docker -ErrorAction SilentlyContinue | Format-List Name,Status,StartType")
		if output, err := statusCmd.CombinedOutput(); err == nil {
			fmt.Println(string(output))
		} else {
			fmt.Println("   Docker service not found or not accessible")
		}

		// Check Windows Containers feature
		fmt.Println("2. Windows Containers Feature Status:")
		containersCmd := exec.Command("powershell", "-Command", "Get-WindowsFeature -Name Containers | Format-List Name,InstallState")
		if output, err := containersCmd.CombinedOutput(); err == nil {
			fmt.Println(string(output))
		} else {
			fmt.Println("   Could not check Windows Containers feature")
		}

		// Check Docker version
		fmt.Println("3. Docker Version:")
		versionCmd := exec.Command("docker", "version")
		if output, err := versionCmd.CombinedOutput(); err == nil {
			fmt.Println(string(output))
		} else {
			fmt.Printf("   Error: %v\n", err)
		}

		// Show recent Docker service logs from Event Viewer
		fmt.Println("4. Recent Docker Service Events (last 10):")
		logsCmd := exec.Command("powershell", "-Command",
			"Get-EventLog -LogName Application -Source Docker -Newest 10 -ErrorAction SilentlyContinue | Format-Table TimeGenerated,EntryType,Message -AutoSize")
		if output, err := logsCmd.CombinedOutput(); err == nil {
			fmt.Println(string(output))
		} else {
			fmt.Println("   No Docker events found in Application log")
		}

		fmt.Println()
		fmt.Println("To view detailed Docker service logs, run:")
		fmt.Println("  powershell -Command \"Get-EventLog -LogName Application -Source Docker -Newest 50\"")

	} else {
		fmt.Println("Platform: Windows Desktop")
		fmt.Println()

		// Check Hyper-V status
		fmt.Println("1. Hyper-V Status:")
		hypervCmd := exec.Command("powershell", "-Command", "dism /Online /Get-FeatureInfo /FeatureName:Microsoft-Hyper-V-All")
		if output, err := hypervCmd.CombinedOutput(); err == nil {
			// Extract just the State line
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				if strings.Contains(line, "State") {
					fmt.Println("  ", strings.TrimSpace(line))
					break
				}
			}
		} else {
			fmt.Println("   Could not check Hyper-V status")
		}

		// Check if Docker Desktop process is running
		fmt.Println()
		fmt.Println("2. Docker Desktop Process:")
		processCmd := exec.Command("powershell", "-Command",
			"Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue | Format-List ProcessName,Id,StartTime")
		if output, err := processCmd.CombinedOutput(); err == nil {
			if len(output) > 0 {
				fmt.Println(string(output))
			} else {
				fmt.Println("   Docker Desktop process is not running")
			}
		} else {
			fmt.Println("   Docker Desktop process is not running")
		}

		// Check Docker version
		fmt.Println("3. Docker Version:")
		versionCmd := exec.Command("docker", "version")
		if output, err := versionCmd.CombinedOutput(); err == nil {
			fmt.Println(string(output))
		} else {
			fmt.Printf("   Error: %v\n", err)
		}

		// Check Docker Desktop logs location
		fmt.Println()
		fmt.Println("4. Docker Desktop Logs Location:")
		fmt.Println("   %LOCALAPPDATA%\\Docker\\log")
		fmt.Println()
		fmt.Println("To view Docker Desktop logs, run:")
		fmt.Println("  powershell -Command \"Get-Content $env:LOCALAPPDATA\\Docker\\log\\host\\*.log -Tail 50\"")
		fmt.Println()
		fmt.Println("Or check the Docker Desktop UI: Settings > Troubleshoot > View logs")
	}
}

func showLinuxDockerDiagnostics() {
	fmt.Println("Platform: Linux")
	fmt.Println()

	// Check Docker service status
	fmt.Println("1. Docker Service Status:")
	if commandExists("systemctl") {
		statusCmd := exec.Command("systemctl", "status", "docker", "--no-pager")
		if output, err := statusCmd.CombinedOutput(); err == nil || len(output) > 0 {
			fmt.Println(string(output))
		}
	} else {
		fmt.Println("   systemctl not available")
	}

	// Check Docker version
	fmt.Println()
	fmt.Println("2. Docker Version:")
	versionCmd := exec.Command("docker", "version")
	if output, err := versionCmd.CombinedOutput(); err == nil {
		fmt.Println(string(output))
	} else {
		fmt.Printf("   Error: %v\n", err)
	}

	// Check Docker info
	fmt.Println()
	fmt.Println("3. Docker Info:")
	infoCmd := exec.Command("docker", "info")
	if output, err := infoCmd.CombinedOutput(); err == nil {
		fmt.Println(string(output))
	} else {
		fmt.Printf("   Error: %v\n", err)
	}

	// Show recent logs
	fmt.Println()
	fmt.Println("4. Recent Docker Daemon Logs (last 20 lines):")
	if commandExists("journalctl") {
		logsCmd := exec.Command("journalctl", "-u", "docker", "-n", "20", "--no-pager")
		if output, err := logsCmd.CombinedOutput(); err == nil {
			fmt.Println(string(output))
		} else {
			fmt.Println("   Could not retrieve logs")
		}
	} else {
		fmt.Println("   journalctl not available")
	}

	fmt.Println()
	fmt.Println("To view detailed Docker logs, run:")
	fmt.Println("  sudo journalctl -u docker -f")
	fmt.Println()
	fmt.Println("Or check logs at:")
	fmt.Println("  /var/log/docker.log")
}

func showMacOSDockerDiagnostics() {
	fmt.Println("Platform: macOS")
	fmt.Println()

	// Check if Docker Desktop app exists
	fmt.Println("1. Docker Desktop Application:")
	if _, err := os.Stat("/Applications/Docker.app"); err == nil {
		fmt.Println("   ✓ Docker Desktop is installed at /Applications/Docker.app")
	} else {
		fmt.Println("   ✗ Docker Desktop not found at /Applications/Docker.app")
	}

	// Check if Docker Desktop process is running
	fmt.Println()
	fmt.Println("2. Docker Desktop Process:")
	processCmd := exec.Command("pgrep", "-f", "Docker Desktop")
	if output, err := processCmd.CombinedOutput(); err == nil && len(output) > 0 {
		fmt.Printf("   ✓ Docker Desktop is running (PID: %s)\n", strings.TrimSpace(string(output)))
	} else {
		fmt.Println("   ✗ Docker Desktop process is not running")
	}

	// Check Docker version
	fmt.Println()
	fmt.Println("3. Docker Version:")
	versionCmd := exec.Command("docker", "version")
	if output, err := versionCmd.CombinedOutput(); err == nil {
		fmt.Println(string(output))
	} else {
		fmt.Printf("   Error: %v\n", err)
	}

	// Check Docker info
	fmt.Println()
	fmt.Println("4. Docker Info:")
	infoCmd := exec.Command("docker", "info")
	if output, err := infoCmd.CombinedOutput(); err == nil {
		fmt.Println(string(output))
	} else {
		fmt.Printf("   Error: %v\n", err)
	}

	fmt.Println()
	fmt.Println("To view Docker Desktop logs:")
	fmt.Println("  Docker Desktop > Troubleshoot > View logs")
	fmt.Println()
	fmt.Println("Or check log files at:")
	fmt.Println("  ~/Library/Containers/com.docker.docker/Data/log/")
}
