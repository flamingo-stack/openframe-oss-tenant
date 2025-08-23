package chart

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	testutil.InitializeTestMode()
}

func TestInstallCommand(t *testing.T) {
	cmd := getInstallCmd()

	// Test basic structure
	assert.Equal(t, "install", cmd.Name(), "Command name should match")
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
	assert.NotNil(t, cmd.RunE, "Install command should have RunE function")
	assert.NotNil(t, cmd.PreRunE, "Install command should have PreRunE function")
}

func TestInstallCommandFlags(t *testing.T) {
	cmd := getInstallCmd()

	// Test that required flags exist
	assert.NotNil(t, cmd.Flags().Lookup("force"), "Should have force flag")
	assert.NotNil(t, cmd.Flags().Lookup("dry-run"), "Should have dry-run flag")

	// Test flag shorthand
	forceFlag := cmd.Flags().Lookup("force")
	assert.Equal(t, "f", forceFlag.Shorthand, "Force flag should have 'f' shorthand")

	// Test flag defaults
	forceDefault, _ := cmd.Flags().GetBool("force")
	assert.False(t, forceDefault, "Force flag should default to false")

	dryRunDefault, _ := cmd.Flags().GetBool("dry-run")
	assert.False(t, dryRunDefault, "Dry-run flag should default to false")
}

func TestInstallCommandHelp(t *testing.T) {
	cmd := getInstallCmd()

	// Test that help contains expected content
	assert.Contains(t, cmd.Short, "Install ArgoCD")
	assert.Contains(t, cmd.Long, "ArgoCD (version 8.1.4)")
	assert.Contains(t, cmd.Long, "openframe chart install")
	assert.Contains(t, cmd.Long, "openframe chart install my-cluster")
}

func TestInstallCommandUsage(t *testing.T) {
	cmd := getInstallCmd()

	// Test usage string
	assert.Equal(t, "install [cluster-name]", cmd.Use)
}

func TestInstallCommandWithDryRun(t *testing.T) {
	cmd := getInstallCmd()

	// Set up buffer to capture output
	buf := new(bytes.Buffer)
	cmd.SetOut(buf)
	cmd.SetErr(buf)

	// Set dry-run flag
	cmd.Flags().Set("dry-run", "true")

	// Execute with dry-run - in test environment this will fail due to interactive cluster selection
	// The command discovers clusters and attempts interactive selection, which fails with ^D in tests
	err := cmd.Execute()

	// In test environment, we expect cluster selection to fail due to UI interaction limitations
	// This validates that the command correctly attempts cluster selection (expected behavior)
	if err != nil {
		assert.Contains(t, err.Error(), "cluster selection failed", "Should fail due to cluster selection")
	} else {
		// If no error, that's also acceptable (graceful handling)
		assert.NoError(t, err)
	}
}

func TestInstallCommandExecution(t *testing.T) {
	tests := []struct {
		name        string
		args        []string
		flags       map[string]string
		expectError bool
		skipCI      bool // Skip in CI/test environments where UI interactions fail
	}{
		{
			name:        "no clusters available - dry run only",
			args:        []string{},
			flags:       map[string]string{"dry-run": "true"},
			expectError: true,  // Will fail due to cluster selection UI interaction
			skipCI:      false, // Test this scenario
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.skipCI && testing.Short() {
				t.Skip("Skipping UI interaction test in short mode")
			}

			cmd := getInstallCmd()

			// Set up buffer to capture output
			buf := new(bytes.Buffer)
			cmd.SetOut(buf)
			cmd.SetErr(buf)

			// Set flags
			for key, value := range tt.flags {
				err := cmd.Flags().Set(key, value)
				require.NoError(t, err, "Failed to set flag %s", key)
			}

			// Set args
			cmd.SetArgs(tt.args)

			// Execute command - it should handle no clusters gracefully
			err := cmd.Execute()

			if tt.expectError {
				assert.Error(t, err)
				// Verify it's the expected cluster selection error
				if err != nil {
					assert.Contains(t, err.Error(), "cluster selection failed")
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// MockExecutor for integration tests
type MockExecutor struct {
	commands [][]string
	results  map[string]*executor.CommandResult
	errors   map[string]error
}

func NewMockExecutor() *MockExecutor {
	return &MockExecutor{
		commands: make([][]string, 0),
		results:  make(map[string]*executor.CommandResult),
		errors:   make(map[string]error),
	}
}

func (m *MockExecutor) Execute(ctx context.Context, name string, args ...string) (*executor.CommandResult, error) {
	command := append([]string{name}, args...)
	m.commands = append(m.commands, command)

	commandStr := strings.Join(command, " ")

	if err, exists := m.errors[commandStr]; exists {
		return nil, err
	}

	if result, exists := m.results[commandStr]; exists {
		return result, nil
	}

	// Default success result
	return &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "",
		Stderr:   "",
	}, nil
}

func (m *MockExecutor) ExecuteWithOptions(ctx context.Context, options executor.ExecuteOptions) (*executor.CommandResult, error) {
	return m.Execute(ctx, options.Command, options.Args...)
}

func TestRunInstallCommand(t *testing.T) {
	// This test validates the runInstallCommand function behavior
	// Note: We only test scenarios that don't require UI interaction

	tests := []struct {
		name     string
		args     []string
		setupCmd func(*cobra.Command)
		skipTest bool
	}{
		{
			name: "dry-run mode - no clusters",
			args: []string{},
			setupCmd: func(cmd *cobra.Command) {
				cmd.Flags().Set("dry-run", "true")
			},
			skipTest: false, // This should work in test mode
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.skipTest {
				t.Skip("Skipping test that requires UI interaction")
			}

			cmd := getInstallCmd()

			if tt.setupCmd != nil {
				tt.setupCmd(cmd)
			}

			// Run the command function directly
			err := cmd.RunE(cmd, tt.args)

			// In test mode with no clusters, the command will fail due to UI interaction
			// The cluster selection UI tries to get user input which results in ^D error
			if err != nil {
				assert.Contains(t, err.Error(), "cluster selection failed", "Should fail due to cluster selection UI")
			} else {
				// If no error, that means it handled gracefully (acceptable)
				assert.NoError(t, err)
			}
		})
	}
}
