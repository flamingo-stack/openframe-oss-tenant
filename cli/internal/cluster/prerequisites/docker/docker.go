package docker

import (
	"context"
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
	// On Windows, check if Docker is installed in WSL2
	if runtime.GOOS == "windows" {
		cmd := exec.Command("wsl", "-d", "Ubuntu", "command", "-v", "docker")
		return cmd.Run() == nil
	}
	// Just check if docker command exists, don't try to connect to daemon
	return commandExists("docker")
}

func IsDockerRunning() bool {
	// On Windows, check Docker in WSL2 directly
	if runtime.GOOS == "windows" {
		return isDockerRunningWSL()
	}

	if !commandExists("docker") {
		return false
	}
	// Check if Docker daemon is accessible by running docker ps with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "docker", "ps")
	err := cmd.Run()
	return err == nil
}

// isDockerRunningWSL checks if Docker is running in WSL2 on Windows
func isDockerRunningWSL() bool {
	// First check if WSL and Ubuntu are available
	cmd := exec.Command("wsl", "-d", "Ubuntu", "command", "-v", "docker")
	if err := cmd.Run(); err != nil {
		return false
	}

	// Check if Docker daemon is running in WSL2
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd = exec.CommandContext(ctx, "wsl", "-d", "Ubuntu", "bash", "-c", "sudo docker ps > /dev/null 2>&1")
	return cmd.Run() == nil
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
	fmt.Println("Installing Docker CE via WSL2 on Windows...")
	fmt.Println("This will install Docker Engine (same as Linux) without Docker Desktop")

	// Step 1: Ensure WSL2 is installed
	if err := d.ensureWSL2(); err != nil {
		return fmt.Errorf("failed to setup WSL2: %w", err)
	}

	// Step 2: Ensure Ubuntu is installed in WSL2
	if err := d.ensureUbuntuWSL(); err != nil {
		return fmt.Errorf("failed to install Ubuntu in WSL2: %w", err)
	}

	// Step 3: Install Docker CE inside WSL2 Ubuntu
	if err := d.installDockerInWSL(); err != nil {
		return fmt.Errorf("failed to install Docker in WSL2: %w", err)
	}

	// Step 4: Configure Docker to expose socket and start on boot
	if err := d.configureDockerWSL(); err != nil {
		return fmt.Errorf("failed to configure Docker: %w", err)
	}

	// Step 5: Create Windows docker command wrapper
	if err := d.createDockerWrapper(); err != nil {
		return fmt.Errorf("failed to create docker command wrapper: %w", err)
	}

	fmt.Println("\n✓ Docker CE installed successfully in WSL2!")
	fmt.Println("Docker is now available via the 'docker' command on Windows")
	return nil
}

func (d *DockerInstaller) ensureWSL2() error {
	// Check if WSL is installed
	cmd := exec.Command("wsl", "--status")
	if err := cmd.Run(); err != nil {
		fmt.Println("WSL2 not found. Installing WSL2...")
		fmt.Println("Note: This will require a system restart")

		// Install WSL2
		installCmd := exec.Command("wsl", "--install", "--no-distribution")
		installCmd.Stdout = os.Stdout
		installCmd.Stderr = os.Stderr
		if err := installCmd.Run(); err != nil {
			return fmt.Errorf("failed to install WSL2. Please run as Administrator: %w", err)
		}

		fmt.Println("\n⚠ IMPORTANT: You must restart your computer now for WSL2 to work")
		fmt.Println("After restart, run this command again to continue Docker installation")
		os.Exit(0)
	}

	// Set WSL2 as default version
	cmd = exec.Command("wsl", "--set-default-version", "2")
	cmd.Run() // Ignore errors, might already be set

	return nil
}

func (d *DockerInstaller) ensureUbuntuWSL() error {
	// Check if Ubuntu is already installed using multiple methods
	// Method 1: Check using wsl -l -v (more reliable, includes version info)
	cmd := exec.Command("wsl", "-l", "-v")
	output, err := cmd.Output()

	// Convert output handling potential UTF-16 encoding on Windows
	outputStr := d.decodeWSLOutput(output)

	if err == nil && (strings.Contains(outputStr, "Ubuntu") || strings.Contains(outputStr, "ubuntu")) {
		fmt.Println("✓ Ubuntu already installed in WSL2")
		return nil
	}

	// Method 2: Try to run a command in Ubuntu distribution
	cmd = exec.Command("wsl", "-d", "Ubuntu", "echo", "test")
	if err := cmd.Run(); err == nil {
		fmt.Println("✓ Ubuntu already installed in WSL2")
		return nil
	}

	// Ubuntu not found, install it
	fmt.Println("Installing Ubuntu in WSL2...")
	cmd = exec.Command("wsl", "--install", "-d", "Ubuntu", "--no-launch")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		// Check if error is because distribution already exists
		if strings.Contains(err.Error(), "already exists") || strings.Contains(err.Error(), "ERROR_ALREADY_EXISTS") {
			fmt.Println("✓ Ubuntu already exists in WSL2")
			return nil
		}
		return fmt.Errorf("failed to install Ubuntu: %w", err)
	}

	fmt.Println("✓ Ubuntu installed successfully")
	return nil
}

// decodeWSLOutput handles UTF-16 LE with BOM encoding that WSL sometimes uses on Windows
func (d *DockerInstaller) decodeWSLOutput(data []byte) string {
	// Check for UTF-16 LE BOM
	if len(data) >= 2 && data[0] == 0xFF && data[1] == 0xFE {
		// UTF-16 LE with BOM detected
		// Convert UTF-16 to UTF-8
		u16 := make([]uint16, 0, len(data)/2)
		for i := 2; i < len(data)-1; i += 2 {
			u16 = append(u16, uint16(data[i])|uint16(data[i+1])<<8)
		}
		runes := make([]rune, 0, len(u16))
		for _, v := range u16 {
			if v == 0 {
				continue
			}
			runes = append(runes, rune(v))
		}
		return string(runes)
	}
	// Regular UTF-8
	return string(data)
}

func (d *DockerInstaller) installDockerInWSL() error {
	fmt.Println("Installing Docker CE inside WSL2 Ubuntu...")

	// Create installation script that matches our Linux installation
	installScript := `#!/bin/bash
set -e

# Check if docker is already installed
if command -v docker &> /dev/null; then
    echo "Docker already installed in WSL2"
    exit 0
fi

echo "Installing Docker CE..."

# Update package index
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq

# Install prerequisites
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release software-properties-common

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker CE
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

echo "Docker CE installed successfully"
`

	// Execute installation script in WSL2
	cmd := exec.Command("wsl", "-d", "Ubuntu", "bash", "-c", installScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Docker in WSL2: %w", err)
	}

	return nil
}

func (d *DockerInstaller) configureDockerWSL() error {
	fmt.Println("Configuring Docker to start automatically...")

	configScript := `#!/bin/bash
set -e

# Create systemd override to start Docker on WSL boot
# Note: WSL2 uses its own init system

# Configure Docker to listen on both unix socket and tcp (for Windows access)
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"],
  "iptables": false
}
EOF

# Create a script to start Docker daemon
sudo tee /usr/local/bin/start-docker.sh > /dev/null <<'SCRIPT'
#!/bin/bash
if ! pgrep -x dockerd > /dev/null; then
    sudo dockerd > /dev/null 2>&1 &
fi
SCRIPT

sudo chmod +x /usr/local/bin/start-docker.sh

# Add to bashrc to start on WSL launch
if ! grep -q "start-docker.sh" ~/.bashrc; then
    echo "/usr/local/bin/start-docker.sh" >> ~/.bashrc
fi

# Start Docker now
sudo /usr/local/bin/start-docker.sh

# Wait for Docker to be ready
for i in {1..30}; do
    if docker ps > /dev/null 2>&1; then
        echo "Docker is running"
        break
    fi
    sleep 1
done

echo "Docker configured successfully"
`

	cmd := exec.Command("wsl", "-d", "Ubuntu", "bash", "-c", configScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to configure Docker: %w", err)
	}

	return nil
}

func (d *DockerInstaller) createDockerWrapper() error {
	fmt.Println("Creating docker command for Windows...")

	// Create a batch file wrapper that calls docker in WSL2
	wrapperDir := os.Getenv("USERPROFILE") + "\\bin"
	os.MkdirAll(wrapperDir, 0755)

	wrapperPath := wrapperDir + "\\docker.bat"
	wrapperContent := `@echo off
wsl -d Ubuntu docker %*
`

	if err := os.WriteFile(wrapperPath, []byte(wrapperContent), 0755); err != nil {
		return fmt.Errorf("failed to create docker wrapper: %w", err)
	}

	// Add to PATH if not already there
	addPathScript := fmt.Sprintf(`
$binDir = "%s"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$binDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$binDir", "User")
    $env:Path = "$env:Path;$binDir"
    Write-Host "Added $binDir to PATH"
} else {
    Write-Host "PATH already contains $binDir"
}
`, wrapperDir)

	cmd := exec.Command("powershell", "-Command", addPathScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run() // Ignore errors

	fmt.Printf("✓ Docker wrapper created at: %s\n", wrapperPath)
	fmt.Println("Note: You may need to restart your terminal for PATH changes to take effect")

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