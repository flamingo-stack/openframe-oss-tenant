package kubectl

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// installWindows installs kubectl on Windows using Chocolatey
func (k *KubectlInstaller) installWindows() error {
	fmt.Println("Installing kubectl on Windows...")

	// Step 1: Ensure Chocolatey is installed
	if err := ensureChocolateyInstalled(); err != nil {
		return fmt.Errorf("failed to ensure Chocolatey is installed: %w", err)
	}

	// Step 2: Install kubectl via Chocolatey
	fmt.Println("Installing kubectl via Chocolatey...")
	cmd := exec.Command("powershell", "-Command", "choco", "install", "kubernetes-cli", "-y")
	// Silence output during installation
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install kubectl: %w", err)
	}

	fmt.Println("kubectl installed successfully!")
	return nil
}

// ensureChocolateyInstalled checks if Chocolatey is installed and installs it if not
func ensureChocolateyInstalled() error {
	// Check if choco command exists
	cmd := exec.Command("powershell", "-Command", "Get-Command", "choco", "-ErrorAction", "SilentlyContinue")
	if err := cmd.Run(); err == nil {
		return nil // Chocolatey is already installed
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

	// Only add if not already in PATH
	if !strings.Contains(strings.ToLower(currentPath), strings.ToLower(chocoPath)) {
		os.Setenv("PATH", chocoPath+";"+currentPath)
	}

	fmt.Println("Chocolatey installed successfully!")
	return nil
}
