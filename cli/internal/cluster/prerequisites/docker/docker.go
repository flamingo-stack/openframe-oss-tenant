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
	fmt.Println("Note: Chocolatey will automatically install .NET Framework 4.8 if needed.")

	// Detect if this is Windows Server
	isServer, err := IsWindowsServer()
	if err != nil {
		fmt.Printf("Warning: Could not detect Windows edition: %v\n", err)
		fmt.Println("Assuming Windows Desktop...")
		isServer = false
	}

	if isServer {
		fmt.Println("Detected: Windows Server - will install Docker Engine")
	} else {
		fmt.Println("Detected: Windows Desktop - will install Docker Desktop")
	}

	// Step 1: Install Chocolatey if needed (this will auto-install .NET 4.8 if missing)
	fmt.Println("\nStep 1/2: Checking Chocolatey package manager...")
	if !commandExists("choco") {
		fmt.Println("Installing Chocolatey (this may take several minutes)...")
		fmt.Println("Chocolatey will automatically install .NET Framework 4.8 if it's not present.")
		if err := d.installChocolatey(); err != nil {
			return fmt.Errorf("failed to install Chocolatey: %w", err)
		}
		fmt.Println("Chocolatey installed successfully.")
	} else {
		fmt.Println("Chocolatey is already installed.")
	}

	// Step 2: Install Docker (Engine for Server, Desktop for Windows)
	fmt.Println("\nStep 2/2: Installing Docker...")
	if isServer {
		return d.installDockerEngine()
	}
	return d.installDockerDesktop()
}

func (d *DockerInstaller) installChocolatey() error {
	// Official Chocolatey installation command from https://chocolatey.org/install
	installScript := `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`

	cmd := exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", installScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Chocolatey: %w", err)
	}

	// Update PATH for current session
	chocoPath := "C:\\ProgramData\\chocolatey\\bin"
	currentPath := os.Getenv("PATH")
	if !strings.Contains(currentPath, chocoPath) {
		_ = os.Setenv("PATH", currentPath+";"+chocoPath)
	}

	return nil
}

func (d *DockerInstaller) installDockerEngine() error {
	fmt.Println("Installing Docker Engine via Chocolatey...")

	// Try both choco and full path
	var cmd *exec.Cmd
	if commandExists("choco") {
		// Use --no-progress and --confirm to prevent any interactive prompts
		cmd = exec.Command("choco", "install", "docker-engine", "-y", "--no-progress", "--limit-output")
	} else {
		// Try with full path if choco is not in PATH yet
		cmd = exec.Command("C:\\ProgramData\\chocolatey\\bin\\choco.exe", "install", "docker-engine", "-y", "--no-progress", "--limit-output")
	}

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

	// Enable Windows Containers feature on Windows Server
	fmt.Println("\nEnabling Windows Containers feature...")
	containersCmd := exec.Command("powershell", "-Command", "Install-WindowsFeature -Name Containers -Restart:$false")
	containersCmd.Stdout = os.Stdout
	containersCmd.Stderr = os.Stderr

	if err := containersCmd.Run(); err != nil {
		fmt.Printf("Warning: Could not enable Containers feature: %v\n", err)
		fmt.Println("You may need to enable it manually: Install-WindowsFeature -Name Containers")
	} else {
		fmt.Println("Windows Containers feature enabled.")
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
	fmt.Println("Installing Docker Desktop via Chocolatey...")

	// Try both choco and full path
	var cmd *exec.Cmd
	if commandExists("choco") {
		cmd = exec.Command("choco", "install", "docker-desktop", "-y")
	} else {
		// Try with full path if choco is not in PATH yet
		cmd = exec.Command("C:\\ProgramData\\chocolatey\\bin\\choco.exe", "install", "docker-desktop", "-y")
	}

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
