package git

import (
	"fmt"
	"os/exec"
	"strings"
)

// GitChecker validates git prerequisites
type GitChecker struct{}

// NewGitChecker creates a new git prerequisite checker
func NewGitChecker() *GitChecker {
	return &GitChecker{}
}

// IsInstalled checks if git is installed and available
func (g *GitChecker) IsInstalled() bool {
	_, err := exec.LookPath("git")
	return err == nil
}

// GetVersion returns the installed git version
func (g *GitChecker) GetVersion() (string, error) {
	if !g.IsInstalled() {
		return "", fmt.Errorf("git is not installed")
	}

	cmd := exec.Command("git", "--version")
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get git version: %w", err)
	}

	version := strings.TrimSpace(string(output))
	return version, nil
}

// GetInstallInstructions returns platform-specific installation instructions
func (g *GitChecker) GetInstallInstructions() string {
	return `Git is required for cloning chart repositories.

Installation instructions:
  macOS:    brew install git
  Ubuntu:   sudo apt-get install git
  CentOS:   sudo yum install git
  Windows:  Download from https://git-scm.com/download/win

After installation, verify with: git --version`
}

// Validate performs comprehensive git validation
func (g *GitChecker) Validate() error {
	if !g.IsInstalled() {
		return fmt.Errorf("git is not installed or not in PATH")
	}

	version, err := g.GetVersion()
	if err != nil {
		return fmt.Errorf("git is installed but not working properly: %w", err)
	}

	// Check for minimum version (git 2.0+)
	if strings.Contains(version, "git version ") {
		versionParts := strings.Split(version, " ")
		if len(versionParts) >= 3 {
			gitVersion := versionParts[2]
			if strings.HasPrefix(gitVersion, "1.") {
				return fmt.Errorf("git version %s is too old, please upgrade to git 2.0 or newer", gitVersion)
			}
		}
	}

	return nil
}
