package docker

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
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
	// Check Windows version compatibility first
	fmt.Println("Checking Windows version compatibility...")
	if err := CheckDockerCompatibility(); err != nil {
		return err
	}

	// Check if this is Windows Server
	isServer, err := IsWindowsServer()
	if err != nil {
		return fmt.Errorf("failed to detect Windows edition: %w", err)
	}

	if isServer {
		return d.installWindowsServerDocker()
	}

	return d.installWindowsDesktopDocker()
}

func (d *DockerInstaller) installWindowsDesktopDocker() error {
	fmt.Println("Installing Docker Desktop on Windows...")
	fmt.Println("Windows version is compatible with Docker Desktop")

	// Docker Desktop installer URL (latest stable)
	const dockerURL = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"

	tempDir := os.TempDir()
	installerPath := filepath.Join(tempDir, "DockerDesktopInstaller.exe")

	// Check if installer already exists to skip re-download
	if _, err := os.Stat(installerPath); os.IsNotExist(err) {
		fmt.Println("Downloading Docker Desktop installer...")
		if err := downloadFileWithProgress(dockerURL, installerPath); err != nil {
			return fmt.Errorf("failed to download Docker Desktop: %w", err)
		}
		fmt.Println()
	} else {
		fmt.Printf("Using cached installer at: %s\n", installerPath)
	}

	fmt.Println("Installing Docker Desktop (this may take several minutes)...")

	// Create log file for installation output
	logPath := filepath.Join(tempDir, "docker-install.log")
	logFile, err := os.Create(logPath)
	if err != nil {
		fmt.Printf("Warning: Could not create log file: %v\n", err)
	} else {
		defer logFile.Close()
		fmt.Printf("Installation log will be written to: %s\n", logPath)
	}

	fmt.Println("Installation log:")
	fmt.Println("─────────────────────────────────────────────────────────────")

	// Try with verbose flag and stream to both console and log file
	cmd := exec.Command(installerPath, "install", "--accept-license", "--verbose")

	// Create multi-writer to write to both console and file
	if logFile != nil {
		cmd.Stdout = io.MultiWriter(os.Stdout, logFile)
		cmd.Stderr = io.MultiWriter(os.Stderr, logFile)
	} else {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}

	if err := cmd.Run(); err != nil {
		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Printf("\nInstallation failed with error: %v\n", err)
		fmt.Printf("Installer location: %s\n", installerPath)
		fmt.Printf("Installation log: %s\n", logPath)

		// Try to read and display the log file
		if logContent, readErr := os.ReadFile(logPath); readErr == nil && len(logContent) > 0 {
			fmt.Println("\nInstaller log content:")
			fmt.Println("─────────────────────────────────────────────────────────────")
			fmt.Println(string(logContent))
			fmt.Println("─────────────────────────────────────────────────────────────")
		}

		fmt.Println("\nYou can try running the installer manually with administrator privileges:")
		fmt.Printf("  %s install --accept-license --verbose\n", installerPath)
		return fmt.Errorf("Docker Desktop installation failed: %w", err)
	}

	fmt.Println("─────────────────────────────────────────────────────────────")

	// Show log file location on success too
	if logFile != nil {
		fmt.Printf("Installation log saved to: %s\n", logPath)
	}

	// Clean up installer file
	fmt.Println("Cleaning up installer file...")
	if err := os.Remove(installerPath); err != nil {
		fmt.Printf("Warning: Could not remove installer file at %s: %v\n", installerPath, err)
	}

	fmt.Println("Docker Desktop installation completed successfully!")
	fmt.Println("Note: Docker Desktop may require a system restart to complete the installation.")
	fmt.Println("      You will need to start Docker Desktop manually after installation.")

	return nil
}

func (d *DockerInstaller) installWindowsServerDocker() error {
	fmt.Println("Installing Docker Engine on Windows Server...")
	fmt.Println("Windows Server is compatible with Docker Engine")

	// Step 1: Check .NET Framework FIRST (required by Chocolatey)
	fmt.Println("\nStep 1/4: Checking .NET Framework...")
	dotnetCheck := exec.Command("powershell", "-Command", "(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full' -ErrorAction SilentlyContinue).Release -ge 528040")
	output, _ := dotnetCheck.Output()
	hasDotNet48 := strings.TrimSpace(string(output)) == "True"

	if !hasDotNet48 {
		fmt.Println(".NET Framework 4.8 not detected. Installing...")
		fmt.Println("Note: Chocolatey requires .NET Framework 4.8 or higher")
		fmt.Println("This installation may require a system reboot to complete.")
		fmt.Println("─────────────────────────────────────────────────────────────")

		// Download and install .NET 4.8 directly from Microsoft
		if err := d.installDotNetFramework(); err != nil {
			fmt.Println("─────────────────────────────────────────────────────────────")
			fmt.Printf("\nWarning: .NET Framework installation had issues: %v\n", err)

			// Ask user if they want to continue
			fmt.Println("\n.NET Framework 4.8 installation failed or requires a reboot.")
			fmt.Println("You can:")
			fmt.Println("  1. Reboot the system and run this installer again")
			fmt.Println("  2. Install .NET 4.8 manually from:")
			fmt.Println("     https://go.microsoft.com/fwlink/?linkid=2088631")
			fmt.Println("  3. Try to continue anyway (installation will likely fail)")
			fmt.Print("\nDo you want to continue anyway? [y/N]: ")

			var response string
			fmt.Scanln(&response)
			if strings.ToLower(response) != "y" && strings.ToLower(response) != "yes" {
				return fmt.Errorf(".NET Framework 4.8 is required. Please install it and try again")
			}
		} else {
			fmt.Println("─────────────────────────────────────────────────────────────")
			fmt.Println(".NET Framework installation completed")
			fmt.Println("Note: A system reboot may be required for changes to take effect.")
		}
	} else {
		fmt.Println(".NET Framework 4.8 or higher is already installed")
	}

	// Step 2: Install Chocolatey (now that .NET is confirmed)
	fmt.Println("\nStep 2/4: Checking for Chocolatey...")
	chocoInstalled := commandExists("choco")

	if !chocoInstalled {
		fmt.Println("Chocolatey is not installed. Installing Chocolatey...")
		if err := d.installChocolatey(); err != nil {
			return fmt.Errorf("failed to install Chocolatey: %w", err)
		}
		fmt.Println("Chocolatey installed successfully!")

		// Refresh PATH to make choco command available
		fmt.Println("Refreshing environment variables...")
		refreshCmd := exec.Command("powershell", "-Command", "$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')")
		_ = refreshCmd.Run()
	} else {
		fmt.Println("Chocolatey is already installed")
	}

	// Refresh environment variables
	fmt.Println("\nStep 3/4: Refreshing environment...")
	refreshCmd := exec.Command("powershell", "-Command", "refreshenv")
	_ = refreshCmd.Run()

	// Install Docker using Chocolatey
	fmt.Println("\nStep 4/4: Installing Docker Engine...")
	fmt.Println("This may take several minutes...")
	fmt.Println("Installation will show detailed output below:")
	fmt.Println("─────────────────────────────────────────────────────────────")

	// Install docker-engine package with verbose output
	cmd := exec.Command("choco", "install", "docker-engine", "-y", "--verbose", "--ignore-dependencies")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Println("─────────────────────────────────────────────────────────────")
		fmt.Printf("\nDocker installation failed: %v\n", err)
		fmt.Println("\nPossible solutions:")
		fmt.Println("  1. Reboot the system (if .NET was just installed)")
		fmt.Println("  2. Ensure .NET Framework 4.8 is fully installed")
		fmt.Println("  3. Install manually:")
		fmt.Println("     choco install netfx-4.8 -y")
		fmt.Println("     # Reboot system")
		fmt.Println("     choco install docker-engine -y --verbose")
		fmt.Println("\nFor more details, check the verbose output above.")
		return fmt.Errorf("failed to install Docker Engine: %w", err)
	}

	fmt.Println("─────────────────────────────────────────────────────────────")
	fmt.Println("Docker Engine installed successfully!")

	// Start Docker service
	fmt.Println("\nStarting Docker service...")
	startCmd := exec.Command("powershell", "-Command", "Start-Service Docker; Set-Service -Name Docker -StartupType Automatic")
	startCmd.Stdout = os.Stdout
	startCmd.Stderr = os.Stderr

	if err := startCmd.Run(); err != nil {
		fmt.Printf("Warning: Could not start Docker service: %v\n", err)
		fmt.Println("You may need to restart the system and start it manually: Start-Service Docker")
		fmt.Println("\nNote: A system restart may be required after .NET Framework installation.")
	} else {
		fmt.Println("Docker service started and configured for automatic startup")
	}

	// Show Docker version
	fmt.Println("\nDocker version:")
	versionCmd := exec.Command("docker", "version")
	versionCmd.Stdout = os.Stdout
	versionCmd.Stderr = os.Stderr
	_ = versionCmd.Run()

	return nil
}

func (d *DockerInstaller) installDotNetFramework() error {
	// .NET Framework 4.8 offline installer URL
	const dotnetURL = "https://go.microsoft.com/fwlink/?linkid=2088631"

	tempDir := os.TempDir()
	installerPath := filepath.Join(tempDir, "ndp48-x86-x64-allos-enu.exe")

	// Download .NET Framework installer
	fmt.Println("Downloading .NET Framework 4.8 installer...")
	if err := downloadFileWithProgress(dotnetURL, installerPath); err != nil {
		return fmt.Errorf("failed to download .NET Framework: %w", err)
	}
	fmt.Println()

	// Run installer with quiet mode and no restart
	fmt.Println("Installing .NET Framework 4.8 (this may take several minutes)...")
	cmd := exec.Command(installerPath, "/q", "/norestart")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		// Clean up installer
		_ = os.Remove(installerPath)
		return fmt.Errorf("installation failed: %w", err)
	}

	// Clean up installer
	fmt.Println("Cleaning up installer...")
	_ = os.Remove(installerPath)

	return nil
}

func (d *DockerInstaller) installChocolatey() error {
	psScript := `
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
`

	cmd := exec.Command("powershell", "-Command", psScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	return cmd.Run()
}

// downloadFileWithProgress downloads a file and shows progress percentage
func downloadFileWithProgress(url, filepath string) error {
	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	// Get the content length
	contentLength := resp.ContentLength
	if contentLength <= 0 {
		// If content length is unknown, download without progress
		fmt.Println("Downloading... (size unknown)")
		_, err = io.Copy(out, resp.Body)
		return err
	}

	// Create a progress reader
	counter := &writeCounter{Total: uint64(contentLength)}
	_, err = io.Copy(out, io.TeeReader(resp.Body, counter))
	fmt.Println() // New line after progress

	return err
}

// writeCounter counts the number of bytes written to it and displays progress
type writeCounter struct {
	Total      uint64
	Downloaded uint64
}

func (wc *writeCounter) Write(p []byte) (int, error) {
	n := len(p)
	wc.Downloaded += uint64(n)
	wc.printProgress()
	return n, nil
}

func (wc *writeCounter) printProgress() {
	// Clear the line
	fmt.Printf("\r%s", clearLine())

	// Calculate percentage
	percentage := float64(wc.Downloaded) / float64(wc.Total) * 100

	// Print progress
	fmt.Printf("\rDownloading... %.2f%% (%s / %s)",
		percentage,
		formatBytes(wc.Downloaded),
		formatBytes(wc.Total))
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func clearLine() string {
	return "\033[2K"
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
