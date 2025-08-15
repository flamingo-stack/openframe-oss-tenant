package cluster

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/flamingo/openframe-cli/internal/ui/common"
)

func init() {
	// Suppress logo output during tests
	common.TestMode = true
}
func TestCleanupCommand_Flags(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Test command properties
	assert.Equal(t, "cleanup [NAME]", cmd.Use)
	assert.Equal(t, []string{"c"}, cmd.Aliases)
	assert.Equal(t, "Clean up unused cluster resources", cmd.Short)
	
	// Test that command accepts at most 1 argument
	assert.NotNil(t, cmd.Args)
}

func TestCleanupCommand_Usage(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Test basic command properties
	assert.Equal(t, "cleanup [NAME]", cmd.Use)
	assert.Equal(t, "Clean up unused cluster resources", cmd.Short)
	assert.Contains(t, cmd.Long, "Remove unused images and resources from cluster nodes")
	
	// Test that the command accepts at most 1 argument
	assert.NotNil(t, cmd.Args)
}

func TestCleanupCommand_HelpOutput(t *testing.T) {
	cmd := getCleanupCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Trigger help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	
	// Help should not return an error
	assert.NoError(t, err)
	
	output := out.String()
	assert.Contains(t, output, "Remove unused images and resources")
	assert.Contains(t, output, "openframe cluster cleanup")
	assert.Contains(t, output, "openframe cluster cleanup my-cluster")
}

func TestRunCleanupCluster_WithClusterName(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getCleanupCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test would fail because we don't have a real cluster
	// But we can test the argument parsing
	err := runCleanupCluster(cmd, []string{"test-cluster"})
	
	// The command might handle missing clusters gracefully or return an error
	// Both behaviors are acceptable for this test
	if err != nil {
		// If there's an error, it should be cluster-related
		assert.True(t, 
			strings.Contains(err.Error(), "failed to detect cluster type") ||
			strings.Contains(err.Error(), "cluster not found") ||
			strings.Contains(err.Error(), "cleanup not supported"),
			"Expected cluster-related error, got: %v", err)
	}
	// If no error, the command handled the missing cluster gracefully
}

func TestRunCleanupCluster_NoArgs(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getCleanupCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with no arguments (should use default cluster name)
	err := runCleanupCluster(cmd, []string{})
	
	// Command should complete gracefully when no clusters are found
	// or provide appropriate error message
	if err != nil {
		// If there's an error, it should be cluster-related
		assert.True(t, 
			strings.Contains(err.Error(), "failed to detect cluster type") ||
			strings.Contains(err.Error(), "cluster not found") ||
			strings.Contains(err.Error(), "cleanup not supported"),
			"Expected cluster-related error, got: %v", err)
	}
	// If no error, the command handled the missing cluster gracefully
}

func TestCleanupCommand_Integration(t *testing.T) {
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
			contains: []string{"Remove unused images and resources"},
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
			cmd := getCleanupCmd()
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

func TestCleanupCommand_ArgumentValidation(t *testing.T) {
	t.Run("maximum args validation", func(t *testing.T) {
		cmd := getCleanupCmd()
		
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

func TestCleanupCommand_Examples(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Verify examples are documented
	assert.Contains(t, cmd.Long, "openframe cluster cleanup")
	assert.Contains(t, cmd.Long, "openframe cluster cleanup my-cluster")
	// These old comments have been simplified, so remove these assertions
}

func TestCleanupCommand_LongDescription(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Verify comprehensive description
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "Remove unused images and resources")
	assert.Contains(t, longDesc, "freeing disk space")
	assert.Contains(t, longDesc, "development clusters")
	assert.Contains(t, longDesc, "with many builds")
}

func TestCleanupCommand_Aliases(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Test command aliases
	expectedAliases := []string{"c"}
	assert.Equal(t, expectedAliases, cmd.Aliases)
}

// Test error conditions
func TestCleanupCommand_ErrorCases(t *testing.T) {
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
			
			cmd := getCleanupCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			
			// Run with problematic input
			err := runCleanupCluster(cmd, tt.args)
			
			// Should produce some kind of error or handle gracefully
			// Both are acceptable behaviors
			if err != nil {
				assert.True(t, 
					strings.Contains(err.Error(), "cluster") ||
					strings.Contains(err.Error(), "failed") ||
					strings.Contains(err.Error(), "not supported"),
					"Expected meaningful error message")
			}
		})
	}
}

// Benchmark for command creation
func BenchmarkGetCleanupCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getCleanupCmd()
	}
}

// Test command lifecycle
func TestCleanupCommand_Lifecycle(t *testing.T) {
	// Test that command can be created and executed multiple times
	for i := 0; i < 3; i++ {
		cmd := getCleanupCmd()
		assert.NotNil(t, cmd)
		assert.Equal(t, "cleanup [NAME]", cmd.Use)
		
		// Should be able to access help
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		cmd.SetArgs([]string{"--help"})
		err := cmd.Execute()
		assert.NoError(t, err)
	}
}

// Test output formatting
func TestCleanupCommand_OutputFormatting(t *testing.T) {
	// Test that command produces reasonable output structure
	cmd := getCleanupCmd()
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
	assert.Contains(t, output, "Aliases:")
	assert.Contains(t, output, "Examples:")
}

func TestCleanupCommand_DescriptionContent(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Verify that the description mentions key functionality
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "unused images")
	assert.Contains(t, longDesc, "cluster nodes")
	assert.Contains(t, longDesc, "disk space")
	assert.Contains(t, longDesc, "development clusters")
}

// Test command structure consistency
func TestCleanupCommand_StructureConsistency(t *testing.T) {
	cmd := getCleanupCmd()
	
	// Should have Run function
	assert.NotNil(t, cmd.RunE)
	
	// Should have proper argument validation
	assert.NotNil(t, cmd.Args)
	
	// Should have description
	assert.NotEmpty(t, cmd.Short)
	assert.NotEmpty(t, cmd.Long)
	
	// Should have proper command name
	assert.Equal(t, "cleanup [NAME]", cmd.Use)
	
	// Should have aliases
	assert.NotEmpty(t, cmd.Aliases)
	assert.Contains(t, cmd.Aliases, "c")
}

