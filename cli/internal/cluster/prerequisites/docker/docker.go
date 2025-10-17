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

func (d *DockerInstaller) installWindows() error {
	// Try winget first (built into Windows 10+ 1809 and later)
	if !commandExists("winget") {
		fmt.Println("\nwinget is not installed. Attempting to install winget automatically...")
		if err := installWinget(); err != nil {
			fmt.Printf("Failed to install winget automatically: %v\n", err)
			showWingetInstallHelp()
			fmt.Println("\nAlternatively, install Docker Desktop manually:")
			fmt.Println("  https://www.docker.com/products/docker-desktop")
			fmt.Println("\nAfter installation, start Docker Desktop and run this command again.")
			return fmt.Errorf("Docker Desktop requires manual installation")
		}
		fmt.Println("winget installed successfully! Continuing with Docker Desktop installation...")
	}

	fmt.Println("Installing Docker Desktop via winget...")
	cmd := exec.Command("winget", "install", "-e", "--id", "Docker.DockerDesktop", "--accept-package-agreements", "--accept-source-agreements")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Printf("winget installation failed: %v\n", err)
		fmt.Println("\nDocker Desktop installation requires manual setup on Windows.")
		fmt.Println("Please download and install Docker Desktop from:")
		fmt.Println("  https://www.docker.com/products/docker-desktop")
		fmt.Println("\nAfter installation, start Docker Desktop and run this command again.")
		return fmt.Errorf("Docker Desktop installation failed - please install manually")
	}

	fmt.Println("Docker Desktop installed successfully. Starting Docker Desktop...")
	if err := startDockerWindows(); err != nil {
		fmt.Printf("Warning: Could not start Docker Desktop automatically: %v\n", err)
		fmt.Println("Please start Docker Desktop manually from Start Menu")
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

func startDockerWindows() error {
	// Try to start Docker Desktop on Windows
	cmd := exec.Command("cmd", "/c", "start", "", "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe")
	if err := cmd.Run(); err != nil {
		// Try alternative path
		cmd = exec.Command("powershell", "-Command", "Start-Process", "'Docker Desktop'")
		if err := cmd.Run(); err != nil {
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

// installWinget downloads and installs winget directly from GitHub
func installWinget() error {
	fmt.Println("Downloading winget from GitHub...")

	// Use the latest release download URL
	wingetURL := "https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle"
	tempDir := os.TempDir()
	installerPath := tempDir + "\\winget-installer.msixbundle"

	// Download using PowerShell with progress
	downloadCmd := fmt.Sprintf(
		`[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; `+
		`Write-Host 'Downloading winget (this may take 1-2 minutes)...'; `+
		`Invoke-WebRequest -Uri '%s' -OutFile '%s' -UseBasicParsing -TimeoutSec 300`,
		wingetURL, installerPath,
	)

	fmt.Println("Downloading winget installer package (this may take 1-2 minutes)...")
	cmd := exec.Command("powershell", "-NoProfile", "-Command", downloadCmd)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to download winget: %w", err)
	}

	fmt.Println("Download complete!")

	// Install the package
	fmt.Println("Installing winget...")
	installCmd := fmt.Sprintf(`Add-AppxPackage -Path '%s'`, installerPath)
	cmd = exec.Command("powershell", "-NoProfile", "-Command", installCmd)
	output, err := cmd.CombinedOutput()

	// Clean up installer file
	os.Remove(installerPath)

	if err != nil {
		// Check if it's a dependency issue
		if strings.Contains(string(output), "dependencies") || strings.Contains(string(output), "0x80073CF3") {
			fmt.Println("\nwinget installation requires dependencies. Installing dependencies...")
			// Try to install VCLibs and UI.Xaml dependencies
			if depErr := installWingetDependencies(); depErr != nil {
				fmt.Printf("Failed to install dependencies: %v\n", depErr)
			}
			// Retry installation
			downloadCmd2 := fmt.Sprintf(
				`[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%s' -OutFile '%s' -UseBasicParsing`,
				wingetURL, installerPath,
			)
			cmd2 := exec.Command("powershell", "-NoProfile", "-Command", downloadCmd2)
			if err := cmd2.Run(); err == nil {
				installCmd2 := fmt.Sprintf(`Add-AppxPackage -Path '%s'`, installerPath)
				cmd3 := exec.Command("powershell", "-NoProfile", "-Command", installCmd2)
				if err := cmd3.Run(); err != nil {
					os.Remove(installerPath)
					return fmt.Errorf("failed to install winget after installing dependencies: %w", err)
				}
			}
			os.Remove(installerPath)
		} else {
			return fmt.Errorf("failed to install winget: %w - %s", err, string(output))
		}
	}

	fmt.Println("winget installed successfully!")

	// Verify installation
	if commandExists("winget") {
		fmt.Println("✓ winget is now available!")
		return nil
	}

	fmt.Println("\nwinget installed but not yet available in PATH.")
	fmt.Println("Please restart your terminal and run the bootstrap command again.")
	return fmt.Errorf("winget installed but requires terminal restart")
}

// installWingetDependencies installs required dependencies for winget
func installWingetDependencies() error {
	tempDir := os.TempDir()

	// Install VCLibs
	vclibsURL := "https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx"
	vclibsPath := tempDir + "\\VCLibs.appx"

	downloadCmd := fmt.Sprintf(
		`[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%s' -OutFile '%s' -UseBasicParsing`,
		vclibsURL, vclibsPath,
	)

	cmd := exec.Command("powershell", "-NoProfile", "-Command", downloadCmd)
	if err := cmd.Run(); err == nil {
		installCmd := fmt.Sprintf(`Add-AppxPackage -Path '%s'`, vclibsPath)
		cmd = exec.Command("powershell", "-NoProfile", "-Command", installCmd)
		cmd.Run() // Ignore errors, might already be installed
		os.Remove(vclibsPath)
	}

	// Install UI.Xaml
	xamlURL := "https://github.com/microsoft/microsoft-ui-xaml/releases/download/v2.8.6/Microsoft.UI.Xaml.2.8.x64.appx"
	xamlPath := tempDir + "\\UIXaml.appx"

	downloadCmd = fmt.Sprintf(
		`[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%s' -OutFile '%s' -UseBasicParsing`,
		xamlURL, xamlPath,
	)

	cmd = exec.Command("powershell", "-NoProfile", "-Command", downloadCmd)
	if err := cmd.Run(); err == nil {
		installCmd := fmt.Sprintf(`Add-AppxPackage -Path '%s'`, xamlPath)
		cmd = exec.Command("powershell", "-NoProfile", "-Command", installCmd)
		cmd.Run() // Ignore errors, might already be installed
		os.Remove(xamlPath)
	}

	return nil
}

// isRunningAsAdmin checks if the current process is running with Administrator privileges
func isRunningAsAdmin() bool {
	// Use a more reliable method: check if we have the Administrator role
	cmd := exec.Command("powershell", "-NoProfile", "-Command",
		`$identity = [Security.Principal.WindowsIdentity]::GetCurrent(); $principal = New-Object Security.Principal.WindowsPrincipal($identity); $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)`)
	output, err := cmd.Output()
	if err != nil {
		// If we can't even run the check, assume not admin
		return false
	}
	result := strings.TrimSpace(string(output))
	return result == "True"
}

// showWingetInstallHelp provides instructions for installing winget
func showWingetInstallHelp() {
	// Check Windows version
	cmd := exec.Command("cmd", "/c", "ver")
	output, err := cmd.Output()
	versionInfo := ""
	if err == nil {
		versionInfo = strings.TrimSpace(string(output))
	}

	fmt.Println("\nTo install winget manually:")

	// Check if they might have winget but it's not in PATH
	appDataLocal := os.Getenv("LOCALAPPDATA")
	possibleWingetPaths := []string{
		appDataLocal + "\\Microsoft\\WindowsApps\\winget.exe",
		"C:\\Program Files\\WindowsApps\\Microsoft.DesktopAppInstaller_*\\winget.exe",
	}

	wingetFound := false
	for _, path := range possibleWingetPaths {
		if _, err := os.Stat(path); err == nil {
			wingetFound = true
			fmt.Printf("  Note: winget appears to be installed at: %s\n", path)
			fmt.Println("  You may need to restart your terminal.")
			break
		}
	}

	if !wingetFound {
		fmt.Println("  1. Open Microsoft Store")
		fmt.Println("  2. Search for 'App Installer'")
		fmt.Println("  3. Install or update 'App Installer'")
		fmt.Println("  4. Restart your terminal")
		fmt.Println("\n  Or download directly from:")
		fmt.Println("    https://aka.ms/getwinget")

		if strings.Contains(versionInfo, "Windows 10") || strings.Contains(versionInfo, "Windows 11") {
			fmt.Println("\n  winget is included with Windows 10 (version 1809+) and Windows 11")
		}
	}
}