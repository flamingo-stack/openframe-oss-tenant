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
	// Install Chocolatey if needed
	// Check if chocolatey is actually installed by checking the file path
	chocoPath := d.getChocoPath()
	if _, err := os.Stat(chocoPath); os.IsNotExist(err) {
		if err := d.installChocolatey(); err != nil {
			return fmt.Errorf("failed to install Chocolatey: %w", err)
		}
	}

	// Install Docker Desktop for Windows
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

	// Non-admin Chocolatey installation
	// Reference: https://docs.chocolatey.org/en-us/choco/setup#non-administrative-install
	userChocoPath := os.Getenv("LOCALAPPDATA") + "\\choco"

	installScript := `
$ChocolateyInstall = "$env:LOCALAPPDATA\choco"
[System.Environment]::SetEnvironmentVariable('ChocolateyInstall', $ChocolateyInstall, [System.EnvironmentVariableTarget]::User)
$env:ChocolateyInstall = $ChocolateyInstall
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", installScript)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Chocolatey: %w", err)
	}

	// Update PATH for current session - use user's local chocolatey installation
	userChocoBinPath := userChocoPath + "\\bin"
	currentPath := os.Getenv("PATH")
	if !strings.Contains(currentPath, userChocoBinPath) {
		_ = os.Setenv("PATH", userChocoBinPath+";"+currentPath)
	}

	// Also set ChocolateyInstall for current session
	_ = os.Setenv("ChocolateyInstall", userChocoPath)

	// Configure Chocolatey for unattended operation
	chocoExePath := userChocoBinPath + "\\choco.exe"
	if _, err := os.Stat(chocoExePath); os.IsNotExist(err) {
		return fmt.Errorf("chocolatey installation failed - choco.exe not found")
	}

	configCmd := exec.Command(chocoExePath, "feature", "enable", "-n", "allowGlobalConfirmation")
	configCmd.Env = append(os.Environ(), "ChocolateyInstall="+userChocoPath)
	_ = configCmd.Run()

	return nil
}


func (d *DockerInstaller) installDockerDesktop() error {
	// Get choco path
	chocoPath := d.getChocoPath()

	fmt.Println("Installing Docker Desktop via Chocolatey...")

	// Install Docker Desktop via Chocolatey with all output streaming
	cmd := exec.Command(chocoPath, "install", "docker-desktop", "-y", "--no-progress")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Docker Desktop: %w", err)
	}

	fmt.Println("Docker Desktop installed successfully.")
	fmt.Println("Please start Docker Desktop manually from the Start Menu.")
	fmt.Println("Wait for Docker Desktop to fully start before running k3d cluster creation.")

	return nil
}

func startDockerWindows() error {
	fmt.Println("Starting Docker Desktop...")

	// Try the primary Docker Desktop executable path
	cmd := exec.Command("powershell", "-Command",
		`Start-Process -FilePath "C:\Program Files\Docker\Docker\Docker Desktop.exe"`)

	if err := cmd.Run(); err != nil {
		// Try alternative method using COM object
		altCmd := exec.Command("powershell", "-Command", `
$shell = New-Object -ComObject Shell.Application
$shell.ShellExecute("C:\Program Files\Docker\Docker\Docker Desktop.exe")
`)
		if err := altCmd.Run(); err != nil {
			fmt.Println("\nCould not start Docker Desktop automatically.")
			fmt.Println("Please start Docker Desktop manually from the Start Menu.")
			return fmt.Errorf("failed to start Docker Desktop: %w", err)
		}
	}

	fmt.Println("Docker Desktop is starting...")
	fmt.Println("Please wait for Docker Desktop to fully start (check system tray icon).")
	return nil
}

// WaitForDocker waits for Docker daemon to become available
func WaitForDocker() error {
	maxAttempts := 120 // 2 minutes timeout
	for i := 0; i < maxAttempts; i++ {
		if IsDockerRunning() {
			return nil
		}
		time.Sleep(1 * time.Second)
	}
	return fmt.Errorf("docker failed to start within timeout period")
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
	fmt.Println()
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
