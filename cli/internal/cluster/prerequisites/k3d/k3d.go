package k3d

import (
	"fmt"
	"os/exec"
	"runtime"
)

type K3dInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isK3dInstalled() bool {
	if !commandExists("k3d") {
		return false
	}
	cmd := exec.Command("k3d", "version")
	err := cmd.Run()
	return err == nil
}

func k3dInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "k3d: Run 'brew install k3d' or download from https://k3d.io/v5.4.6/#installation"
	case "linux":
		return "k3d: Run 'curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash' or download from https://k3d.io/v5.4.6/#installation"
	case "windows":
		return "k3d: Download from https://github.com/k3d-io/k3d/releases or use chocolatey 'choco install k3d'"
	default:
		return "k3d: Please install k3d from https://k3d.io/v5.4.6/#installation"
	}
}

func NewK3dInstaller() *K3dInstaller {
	return &K3dInstaller{}
}

func (k *K3dInstaller) IsInstalled() bool {
	return isK3dInstalled()
}

func (k *K3dInstaller) GetInstallHelp() string {
	return k3dInstallHelp()
}

func (k *K3dInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return k.installMacOS()
	case "linux":
		return k.installLinux()
	case "windows":
		return fmt.Errorf("automatic k3d installation on Windows not supported. Please install from https://k3d.io/v5.4.6/#installation")
	default:
		return fmt.Errorf("automatic k3d installation not supported on %s", runtime.GOOS)
	}
}

func (k *K3dInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic k3d installation on macOS. Please install brew first: https://brew.sh")
	}

	cmd := exec.Command("brew", "install", "k3d")

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install k3d: %w", err)
	}

	return nil
}

func (k *K3dInstaller) installLinux() error {
	if commandExists("apt") {
		return k.installUbuntu()
	} else if commandExists("yum") {
		return k.installRedHat()
	} else if commandExists("dnf") {
		return k.installFedora()
	} else if commandExists("pacman") {
		return k.installArch()
	} else {
		return k.installScript()
	}
}

func (k *K3dInstaller) installUbuntu() error {
	// k3d doesn't have official apt repository, so use the install script
	return k.installScript()
}

func (k *K3dInstaller) installRedHat() error {
	// k3d doesn't have official yum repository, so use the install script
	return k.installScript()
}

func (k *K3dInstaller) installFedora() error {
	// k3d doesn't have official dnf repository, so use the install script
	return k.installScript()
}

func (k *K3dInstaller) installArch() error {
	// Try AUR package first, fall back to script
	if commandExists("yay") {
		if err := k.runCommand("yay", "-S", "--noconfirm", "k3d-bin"); err == nil {
			return nil
		}
	}

	if commandExists("paru") {
		if err := k.runCommand("paru", "-S", "--noconfirm", "k3d-bin"); err == nil {
			return nil
		}
	}

	// Fall back to install script
	return k.installScript()
}

func (k *K3dInstaller) installScript() error {
	// Use the official k3d install script
	installCmd := "curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash"

	if err := k.runShellCommand(installCmd); err != nil {
		return fmt.Errorf("failed to install k3d via script: %w", err)
	}

	return nil
}

func (k *K3dInstaller) installBinary() error {
	arch := runtime.GOARCH
	if arch == "amd64" {
		arch = "amd64"
	} else if arch == "arm64" {
		arch = "arm64"
	} else {
		return fmt.Errorf("unsupported architecture: %s", arch)
	}

	// Get latest release version
	versionCmd := "curl -s https://api.github.com/repos/k3d-io/k3d/releases/latest | grep '\"tag_name\":' | sed -E 's/.*\"([^\"]+)\".*/\\1/'"

	commands := []string{
		fmt.Sprintf("VERSION=$(%s)", versionCmd),
		fmt.Sprintf("curl -Lo k3d https://github.com/k3d-io/k3d/releases/download/${VERSION}/k3d-linux-%s", arch),
		"chmod +x k3d",
		"sudo mv k3d /usr/local/bin/",
	}

	for _, cmd := range commands {
		if err := k.runShellCommand(cmd); err != nil {
			return fmt.Errorf("failed to run command '%s': %w", cmd, err)
		}
	}

	return nil
}

func (k *K3dInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	// Completely silence output during installation
	return cmd.Run()
}

func (k *K3dInstaller) runShellCommand(command string) error {
	cmd := exec.Command("bash", "-c", command)
	// Completely silence output during installation
	return cmd.Run()
}
