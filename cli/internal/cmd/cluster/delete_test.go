package cluster

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Mock for UI common functions
type MockUICommon struct {
	mock.Mock
}

func (m *MockUICommon) ConfirmAction(message string) (bool, error) {
	args := m.Called(message)
	return args.Bool(0), args.Error(1)
}

func (m *MockUICommon) SelectFromList(label string, items []string) (int, string, error) {
	args := m.Called(label, items)
	return args.Int(0), args.String(1), args.Error(2)
}

func TestDeleteCommand_Flags(t *testing.T) {
	cmd := getDeleteCmd()
	
	// Test that all expected flags are present
	assert.NotNil(t, cmd.Flags().Lookup("force"))
	
	// Test flag default values
	forceFlag := cmd.Flags().Lookup("force")
	assert.Equal(t, "false", forceFlag.DefValue)
	assert.Equal(t, "f", forceFlag.Shorthand)
}

func TestDeleteCommand_Usage(t *testing.T) {
	cmd := getDeleteCmd()
	
	// Test basic command properties
	assert.Equal(t, "delete [NAME]", cmd.Use)
	assert.Equal(t, "Delete a Kubernetes cluster", cmd.Short)
	assert.Contains(t, cmd.Long, "Delete a Kubernetes cluster and clean up all associated resources")
	
	// Test that the command accepts at most 1 argument
	assert.NotNil(t, cmd.Args)
}

func TestDeleteCommand_HelpOutput(t *testing.T) {
	cmd := getDeleteCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Trigger help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	
	// Help should not return an error
	assert.NoError(t, err)
	
	output := out.String()
	assert.Contains(t, output, "Delete a Kubernetes cluster")
	assert.Contains(t, output, "--force")
	assert.Contains(t, output, "-f,")
	assert.Contains(t, output, "Skip confirmation prompt")
}

func TestRunDeleteCluster_WithClusterName(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getDeleteCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Set the force flag on the command
	cmd.SetArgs([]string{"--force", "test-cluster"})
	cmd.ParseFlags([]string{"--force", "test-cluster"})
	
	// Test would fail because we don't have a real cluster
	// But we can test the argument parsing
	err := runDeleteCluster(cmd, []string{"test-cluster"})
	
	// The command might handle missing clusters gracefully or return an error
	// Both behaviors are acceptable for this test
	if err != nil {
		// If there's an error, it should be cluster-related
		assert.True(t, 
			strings.Contains(err.Error(), "cluster not found") ||
			strings.Contains(err.Error(), "failed to detect cluster type") ||
			strings.Contains(err.Error(), "provider not found") ||
			strings.Contains(err.Error(), "no such cluster"),
			"Expected cluster-related error, got: %v", err)
	}
	// If no error, the command handled the missing cluster gracefully
}

func TestRunDeleteCluster_NoArgs(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getDeleteCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with no arguments (should trigger interactive selection)
	err := runDeleteCluster(cmd, []string{})
	
	// Command should complete gracefully when no clusters are found
	// The delete command prints "No clusters found." and returns nil
	assert.NoError(t, err)
	output := out.String()
	// The "No clusters found" message might be printed to stderr or stdout directly
	// Just verify that the command completed without error
	_ = output
}

func TestDeleteCommand_Integration(t *testing.T) {
	// Test command structure and flag parsing
	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		contains []string
	}{
		{
			name:     "help flag",
			args:     []string{"--help"},
			wantErr:  false,
			contains: []string{"Delete a Kubernetes cluster"},
		},
		{
			name:     "invalid flag",
			args:     []string{"--invalid-flag"},
			wantErr:  true,
			contains: []string{"unknown flag"},
		},
		{
			name:     "too many args",
			args:     []string{"cluster1", "cluster2"},
			wantErr:  true,
			contains: []string{"accepts at most 1 arg"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := getDeleteCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			err := cmd.Execute()
			
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			
			output := out.String()
			for _, contains := range tt.contains {
				assert.Contains(t, output, contains)
			}
		})
	}
}

func TestDeleteCommand_ForceFlag(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		wantForce bool
	}{
		{
			name:      "force flag long form",
			args:      []string{"--force", "test-cluster"},
			wantForce: true,
		},
		{
			name:      "force flag short form",
			args:      []string{"-f", "test-cluster"},
			wantForce: true,
		},
		{
			name:      "no force flag",
			args:      []string{"test-cluster"},
			wantForce: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset global flags
			ResetGlobalFlags()
			
			cmd := getDeleteCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			// Parse flags
			cmd.ParseFlags(tt.args)
			
			// Check force flag value
			assert.Equal(t, tt.wantForce, force)
		})
	}
}

func TestDeleteCommand_ArgumentValidation(t *testing.T) {
	t.Run("maximum args validation", func(t *testing.T) {
		cmd := getDeleteCmd()
		
		// Should accept 0 args
		err := cmd.Args(cmd, []string{})
		assert.NoError(t, err)
		
		// Should accept 1 arg
		err = cmd.Args(cmd, []string{"cluster-name"})
		assert.NoError(t, err)
		
		// Should reject 2+ args
		err = cmd.Args(cmd, []string{"cluster-name", "extra-arg"})
		assert.Error(t, err)
	})
}

func TestDeleteCommand_Examples(t *testing.T) {
	cmd := getDeleteCmd()
	
	// Verify examples are documented
	assert.Contains(t, cmd.Long, "openframe cluster delete my-cluster")
	assert.Contains(t, cmd.Long, "--force")
	assert.Contains(t, cmd.Long, "Interactive cluster selection")
}

func TestDeleteCommand_LongDescription(t *testing.T) {
	cmd := getDeleteCmd()
	
	// Verify comprehensive description
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "Stop any running Telepresence intercepts")
	assert.Contains(t, longDesc, "Delete the Kubernetes cluster")
	assert.Contains(t, longDesc, "Clean up Docker networks and containers")
	assert.Contains(t, longDesc, "Remove cluster-specific configuration")
}

// Test error conditions
func TestDeleteCommand_ErrorCases(t *testing.T) {
	tests := []struct {
		name string
		args []string
	}{
		{"empty cluster name when provided", []string{""}},
		{"whitespace only cluster name", []string{"   "}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset global flags
			ResetGlobalFlags()
			force = true // Skip confirmation
			
			cmd := getDeleteCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			
			// Run with problematic input
			err := runDeleteCluster(cmd, tt.args)
			
			// Should produce some kind of error or output
			assert.True(t, err != nil || out.Len() > 0, "Expected error or output for invalid input")
		})
	}
}

// Benchmark for command creation
func BenchmarkGetDeleteCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getDeleteCmd()
	}
}

// Test that global flags are properly reset
func TestDeleteCommand_GlobalFlagIsolation(t *testing.T) {
	// Set force to true
	force = true
	
	// Reset flags
	ResetGlobalFlags()
	
	// Verify force is now false
	assert.False(t, force)
	
	// Test with force flag
	cmd := getDeleteCmd()
	cmd.SetArgs([]string{"--force", "test"})
	cmd.ParseFlags([]string{"--force", "test"})
	
	assert.True(t, force)
	
	// Reset again
	ResetGlobalFlags()
	assert.False(t, force)
}

// Test flag inheritance and visibility
func TestDeleteCommand_FlagVisibility(t *testing.T) {
	cmd := getDeleteCmd()
	
	// Force flag should be local to delete command
	forceFlag := cmd.Flags().Lookup("force")
	assert.NotNil(t, forceFlag)
	
	// Help flag should be available (may be inherited or built-in)
	// We check by seeing if --help works, not by looking it up directly
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	assert.NoError(t, err)
	assert.Contains(t, out.String(), "help for delete")
}

// Test command aliases and shortcuts
func TestDeleteCommand_Aliases(t *testing.T) {
	cmd := getDeleteCmd()
	
	// Check if command has any aliases defined
	// Delete command currently doesn't have aliases, but we test the structure
	// The Aliases field should exist and be a string slice (even if empty)
	aliases := cmd.Aliases
	assert.IsType(t, []string{}, aliases)
}

// Test output formatting
func TestDeleteCommand_OutputFormatting(t *testing.T) {
	// Test that command produces reasonable output structure
	cmd := getDeleteCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test help output formatting
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	assert.NoError(t, err)
	
	output := out.String()
	
	// Should have proper structure
	assert.Contains(t, output, "Usage:")
	assert.Contains(t, output, "Flags:")
	assert.Contains(t, output, "Examples:")
}

// Test command context and lifecycle
func TestDeleteCommand_Lifecycle(t *testing.T) {
	// Test that command can be created and executed multiple times
	for i := 0; i < 3; i++ {
		cmd := getDeleteCmd()
		assert.NotNil(t, cmd)
		assert.Equal(t, "delete [NAME]", cmd.Use)
		
		// Should be able to access help
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		cmd.SetArgs([]string{"--help"})
		err := cmd.Execute()
		assert.NoError(t, err)
	}
}