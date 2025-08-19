package helm

import (
	"fmt"
	"os/exec"
	"runtime"
)

type HelmInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isHelmInstalled() bool {
	if !commandExists("helm") {
		return false
	}
	cmd := exec.Command("helm", "version")
	err := cmd.Run()
	return err == nil
}

func helmInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "Helm: Run 'brew install helm' or download from https://helm.sh/docs/intro/install/"
	case "linux":
		return "Helm: Run 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash' or download from https://helm.sh/docs/intro/install/"
	case "windows":
		return "Helm: Download from https://helm.sh/docs/intro/install/ or install via chocolatey 'choco install kubernetes-helm'"
	default:
		return "Helm: Please install Helm from https://helm.sh/docs/intro/install/"
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
		return fmt.Errorf("automatic Helm installation on Windows not supported. Please install from https://helm.sh/docs/intro/install/")
	default:
		return fmt.Errorf("automatic Helm installation not supported on %s", runtime.GOOS)
	}
}

func (h *HelmInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic Helm installation on macOS. Please install brew first: https://brew.sh")
	}

	cmd := exec.Command("brew", "install", "helm")
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Helm: %w", err)
	}

	return nil
}

func (h *HelmInstaller) installLinux() error {
	if commandExists("apt") {
		return h.installUbuntu()
	} else if commandExists("yum") {
		return h.installRedHat()
	} else if commandExists("dnf") {
		return h.installFedora()
	} else if commandExists("pacman") {
		return h.installArch()
	} else {
		return h.installScript()
	}
}

func (h *HelmInstaller) installUbuntu() error {
	commands := []string{
		"curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null",
		"sudo apt-get install apt-transport-https --yes",
		"echo \"deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main\" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list",
		"sudo apt-get update",
		"sudo apt-get install helm",
	}

	for _, cmd := range commands {
		if err := h.runShellCommand(cmd); err != nil {
			return fmt.Errorf("failed to run command '%s': %w", cmd, err)
		}
	}

	return nil
}

func (h *HelmInstaller) installRedHat() error {
	commands := []string{
		"curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash",
	}

	for _, cmd := range commands {
		if err := h.runShellCommand(cmd); err != nil {
			return fmt.Errorf("failed to run command '%s': %w", cmd, err)
		}
	}

	return nil
}

func (h *HelmInstaller) installFedora() error {
	if err := h.runCommand("sudo", "dnf", "install", "-y", "helm"); err != nil {
		// If dnf package not available, fall back to script
		return h.installScript()
	}
	return nil
}

func (h *HelmInstaller) installArch() error {
	if err := h.runCommand("sudo", "pacman", "-S", "--noconfirm", "helm"); err != nil {
		return fmt.Errorf("failed to install Helm: %w", err)
	}
	return nil
}

func (h *HelmInstaller) installScript() error {
	// Use the official Helm install script
	installCmd := "curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
	
	if err := h.runShellCommand(installCmd); err != nil {
		return fmt.Errorf("failed to install Helm via script: %w", err)
	}

	return nil
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