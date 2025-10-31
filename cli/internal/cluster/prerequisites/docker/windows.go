package docker

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// installWindows installs Docker Desktop on Windows using Chocolatey
func (d *DockerInstaller) installWindows() error {
	fmt.Println("Installing Docker Desktop on Windows...")

	// Step 1: Ensure Chocolatey is installed
	if err := ensureChocolateyInstalled(); err != nil {
		return fmt.Errorf("failed to ensure Chocolatey is installed: %w", err)
	}

	// Step 2: Install Docker Desktop via Chocolatey
	fmt.Println("Installing Docker Desktop via Chocolatey (this may take several minutes)...")
	cmd := exec.Command("powershell", "-Command", "choco", "install", "docker-desktop", "-y")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Docker Desktop: %w", err)
	}

	fmt.Println("Docker Desktop installed successfully!")
	fmt.Println("Note: You may need to restart your computer for Docker Desktop to work properly.")

	return nil
}

// ensureChocolateyInstalled checks if Chocolatey is installed and installs it if not
func ensureChocolateyInstalled() error {
	// Check if choco command exists
	cmd := exec.Command("powershell", "-Command", "Get-Command", "choco", "-ErrorAction", "SilentlyContinue")
	if err := cmd.Run(); err == nil {
		fmt.Println("Chocolatey is already installed")
		return nil
	}

	fmt.Println("Chocolatey not found. Installing Chocolatey (package manager for Windows)...")

	// Install Chocolatey using the official installation script
	// Using user-scoped installation to avoid UAC prompts
	installScript := `
$env:ChocolateyInstall = "$env:LOCALAPPDATA\choco"
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
`

	cmd = exec.Command("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", installScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Chocolatey: %w\nPlease install Chocolatey manually from https://chocolatey.org/install", err)
	}

	// Add Chocolatey to PATH for current session
	chocoPath := filepath.Join(os.Getenv("LOCALAPPDATA"), "choco", "bin")
	currentPath := os.Getenv("PATH")
	os.Setenv("PATH", chocoPath+";"+currentPath)

	fmt.Println("Chocolatey installed successfully!")
	return nil
}

// startDockerWindows starts Docker Desktop on Windows with improved reliability
func startDockerWindows() error {
	// Try multiple methods to start Docker Desktop

	// Method 1: Try user-specific installation path
	userProfile := os.Getenv("USERPROFILE")
	dockerPaths := []string{
		filepath.Join(userProfile, "AppData", "Local", "Docker", "Docker Desktop.exe"),
		filepath.Join("C:", "Program Files", "Docker", "Docker", "Docker Desktop.exe"),
		filepath.Join("C:", "Program Files (x86)", "Docker", "Docker", "Docker Desktop.exe"),
	}

	var lastErr error
	for _, dockerPath := range dockerPaths {
		if _, err := os.Stat(dockerPath); err == nil {
			fmt.Printf("Found Docker Desktop at: %s\n", dockerPath)
			cmd := exec.Command(dockerPath)
			if err := cmd.Start(); err != nil {
				lastErr = fmt.Errorf("failed to start Docker Desktop from %s: %w", dockerPath, err)
				continue
			}
			return nil
		}
	}

	// Method 2: Try using PowerShell Start-Process
	fmt.Println("Attempting to start Docker Desktop via PowerShell...")
	cmd := exec.Command("powershell", "-Command", "Start-Process", "'Docker Desktop'")
	if err := cmd.Run(); err == nil {
		return nil
	}

	// Method 3: Try using cmd
	cmd = exec.Command("cmd", "/c", "start", "", "Docker Desktop")
	if err := cmd.Run(); err == nil {
		return nil
	}

	if lastErr != nil {
		return lastErr
	}

	return fmt.Errorf("could not find or start Docker Desktop. Please ensure Docker Desktop is installed")
}

// waitForDockerWindows waits for Docker Desktop to be ready on Windows
func waitForDockerWindows(maxAttempts int) error {
	fmt.Println("Waiting for Docker Desktop to start...")

	for i := 0; i < maxAttempts; i++ {
		// Check if docker daemon is responding
		if IsDockerRunning() {
			// Additional check: verify Linux containers mode
			if err := verifyLinuxContainersMode(); err != nil {
				fmt.Printf("Warning: %v\n", err)
				fmt.Println("Docker Desktop may not be configured correctly for k3d.")
				fmt.Println("Please ensure Docker Desktop is set to use Linux containers.")
			}
			return nil
		}

		if i < maxAttempts-1 {
			time.Sleep(2 * time.Second)
		}
	}

	return fmt.Errorf("timeout waiting for Docker Desktop to start after %d seconds", maxAttempts*2)
}

// verifyLinuxContainersMode checks if Docker Desktop is running in Linux containers mode
func verifyLinuxContainersMode() error {
	// Try to run a simple Linux container command
	cmd := exec.Command("docker", "info", "--format", "{{.OSType}}")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to check Docker OS type: %w", err)
	}

	osType := strings.TrimSpace(string(output))
	if osType != "linux" {
		return fmt.Errorf("Docker Desktop is not in Linux containers mode (current: %s). Please switch to Linux containers", osType)
	}

	return nil
}

// isAdministrator checks if the current process has administrator privileges
func isAdministrator() bool {
	cmd := exec.Command("powershell", "-Command",
		"$currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent()); "+
		"$currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)")
	output, err := cmd.Output()
	if err != nil {
		return false
	}

	return strings.TrimSpace(string(output)) == "True"
}

// requestAdministratorPrivileges attempts to restart the process with administrator privileges
func requestAdministratorPrivileges() error {
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Get current command line arguments
	args := strings.Join(os.Args[1:], " ")

	// Create PowerShell command to elevate
	psCmd := fmt.Sprintf("Start-Process -FilePath '%s' -ArgumentList '%s' -Verb RunAs -Wait", executable, args)

	cmd := exec.Command("powershell", "-Command", psCmd)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to elevate privileges: %w", err)
	}

	return nil
}
