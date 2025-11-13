package helm

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type HelmInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isHelmInstalled() bool {
	// On Windows, check helm in WSL2
	if runtime.GOOS == "windows" {
		cmd := exec.Command("wsl", "-d", "Ubuntu", "command", "-v", "helm")
		return cmd.Run() == nil
	}

	if !commandExists("helm") {
		return false
	}
	// Check helm with timeout to avoid hanging
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "helm", "version")
	err := cmd.Run()
	return err == nil
}

func helmInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "helm: Run 'brew install helm' or download from https://helm.sh/docs/intro/install/"
	case "linux":
		return "helm: Install using your package manager or from https://helm.sh/docs/intro/install/"
	case "windows":
		return "helm: Download from https://helm.sh/docs/intro/install/"
	default:
		return "helm: Please install helm from https://helm.sh/docs/intro/install/"
	}
}

func NewHelmInstaller() *HelmInstaller {
	return &HelmInstaller{}
}

func (h *HelmInstaller) IsInstalled() bool {
	return isHelmInstalled()
}

func (h *HelmInstaller) GetInstallHelp() string {
	return helmInstallHelp()
}

func (h *HelmInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return h.installMacOS()
	case "linux":
		return h.installLinux()
	case "windows":
		return h.installWindows()
	default:
		return fmt.Errorf("automatic helm installation not supported on %s", runtime.GOOS)
	}
}

func (h *HelmInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic helm installation on macOS. Please install brew first: https://brew.sh")
	}

	fmt.Println("Installing helm via Homebrew...")
	cmd := exec.Command("brew", "install", "helm")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install helm: %w", err)
	}

	return nil
}

func (h *HelmInstaller) installLinux() error {
	// Helm doesn't have official package repos, so we use the install script
	return h.installViaScript()
}

func (h *HelmInstaller) installViaScript() error {
	fmt.Println("Installing helm via official install script...")

	cmd := exec.Command("bash", "-c", "curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install helm: %w", err)
	}

	return nil
}

func (h *HelmInstaller) installWindows() error {
	fmt.Println("Installing helm inside WSL2...")

	// Install helm inside WSL2 Ubuntu
	installScript := `#!/bin/bash
set -e

# Check if helm is already installed
if command -v helm &> /dev/null; then
    echo "helm already installed in WSL2"
    exit 0
fi

echo "Installing helm..."

# Download and run official install script
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "helm installed successfully"
`

	cmd := exec.Command("wsl", "-d", "Ubuntu", "bash", "-c", installScript)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install helm in WSL2: %w", err)
	}

	// Create Windows wrapper
	if err := h.createHelmWrapper(); err != nil {
		return fmt.Errorf("failed to create helm wrapper: %w", err)
	}

	fmt.Println("✓ helm installed successfully in WSL2!")
	return nil
}

func (h *HelmInstaller) createHelmWrapper() error {
	fmt.Println("Creating helm command for Windows...")

	// First, create a bash helper script in WSL2 that converts Windows paths
	helperScript := `#!/bin/bash
# Helper script to run helm with Windows path conversion

args=()
for arg in "$@"; do
    # Check if argument looks like a Windows path (contains : after first char)
    if [[ "$arg" =~ ^[A-Za-z]: ]]; then
        # Convert Windows path to WSL path
        converted=$(wslpath -a "$arg" 2>/dev/null || echo "$arg")
        args+=("$converted")
    else
        args+=("$arg")
    fi
done

# Execute helm with converted arguments
exec helm "${args[@]}"
`

	// Write the helper script to WSL2 (write to temp location first, then move with sudo)
	writeCmd := fmt.Sprintf(`
cat > /tmp/helm-wrapper.sh << 'EOFSCRIPT'
%s
EOFSCRIPT
sudo mv /tmp/helm-wrapper.sh /usr/local/bin/helm-wrapper.sh
sudo chmod +x /usr/local/bin/helm-wrapper.sh
`, helperScript)

	cmd := exec.Command("wsl", "-d", "Ubuntu", "bash", "-c", writeCmd)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create helm helper script in WSL2: %w", err)
	}

	// Create a batch file wrapper that calls the helper script
	wrapperDir := os.Getenv("USERPROFILE") + "\\bin"
	os.MkdirAll(wrapperDir, 0755)

	wrapperPath := wrapperDir + "\\helm.bat"

	// Simple batch wrapper that calls the bash helper
	wrapperContent := `@echo off
wsl -d Ubuntu /usr/local/bin/helm-wrapper.sh %*
`

	if err := os.WriteFile(wrapperPath, []byte(wrapperContent), 0755); err != nil {
		return fmt.Errorf("failed to create helm wrapper: %w", err)
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

	pathCmd := exec.Command("powershell", "-Command", addPathScript)
	pathCmd.Stdout = os.Stdout
	pathCmd.Stderr = os.Stderr
	pathCmd.Run() // Ignore errors

	// Update PATH for current process so helm can be found immediately
	currentPath := os.Getenv("PATH")
	if !containsPath(currentPath, wrapperDir) {
		newPath := currentPath + ";" + wrapperDir
		os.Setenv("PATH", newPath)
		fmt.Printf("Updated current process PATH to include: %s\n", wrapperDir)
	}

	fmt.Printf("✓ helm wrapper created at: %s\n", wrapperPath)
	return nil
}

// containsPath checks if a PATH string contains a specific directory
func containsPath(pathEnv, dir string) bool {
	paths := strings.Split(pathEnv, ";")
	for _, p := range paths {
		if strings.EqualFold(strings.TrimSpace(p), strings.TrimSpace(dir)) {
			return true
		}
	}
	return false
}

func (h *HelmInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	// Completely silence output during installation
	return cmd.Run()
}

func (h *HelmInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	// Completely silence output during installation
	return cmd.Run()
}
