package git

import (
	"strings"
	"testing"
)

func TestNewGitChecker(t *testing.T) {
	checker := NewGitChecker()

	if checker == nil {
		t.Error("Expected Git checker to be created")
	}
}

func TestGitChecker_GetInstallInstructions(t *testing.T) {
	checker := NewGitChecker()
	instructions := checker.GetInstallInstructions()

	if instructions == "" {
		t.Error("Install instructions should not be empty")
	}

	// Check that instructions contain key elements
	if !strings.Contains(instructions, "macOS") {
		t.Error("Instructions should contain macOS information")
	}
	if !strings.Contains(instructions, "Ubuntu") {
		t.Error("Instructions should contain Ubuntu information")
	}
	if !strings.Contains(instructions, "git --version") {
		t.Error("Instructions should contain verification command")
	}
}

func TestGitChecker_IsInstalled(t *testing.T) {
	checker := NewGitChecker()

	// This test will pass/fail based on whether git is actually installed
	// We just test that the method doesn't panic
	isInstalled := checker.IsInstalled()

	// The result depends on the environment, so we just check it's a boolean
	if isInstalled != true && isInstalled != false {
		t.Error("IsInstalled should return a boolean")
	}
}

func TestGitChecker_GetVersion(t *testing.T) {
	checker := NewGitChecker()

	if !checker.IsInstalled() {
		t.Skip("Git not installed, skipping version test")
	}

	version, err := checker.GetVersion()
	if err != nil {
		t.Errorf("Failed to get git version: %v", err)
	}

	if version == "" {
		t.Error("Version should not be empty when git is installed")
	}

	if !strings.Contains(version, "git version") {
		t.Errorf("Version string should contain 'git version': %s", version)
	}
}

func TestGitChecker_Validate(t *testing.T) {
	checker := NewGitChecker()

	if !checker.IsInstalled() {
		t.Skip("Git not installed, skipping validation test")
	}

	err := checker.Validate()
	if err != nil {
		t.Errorf("Validation failed: %v", err)
	}
}

func TestGitChecker_GetVersion_NotInstalled(t *testing.T) {
	checker := NewGitChecker()

	if checker.IsInstalled() {
		t.Skip("Git is installed, skipping not-installed test")
	}

	_, err := checker.GetVersion()
	if err == nil {
		t.Error("Expected error when git is not installed")
	}
}
