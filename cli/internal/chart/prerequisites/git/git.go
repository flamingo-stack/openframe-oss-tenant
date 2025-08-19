package git

import (
	"fmt"
	"os/exec"
	"runtime"
)

type GitInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func isGitInstalled() bool {
	if !commandExists("git") {
		return false
	}
	cmd := exec.Command("git", "version")
	err := cmd.Run()
	return err == nil
}

func gitInstallHelp() string {
	switch runtime.GOOS {
	case "darwin":
		return "Git: Run 'brew install git' or download from https://git-scm.com/downloads"
	case "linux":
		return "Git: Install using your package manager (apt install git, yum install git, etc.) or from https://git-scm.com/downloads"
	case "windows":
		return "Git: Download from https://git-scm.com/downloads or install via chocolatey 'choco install git'"
	default:
		return "Git: Please install Git from https://git-scm.com/downloads"
	}
}

func NewGitInstaller() *GitInstaller {
	return &GitInstaller{}
}

func (g *GitInstaller) IsInstalled() bool {
	return isGitInstalled()
}

func (g *GitInstaller) GetInstallHelp() string {
	return gitInstallHelp()
}

func (g *GitInstaller) Install() error {
	switch runtime.GOOS {
	case "darwin":
		return g.installMacOS()
	case "linux":
		return g.installLinux()
	case "windows":
		return fmt.Errorf("automatic Git installation on Windows not supported. Please install from https://git-scm.com/downloads")
	default:
		return fmt.Errorf("automatic Git installation not supported on %s", runtime.GOOS)
	}
}

func (g *GitInstaller) installMacOS() error {
	if !commandExists("brew") {
		return fmt.Errorf("Homebrew is required for automatic Git installation on macOS. Please install brew first: https://brew.sh")
	}

	cmd := exec.Command("brew", "install", "git")
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Git: %w", err)
	}

	return nil
}

func (g *GitInstaller) installLinux() error {
	if commandExists("apt") {
		return g.installUbuntu()
	} else if commandExists("yum") {
		return g.installRedHat()
	} else if commandExists("dnf") {
		return g.installFedora()
	} else if commandExists("pacman") {
		return g.installArch()
	} else {
		return fmt.Errorf("no supported package manager found. Please install Git manually from https://git-scm.com/downloads")
	}
}

func (g *GitInstaller) installUbuntu() error {
	commands := [][]string{
		{"sudo", "apt", "update"},
		{"sudo", "apt", "install", "-y", "git"},
	}

	for _, cmdArgs := range commands {
		if err := g.runCommand(cmdArgs[0], cmdArgs[1:]...); err != nil {
			return fmt.Errorf("failed to run %s: %w", cmdArgs[0], err)
		}
	}

	return nil
}

func (g *GitInstaller) installRedHat() error {
	if err := g.runCommand("sudo", "yum", "install", "-y", "git"); err != nil {
		return fmt.Errorf("failed to install Git: %w", err)
	}
	return nil
}

func (g *GitInstaller) installFedora() error {
	if err := g.runCommand("sudo", "dnf", "install", "-y", "git"); err != nil {
		return fmt.Errorf("failed to install Git: %w", err)
	}
	return nil
}

func (g *GitInstaller) installArch() error {
	if err := g.runCommand("sudo", "pacman", "-S", "--noconfirm", "git"); err != nil {
		return fmt.Errorf("failed to install Git: %w", err)
	}
	return nil
}

func (g *GitInstaller) runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	// Completely silence output during installation
	return cmd.Run()
}