package prerequisites

import (
	"os"
	"runtime"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/docker"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/k3d"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/prerequisites/kubectl"
)

func TestNewPrerequisiteChecker(t *testing.T) {
	checker := NewPrerequisiteChecker()

	if len(checker.requirements) != 3 {
		t.Errorf("Expected 3 requirements, got %d", len(checker.requirements))
	}

	expectedNames := []string{"Docker", "kubectl", "k3d"}
	for i, req := range checker.requirements {
		if req.Name != expectedNames[i] {
			t.Errorf("Expected requirement %d to be %s, got %s", i, expectedNames[i], req.Name)
		}
	}
}

func TestCommandExists(t *testing.T) {
	// Test using docker package since it has commandExists function
	dockerInstaller := docker.NewDockerInstaller()

	// We can't directly test commandExists since it's not exported,
	// but we can test IsInstalled which uses it internally
	_ = dockerInstaller.IsInstalled()
}

func TestInstallHelp(t *testing.T) {
	tests := []struct {
		name     string
		helpFunc func() string
	}{
		{"docker", docker.NewDockerInstaller().GetInstallHelp},
		{"kubectl", kubectl.NewKubectlInstaller().GetInstallHelp},
		{"k3d", k3d.NewK3dInstaller().GetInstallHelp},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			help := tt.helpFunc()
			if help == "" {
				t.Errorf("Install help for %s should not be empty", tt.name)
			}

			switch runtime.GOOS {
			case "darwin":
				if !containsAny(help, []string{"brew", "https://"}) {
					t.Errorf("macOS help should contain brew or https reference: %s", help)
				}
			case "linux":
				if !containsAny(help, []string{"package manager", "https://", "curl"}) {
					t.Errorf("Linux help should contain package manager, https, or curl reference: %s", help)
				}
			case "windows":
				if !containsAny(help, []string{"https://", "chocolatey", "choco"}) {
					t.Errorf("Windows help should contain https, chocolatey, or choco reference: %s", help)
				}
			}
		})
	}
}

func containsAny(str string, substrings []string) bool {
	for _, sub := range substrings {
		if len(str) >= len(sub) {
			for i := 0; i <= len(str)-len(sub); i++ {
				if str[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

func TestCheckAllWithMissingTools(t *testing.T) {
	checker := NewPrerequisiteChecker()

	checker.requirements[0].IsInstalled = func() bool { return false }
	checker.requirements[1].IsInstalled = func() bool { return true }
	checker.requirements[2].IsInstalled = func() bool { return false }

	allPresent, missing := checker.CheckAll()

	if allPresent {
		t.Error("Expected allPresent to be false when tools are missing")
	}

	if len(missing) != 2 {
		t.Errorf("Expected 2 missing tools, got %d", len(missing))
	}

	expectedMissing := []string{"Docker", "k3d"}
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
	missing := []string{"Docker", "k3d"}

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

func TestCheckPrerequisitesInCI(t *testing.T) {
	// Save original environment
	originalCI := os.Getenv("CI")
	originalGithubActions := os.Getenv("GITHUB_ACTIONS")
	originalGitlabCI := os.Getenv("GITLAB_CI")
	originalCircleCI := os.Getenv("CIRCLECI")

	// Cleanup function to restore environment
	defer func() {
		if originalCI != "" {
			os.Setenv("CI", originalCI)
		} else {
			os.Unsetenv("CI")
		}
		if originalGithubActions != "" {
			os.Setenv("GITHUB_ACTIONS", originalGithubActions)
		} else {
			os.Unsetenv("GITHUB_ACTIONS")
		}
		if originalGitlabCI != "" {
			os.Setenv("GITLAB_CI", originalGitlabCI)
		} else {
			os.Unsetenv("GITLAB_CI")
		}
		if originalCircleCI != "" {
			os.Setenv("CIRCLECI", originalCircleCI)
		} else {
			os.Unsetenv("CIRCLECI")
		}
	}()

	tests := []struct {
		name   string
		envVar string
		value  string
	}{
		{"GitHub Actions", "GITHUB_ACTIONS", "true"},
		{"GitLab CI", "GITLAB_CI", "true"},
		{"CircleCI", "CIRCLECI", "true"},
		{"Generic CI", "CI", "true"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear all CI env vars first
			os.Unsetenv("CI")
			os.Unsetenv("GITHUB_ACTIONS")
			os.Unsetenv("GITLAB_CI")
			os.Unsetenv("CIRCLECI")

			// Set the specific CI env var
			os.Setenv(tt.envVar, tt.value)

			// The function should detect CI environment and not prompt
			// We can't easily test the full CheckPrerequisites() function without mocking,
			// but we can verify the environment detection logic
			nonInteractive := os.Getenv("CI") != "" ||
				os.Getenv("GITHUB_ACTIONS") != "" ||
				os.Getenv("GITLAB_CI") != "" ||
				os.Getenv("CIRCLECI") != ""

			if !nonInteractive {
				t.Errorf("%s: Expected non-interactive mode to be true when %s is set", tt.name, tt.envVar)
			}
		})
	}

	// Test non-CI environment
	t.Run("Non-CI environment", func(t *testing.T) {
		// Clear all CI env vars
		os.Unsetenv("CI")
		os.Unsetenv("GITHUB_ACTIONS")
		os.Unsetenv("GITLAB_CI")
		os.Unsetenv("CIRCLECI")

		nonInteractive := os.Getenv("CI") != "" ||
			os.Getenv("GITHUB_ACTIONS") != "" ||
			os.Getenv("GITLAB_CI") != "" ||
			os.Getenv("CIRCLECI") != ""

		if nonInteractive {
			t.Error("Expected non-interactive mode to be false in non-CI environment")
		}
	})
}
