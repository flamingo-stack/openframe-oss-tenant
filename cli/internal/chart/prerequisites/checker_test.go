package prerequisites

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/certificates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/git"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/helm"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/memory"
)

func TestNewPrerequisiteChecker(t *testing.T) {
	checker := NewPrerequisiteChecker()

	if len(checker.requirements) != 4 {
		t.Errorf("Expected 4 requirements, got %d", len(checker.requirements))
	}

	expectedNames := []string{"Git", "Helm", "Memory", "Certificates"}
	for i, req := range checker.requirements {
		if req.Name != expectedNames[i] {
			t.Errorf("Expected requirement %d to be %s, got %s", i, expectedNames[i], req.Name)
		}
	}
}

func TestInstallHelp(t *testing.T) {
	tests := []struct {
		name     string
		helpFunc func() string
	}{
		{"git", git.NewGitChecker().GetInstallInstructions},
		{"helm", helm.NewHelmInstaller().GetInstallHelp},
		{"memory", memory.NewMemoryChecker().GetInstallHelp},
		{"certificates", certificates.NewCertificateInstaller().GetInstallHelp},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			help := tt.helpFunc()
			if help == "" {
				t.Errorf("Install help for %s should not be empty", tt.name)
			}
		})
	}
}

func TestCheckAllWithMissingTools(t *testing.T) {
	checker := NewPrerequisiteChecker()

	// Mock some requirements as missing
	checker.requirements[0].IsInstalled = func() bool { return false }
	checker.requirements[1].IsInstalled = func() bool { return true }
	checker.requirements[2].IsInstalled = func() bool { return false }
	checker.requirements[3].IsInstalled = func() bool { return true }

	allPresent, missing := checker.CheckAll()

	if allPresent {
		t.Error("Expected allPresent to be false when tools are missing")
	}

	if len(missing) != 2 {
		t.Errorf("Expected 2 missing tools, got %d", len(missing))
	}

	expectedMissing := []string{"Git", "Memory"}
	for i, tool := range missing {
		if tool != expectedMissing[i] {
			t.Errorf("Expected missing tool %d to be %s, got %s", i, expectedMissing[i], tool)
		}
	}
}

func TestCheckAllWithAllTools(t *testing.T) {
	checker := NewPrerequisiteChecker()

	for i := range checker.requirements {
		checker.requirements[i].IsInstalled = func() bool { return true }
	}

	allPresent, missing := checker.CheckAll()

	if !allPresent {
		t.Error("Expected allPresent to be true when all tools are present")
	}

	if len(missing) != 0 {
		t.Errorf("Expected no missing tools, got %d: %v", len(missing), missing)
	}
}

func TestGetInstallInstructions(t *testing.T) {
	checker := NewPrerequisiteChecker()
	missing := []string{"Git", "Helm"}

	instructions := checker.GetInstallInstructions(missing)

	if len(instructions) != 2 {
		t.Errorf("Expected 2 instructions, got %d", len(instructions))
	}

	for _, instruction := range instructions {
		if instruction == "" {
			t.Error("Instruction should not be empty")
		}
	}
}
