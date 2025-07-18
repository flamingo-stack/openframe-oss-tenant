package integration

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// TestCLIIntegration tests the CLI as a complete application
func TestCLIIntegration(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Build the CLI for testing
	cliPath := buildCLI(t)
	defer os.Remove(cliPath)

	// Test help command
	helpCmd := exec.Command(cliPath, "--help")
	output, err := helpCmd.Output()
	if err != nil {
		t.Fatalf("Help command failed: %v", err)
	}

	// Verify help output contains expected commands
	helpOutput := string(output)
	expectedCommands := []string{"dev", "intercept", "list", "completion"}
	for _, cmd := range expectedCommands {
		if !contains(helpOutput, cmd) {
			t.Errorf("Help output should contain command: %s", cmd)
		}
	}
}

// TestVersionCommand tests the version command
func TestVersionCommand(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Build the CLI for testing
	cliPath := buildCLI(t)
	defer os.Remove(cliPath)

	// Test version flag
	versionCmd := exec.Command(cliPath, "--version")
	output, err := versionCmd.Output()
	if err != nil {
		t.Fatalf("Version flag failed: %v", err)
	}

	// Verify version output
	versionOutput := string(output)
	if len(versionOutput) == 0 {
		t.Error("Version output should contain version information")
	}
}

// Helper function to build the CLI
func buildCLI(t *testing.T) string {
	// Create a unique path for each test to avoid race conditions
	cliPath := filepath.Join(os.TempDir(), fmt.Sprintf("test-openframe-%d", os.Getpid()))

	// Get the current working directory
	currentDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}

	// Go up to the CLI root directory (from tests/integration to cli root)
	cliRootDir := filepath.Join(currentDir, "../..")

	cmd := exec.Command("go", "build", "-o", cliPath, ".")
	cmd.Dir = cliRootDir

	// Capture both stdout and stderr for better debugging
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Failed to build CLI: %v\nOutput: %s", err, string(output))
	}

	// Verify the binary was created and is executable
	if _, err := os.Stat(cliPath); os.IsNotExist(err) {
		t.Fatalf("CLI binary was not created at: %s", cliPath)
	}

	t.Cleanup(func() {
		os.Remove(cliPath)
	})

	return cliPath
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr ||
		(len(s) > len(substr) && (s[:len(substr)] == substr ||
			s[len(s)-len(substr):] == substr ||
			containsSubstring(s, substr))))
}

func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
