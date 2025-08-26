package telepresence

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

type TelepresenceInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isTelepresenceInstalled() bool {
	return commandExists("telepresence")
}

func IsTelepresenceRunning() bool {
	if !commandExists("telepresence") {
		return false
	}
	// Check if telepresence is available by running version command
	cmd := exec.Command("telepresence", "version")
	err := cmd.Run()
	return err == nil
}

func telepresenceInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "Telepresence: Install via Homebrew 'brew install telepresenceio/telepresence/telepresence-oss' or from https://www.telepresence.io/docs/latest/install/"
	case "linux":
		return "Telepresence: Install from https://www.telepresence.io/docs/latest/install/ or use your package manager"
	case "windows":
		return "Telepresence: Install from https://www.telepresence.io/docs/latest/install/"
	default:
		return "Telepresence: Please install from https://www.telepresence.io/docs/latest/install/"
	}
}

func NewTelepresenceInstaller() *TelepresenceInstaller {
	return &TelepresenceInstaller{}
}

func (t *TelepresenceInstaller) IsInstalled() bool {
	return isTelepresenceInstalled()
}

func (t *TelepresenceInstaller) GetInstallHelp() string {
	return telepresenceInstallHelp()
}

func (t *TelepresenceInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return t.installMacOS()
	case "linux":
		return t.installLinux()
	case "windows":
		return fmt.Errorf("automatic Telepresence installation on Windows not supported. Please install from https://www.telepresence.io/docs/latest/install/")
	default:
		return fmt.Errorf("automatic Telepresence installation not supported on %s", runtime.GOOS)
	}
}

func (t *TelepresenceInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic Telepresence installation on macOS. Please install brew first: https://brew.sh")
	}

	fmt.Println("Installing Telepresence via Homebrew...")
	cmd := exec.Command("brew", "install", "telepresenceio/telepresence/telepresence-oss")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Telepresence: %w", err)
	}

	fmt.Println("Telepresence installed successfully")
	return nil
}

func (t *TelepresenceInstaller) installLinux() error {
	fmt.Println("Installing Telepresence on Linux...")
	
	// Use the official installation script
	if commandExists("curl") {
		return t.installLinuxCurl()
	} else if commandExists("wget") {
		return t.installLinuxWget()
	} else {
		return fmt.Errorf("curl or wget is required for automatic Telepresence installation. Please install manually from https://www.telepresence.io/docs/latest/install/")
	}
}

func (t *TelepresenceInstaller) installLinuxCurl() error {
	// Download and install telepresence using the correct URL and method
	downloadCmd := `curl -fsSL https://github.com/telepresenceio/telepresence/releases/download/v2.22.4/telepresence-linux-amd64 -o /usr/local/bin/telepresence && sudo chmod a+x /usr/local/bin/telepresence`
	if err := t.runShellCommand(downloadCmd); err != nil {
		return fmt.Errorf("failed to download and install Telepresence: %w", err)
	}

	fmt.Println("Telepresence installed successfully")
	return nil
}

func (t *TelepresenceInstaller) installLinuxWget() error {
	// Download and install telepresence using wget with the correct URL
	downloadCmd := `wget -O /usr/local/bin/telepresence https://github.com/telepresenceio/telepresence/releases/download/v2.22.4/telepresence-linux-amd64 && sudo chmod a+x /usr/local/bin/telepresence`
	if err := t.runShellCommand(downloadCmd); err != nil {
		return fmt.Errorf("failed to download and install Telepresence: %w", err)
	}

	fmt.Println("Telepresence installed successfully")
	return nil
}

func (t *TelepresenceInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func (t *TelepresenceInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// GetVersion returns the installed Telepresence version
func (t *TelepresenceInstaller) GetVersion() (string, error) {
	if !t.IsInstalled() {
		return "", fmt.Errorf("telepresence is not installed")
	}

	cmd := exec.Command("telepresence", "version")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get telepresence version: %w", err)
	}

	return strings.TrimSpace(string(output)), nil
}