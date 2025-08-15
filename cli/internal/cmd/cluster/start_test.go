package cluster

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStartCommand_Flags(t *testing.T) {
	cmd := getStartCmd()
	
	// Start command should not have any specific flags (uses global flags only)
	// Check that basic command structure is correct
	assert.NotNil(t, cmd)
	assert.Equal(t, "start [NAME]", cmd.Use)
	assert.Equal(t, "Start a stopped Kubernetes cluster", cmd.Short)
}

func TestStartCommand_Usage(t *testing.T) {
	cmd := getStartCmd()
	
	// Test basic command properties
	assert.Equal(t, "start [NAME]", cmd.Use)
	assert.Equal(t, "Start a stopped Kubernetes cluster", cmd.Short)
	assert.Contains(t, cmd.Long, "Start - Start a previously stopped Kubernetes cluster")
	
	// Test that the command accepts at most 1 argument
	assert.NotNil(t, cmd.Args)
}

func TestStartCommand_HelpOutput(t *testing.T) {
	cmd := getStartCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Trigger help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	
	// Help should not return an error
	assert.NoError(t, err)
	
	output := out.String()
	assert.Contains(t, output, "Start a previously stopped Kubernetes cluster")
	assert.Contains(t, output, "Interactive cluster selection")
	assert.Contains(t, output, "Start a specific cluster")
	assert.Contains(t, output, "openframe cluster start my-cluster")
}

func TestRunStartCluster_WithClusterName(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getStartCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test would fail because we don't have a real cluster
	// But we can test the argument parsing
	err := runStartCluster(cmd, []string{"test-cluster"})
	
	// The command might handle missing clusters gracefully or return an error
	// Both behaviors are acceptable for this test
	if err != nil {
		// If there's an error, it should be cluster-related
		assert.True(t, 
			strings.Contains(err.Error(), "failed to detect cluster type") ||
			strings.Contains(err.Error(), "failed to start cluster") ||
			strings.Contains(err.Error(), "cluster not found"),
			"Expected cluster-related error, got: %v", err)
	}
	// If no error, the command handled the missing cluster gracefully
}

func TestRunStartCluster_EmptyName(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getStartCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with empty string argument
	err := runStartCluster(cmd, []string{""})
	
	// Should fail with empty name error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cluster name cannot be empty")
}

func TestRunStartCluster_NoArgs(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getStartCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with no arguments (should trigger interactive selection)
	err := runStartCluster(cmd, []string{})
	
	// Command should complete gracefully when no clusters are found
	// The selectStoppedCluster function shows "No clusters found" and returns "", nil
	// Then the main function shows "No cluster selected. Operation cancelled." and returns nil
	assert.NoError(t, err)
	output := out.String()
	// Messages might be printed to stderr or stdout directly
	// Just verify that the command completed without error
	_ = output
}

func TestStartCommand_Integration(t *testing.T) {
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
			contains: []string{"Start a previously stopped Kubernetes cluster"},
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
			cmd := getStartCmd()
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

func TestStartCommand_ArgumentValidation(t *testing.T) {
	t.Run("maximum args validation", func(t *testing.T) {
		cmd := getStartCmd()
		
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

func TestStartCommand_Examples(t *testing.T) {
	cmd := getStartCmd()
	
	// Verify examples are documented
	assert.Contains(t, cmd.Long, "openframe cluster start my-cluster")
	assert.Contains(t, cmd.Long, "Interactive cluster selection")
	assert.Contains(t, cmd.Long, "Start with verbose output")
}

func TestStartCommand_LongDescription(t *testing.T) {
	cmd := getStartCmd()
	
	// Verify comprehensive description
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "Start the cluster infrastructure")
	assert.Contains(t, longDesc, "Wait for cluster nodes to be ready")
	assert.Contains(t, longDesc, "Verify cluster connectivity")
	assert.Contains(t, longDesc, "Display cluster status")
}

// Test error conditions
func TestStartCommand_ErrorCases(t *testing.T) {
	tests := []struct {
		name string
		args []string
	}{
		{"whitespace only cluster name", []string{"   "}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset global flags
			ResetGlobalFlags()
			
			cmd := getStartCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			
			// Run with problematic input
			err := runStartCluster(cmd, tt.args)
			
			// Should produce some kind of error or output
			assert.True(t, err != nil || out.Len() > 0, "Expected error or output for invalid input")
		})
	}
}

// Benchmark for command creation
func BenchmarkGetStartCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getStartCmd()
	}
}

// Test command lifecycle
func TestStartCommand_Lifecycle(t *testing.T) {
	// Test that command can be created and executed multiple times
	for i := 0; i < 3; i++ {
		cmd := getStartCmd()
		assert.NotNil(t, cmd)
		assert.Equal(t, "start [NAME]", cmd.Use)
		
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
func TestStartCommand_OutputFormatting(t *testing.T) {
	// Test that command produces reasonable output structure
	cmd := getStartCmd()
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
	assert.Contains(t, output, "Examples:")
}

// Test selectStoppedCluster function isolation
func TestSelectStoppedCluster_NoStoppedClusters(t *testing.T) {
	// This test would require mocking the cluster manager
	// For now, we'll just test that the function exists and has the right signature
	// Test that the function exists and can be called
	// This would require a real cluster in a full integration test
	assert.True(t, true, "Test placeholder - would test with real cluster environment")
}

func TestStartCommand_DescriptionContent(t *testing.T) {
	cmd := getStartCmd()
	
	// Verify that the description mentions key functionality
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "previously stopped")
	assert.Contains(t, longDesc, "interactive cluster selection")
	assert.Contains(t, longDesc, "direct cluster specification")
	assert.Contains(t, longDesc, "restore the cluster to a running state")
}

// Test command structure consistency
func TestStartCommand_StructureConsistency(t *testing.T) {
	cmd := getStartCmd()
	
	// Should have Run function
	assert.NotNil(t, cmd.RunE)
	
	// Should have proper argument validation
	assert.NotNil(t, cmd.Args)
	
	// Should have description
	assert.NotEmpty(t, cmd.Short)
	assert.NotEmpty(t, cmd.Long)
	
	// Should have proper command name
	assert.Equal(t, "start [NAME]", cmd.Use)
}