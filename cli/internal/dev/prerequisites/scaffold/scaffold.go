package scaffold

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

type ScaffoldInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isScaffoldInstalled() bool {
	return commandExists("skaffold")
}

func IsScaffoldRunning() bool {
	if !commandExists("skaffold") {
		return false
	}
	// Check if skaffold is available by running version command
	cmd := exec.Command("skaffold", "version")
	err := cmd.Run()
	return err == nil
}

func scaffoldInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "Run 'brew install skaffold' or download from https://skaffold.dev/docs/install/"
	case "linux":
		return "Run 'curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && sudo install skaffold /usr/local/bin/' or use your package manager"
	case "windows":
		return "Run 'choco install skaffold' or download from https://skaffold.dev/docs/install/"
	default:
		return "Please install from https://skaffold.dev/docs/install/"
	}
}

func NewScaffoldInstaller() *ScaffoldInstaller {
	return &ScaffoldInstaller{}
}

func (s *ScaffoldInstaller) IsInstalled() bool {
	return isScaffoldInstalled()
}

func (s *ScaffoldInstaller) GetInstallHelp() string {
	return scaffoldInstallHelp()
}

func (s *ScaffoldInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return s.installMacOS()
	case "linux":
		return s.installLinux()
	case "windows":
		return fmt.Errorf("automatic Skaffold installation on Windows not supported. Please install from https://skaffold.dev/docs/install/ or use Chocolatey 'choco install skaffold'")
	default:
		return fmt.Errorf("automatic Skaffold installation not supported on %s", runtime.GOOS)
	}
}

func (s *ScaffoldInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic Skaffold installation on macOS. Please install brew first: https://brew.sh")
	}

	cmd := exec.Command("brew", "install", "skaffold")
	// Suppress verbose output - only show on error
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Skaffold: %w", err)
	}
	return nil
}

func (s *ScaffoldInstaller) installLinux() error {
	// Use the official installation script
	if commandExists("curl") {
		return s.installLinuxCurl()
	} else if commandExists("wget") {
		return s.installLinuxWget()
	} else {
		return fmt.Errorf("curl or wget is required for automatic Skaffold installation. Please install manually from https://skaffold.dev/docs/install/")
	}
}

func (s *ScaffoldInstaller) installLinuxCurl() error {
	// Download and install skaffold using the correct method
	downloadCmd := `curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && sudo install skaffold /usr/local/bin/`
	if err := s.runShellCommand(downloadCmd); err != nil {
		return fmt.Errorf("failed to download and install Skaffold: %w", err)
	}
	return nil
}

func (s *ScaffoldInstaller) installLinuxWget() error {
	// Download and install skaffold using wget with the correct method
	downloadCmd := `wget -O skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && sudo install skaffold /usr/local/bin/`
	if err := s.runShellCommand(downloadCmd); err != nil {
		return fmt.Errorf("failed to download and install Skaffold: %w", err)
	}
	return nil
}

func (s *ScaffoldInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	// Suppress output - only show on error
	return cmd.Run()
}

func (s *ScaffoldInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	// Suppress output - only show on error
	return cmd.Run()
}

// GetVersion returns the installed Skaffold version
func (s *ScaffoldInstaller) GetVersion() (string, error) {
	if !s.IsInstalled() {
		return "", fmt.Errorf("skaffold is not installed")
	}

	cmd := exec.Command("skaffold", "version")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get skaffold version: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}