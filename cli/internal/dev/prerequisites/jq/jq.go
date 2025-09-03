package jq

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

type JqInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isJqInstalled() bool {
	return commandExists("jq")
}

func IsJqRunning() bool {
	if !commandExists("jq") {
		return false
	}
	// Check if jq is available by running version command
	cmd := exec.Command("jq", "--version")
	err := cmd.Run()
	return err == nil
}

func jqInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "jq: Install via Homebrew 'brew install jq' or from https://stedolan.github.io/jq/download/"
	case "linux":
		return "jq: Install using 'sudo apt-get install jq' (Ubuntu/Debian), 'sudo yum install jq' (RHEL/CentOS), or from https://stedolan.github.io/jq/download/"
	case "windows":
		return "jq: Install from https://stedolan.github.io/jq/download/ or use Chocolatey 'choco install jq'"
	default:
		return "jq: Please install from https://stedolan.github.io/jq/download/"
	}
}

func NewJqInstaller() *JqInstaller {
	return &JqInstaller{}
}

func (j *JqInstaller) IsInstalled() bool {
	return isJqInstalled()
}

func (j *JqInstaller) GetInstallHelp() string {
	return jqInstallHelp()
}

func (j *JqInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return j.installMacOS()
	case "linux":
		return j.installLinux()
	case "windows":
		return fmt.Errorf("automatic jq installation on Windows not supported. Please install from https://stedolan.github.io/jq/download/ or use Chocolatey 'choco install jq'")
	default:
		return fmt.Errorf("automatic jq installation not supported on %s", runtime.GOOS)
	}
}

func (j *JqInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic jq installation on macOS. Please install brew first: https://brew.sh")
	}

	fmt.Println("Installing jq via Homebrew...")
	cmd := exec.Command("brew", "install", "jq")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install jq: %w", err)
	}

	fmt.Println("jq installed successfully")
	return nil
}

func (j *JqInstaller) installLinux() error {
	// Use the same detection method as the user provided
	if j.isDebianLike() {
		return j.installUbuntu()
	} else if j.isRhelLike() {
		return j.installRedHat()
	} else if commandExists("dnf") {
		return j.installFedora()
	} else if commandExists("pacman") {
		return j.installArch()
	} else {
		return fmt.Errorf("no supported package manager found. Please install jq manually from https://stedolan.github.io/jq/download/")
	}
}

func (j *JqInstaller) installUbuntu() error {
	fmt.Println("Installing jq on Ubuntu/Debian...")
	
	if err := j.runCommand("sudo", "apt", "-y", "install", "jq"); err != nil {
		return fmt.Errorf("failed to install jq: %w", err)
	}

	fmt.Println("jq installed successfully")
	return nil
}

func (j *JqInstaller) installRedHat() error {
	fmt.Println("Installing jq on CentOS/RHEL...")
	
	if err := j.runCommand("sudo", "yum", "-y", "install", "jq"); err != nil {
		return fmt.Errorf("failed to install jq: %w", err)
	}

	fmt.Println("jq installed successfully")
	return nil
}

func (j *JqInstaller) installFedora() error {
	fmt.Println("Installing jq on Fedora...")
	
	commands := [][]string{
		{"sudo", "dnf", "install", "-y", "jq"},
	}

	for _, cmdArgs := range commands {
		if err := j.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to install jq: %w", err)
		}
	}

	fmt.Println("jq installed successfully")
	return nil
}

func (j *JqInstaller) installArch() error {
	fmt.Println("Installing jq on Arch Linux...")
	
	commands := [][]string{
		{"sudo", "pacman", "-S", "--noconfirm", "jq"},
	}

	for _, cmdArgs := range commands {
		if err := j.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to install jq: %w", err)
		}
	}

	fmt.Println("jq installed successfully")
	return nil
}

func (j *JqInstaller) installLinuxDirect() error {
	fmt.Println("Installing jq directly from GitHub releases...")
	
	// Download jq binary directly
	arch := "amd64"
	if runtime.GOARCH == "386" {
		arch = "i386"
	} else if runtime.GOARCH == "arm64" {
		arch = "arm64"
	}
	
	downloadCmd := fmt.Sprintf("sudo curl -L https://github.com/stedolan/jq/releases/latest/download/jq-linux-%s -o /usr/local/bin/jq", arch)
	if err := j.runShellCommand(downloadCmd); err != nil {
		return fmt.Errorf("failed to download jq: %w", err)
	}

	// Make executable
	if err := j.runCommand("sudo", "chmod", "+x", "/usr/local/bin/jq"); err != nil {
		return fmt.Errorf("failed to make jq executable: %w", err)
	}

	fmt.Println("jq installed successfully")
	return nil
}

func (j *JqInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (j *JqInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// isDebianLike checks if the system is Debian-based using the user's method
func (j *JqInstaller) isDebianLike() bool {
	cmd := exec.Command("grep", "ID_LIKE", "/etc/os-release")
	output, err := cmd.Output()
	if err != nil {
		return commandExists("apt")
	}
	return strings.Contains(string(output), "debian")
}

// isRhelLike checks if the system is RHEL-based using the user's method  
func (j *JqInstaller) isRhelLike() bool {
	cmd := exec.Command("grep", "ID_LIKE", "/etc/os-release")
	output, err := cmd.Output()
	if err != nil {
		return commandExists("yum")
	}
	return strings.Contains(string(output), "rhel")
}

// GetVersion returns the installed jq version
func (j *JqInstaller) GetVersion() (string, error) {
	if !j.IsInstalled() {
		return "", fmt.Errorf("jq is not installed")
	}

	cmd := exec.Command("jq", "--version")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get jq version: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}