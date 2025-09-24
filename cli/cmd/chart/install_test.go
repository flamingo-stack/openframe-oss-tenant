package chart

import (
	"context"
	"strings"
	"testing"

	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/flamingo/openframe/tests/testutil"
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
	// PreRunE was removed - certificate refresh now happens after user confirmation
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
	assert.Contains(t, cmd.Long, "ArgoCD (version 8.2.7)")
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

	// Test that dry-run flag is properly parsed and accessible
	cmd.Flags().Set("dry-run", "true")

	dryRun, err := cmd.Flags().GetBool("dry-run")
	assert.NoError(t, err, "Should be able to get dry-run flag")
	assert.True(t, dryRun, "Dry-run flag should be true when set")

	// Test that the flag extraction works properly
	flags, err := extractInstallFlags(cmd)
	assert.NoError(t, err, "Should be able to extract install flags")
	assert.True(t, flags.DryRun, "DryRun flag should be true in extracted flags")

	// Note: We don't execute the full command here as it would require interactive cluster selection
	// The actual dry-run execution is tested in integration tests where we can control the environment
}

func TestInstallCommandFlagHandling(t *testing.T) {
	tests := []struct {
		name         string
		flags        map[string]string
		expectedArgs InstallFlags
	}{
		{
			name:  "default flags",
			flags: map[string]string{},
			expectedArgs: InstallFlags{
				Force:        false,
				DryRun:       false,
				GitHubRepo:   "https://github.com/flamingo-stack/openframe-oss-tenant",
				GitHubBranch: "main",
				CertDir:      "",
			},
		},
		{
			name: "dry run with custom branch",
			flags: map[string]string{
				"dry-run":       "true",
				"force":         "true",
				"github-branch": "develop",
			},
			expectedArgs: InstallFlags{
				Force:        true,
				DryRun:       true,
				GitHubRepo:   "https://github.com/flamingo-stack/openframe-oss-tenant",
				GitHubBranch: "develop",
				CertDir:      "",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := getInstallCmd()

			// Set flags
			for key, value := range tt.flags {
				err := cmd.Flags().Set(key, value)
				require.NoError(t, err, "Failed to set flag %s", key)
			}

			// Extract and validate flags
			flags, err := extractInstallFlags(cmd)
			assert.NoError(t, err, "Should extract flags without error")
			assert.Equal(t, tt.expectedArgs, *flags, "Extracted flags should match expected")
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
	// This test validates that the runInstallCommand function exists and has proper structure
	// Actual execution tests are handled in integration tests to avoid UI interaction issues

	cmd := getInstallCmd()
	assert.NotNil(t, cmd.RunE, "runInstallCommand should be assigned to RunE")

	// Test flag extraction functionality
	cmd.Flags().Set("dry-run", "true")
	cmd.Flags().Set("force", "true")
	cmd.Flags().Set("github-branch", "develop")

	flags, err := extractInstallFlags(cmd)
	assert.NoError(t, err, "Should extract flags without error")
	assert.True(t, flags.DryRun, "Should extract dry-run flag correctly")
	assert.True(t, flags.Force, "Should extract force flag correctly")
	assert.Equal(t, "develop", flags.GitHubBranch, "Should extract github-branch flag correctly")
}
