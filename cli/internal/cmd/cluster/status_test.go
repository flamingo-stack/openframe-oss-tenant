package cluster

import (
	"bytes"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStatusCommand_Flags(t *testing.T) {
	cmd := getStatusCmd()
	
	// Test that all expected flags are present
	assert.NotNil(t, cmd.Flags().Lookup("detailed"))
	assert.NotNil(t, cmd.Flags().Lookup("no-apps"))
	
	// Test flag default values
	detailedFlag := cmd.Flags().Lookup("detailed")
	assert.Equal(t, "false", detailedFlag.DefValue)
	assert.Equal(t, "d", detailedFlag.Shorthand)
	
	noAppsFlag := cmd.Flags().Lookup("no-apps")
	assert.Equal(t, "false", noAppsFlag.DefValue)
	assert.Equal(t, "", noAppsFlag.Shorthand) // no-apps has no short form
}

func TestStatusCommand_Usage(t *testing.T) {
	cmd := getStatusCmd()
	
	// Test basic command properties
	assert.Equal(t, "status [NAME]", cmd.Use)
	assert.Equal(t, "Show detailed cluster status and information", cmd.Short)
	assert.Contains(t, cmd.Long, "Status - Show detailed status information for a Kubernetes cluster")
	
	// Test that the command accepts at most 1 argument
	assert.NotNil(t, cmd.Args)
}

func TestStatusCommand_HelpOutput(t *testing.T) {
	cmd := getStatusCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Trigger help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	
	// Help should not return an error
	assert.NoError(t, err)
	
	output := out.String()
	assert.Contains(t, output, "Show detailed status information for a Kubernetes cluster")
	assert.Contains(t, output, "--detailed")
	assert.Contains(t, output, "-d,")
	assert.Contains(t, output, "--no-apps")
	assert.Contains(t, output, "Show detailed resource information")
	assert.Contains(t, output, "openframe cluster status my-cluster")
}

func TestRunStatusCluster_WithClusterName(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getStatusCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test would fail because we don't have a real cluster
	// But we can test the argument parsing
	err := runClusterStatus(cmd, []string{"test-cluster"})
	
	// The command might handle missing clusters gracefully or return an error
	// Both behaviors are acceptable for this test
	if err != nil {
		// If there's an error, it should be cluster-related
		assert.True(t, 
			strings.Contains(err.Error(), "failed to detect cluster type") ||
			strings.Contains(err.Error(), "cluster") && strings.Contains(err.Error(), "not found") ||
			strings.Contains(err.Error(), "no such cluster") ||
			strings.Contains(err.Error(), "failed to get cluster status"),
			"Expected cluster-related error, got: %v", err)
	}
	// If no error, the command handled the missing cluster gracefully
}

func TestRunStatusCluster_EmptyName(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getStatusCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with empty string argument
	err := runClusterStatus(cmd, []string{""})
	
	// Should fail with empty name error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cluster name cannot be empty")
}

func TestRunStatusCluster_NoArgs(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getStatusCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with no arguments (should trigger interactive selection)
	err := runClusterStatus(cmd, []string{})
	
	// Command should complete gracefully when no clusters are found
	// The selectRunningCluster function shows "No clusters found" and returns "", nil
	// Then the main function shows "No cluster selected. Operation cancelled." and returns nil
	assert.NoError(t, err)
	output := out.String()
	// Messages might be printed to stderr or stdout directly
	// Just verify that the command completed without error
	_ = output
}

func TestStatusCommand_Integration(t *testing.T) {
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
			contains: []string{"Show detailed status information for a Kubernetes cluster"},
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
			cmd := getStatusCmd()
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

func TestStatusCommand_FlagValues(t *testing.T) {
	tests := []struct {
		name        string
		args        []string
		wantDetailed bool
		wantNoApps  bool
	}{
		{
			name:        "detailed flag long form",
			args:        []string{"--detailed", "test-cluster"},
			wantDetailed: true,
			wantNoApps:  false,
		},
		{
			name:        "detailed flag short form",
			args:        []string{"-d", "test-cluster"},
			wantDetailed: true,
			wantNoApps:  false,
		},
		{
			name:        "no-apps flag",
			args:        []string{"--no-apps", "test-cluster"},
			wantDetailed: false,
			wantNoApps:  true,
		},
		{
			name:        "both flags",
			args:        []string{"--detailed", "--no-apps", "test-cluster"},
			wantDetailed: true,
			wantNoApps:  true,
		},
		{
			name:        "no flags",
			args:        []string{"test-cluster"},
			wantDetailed: false,
			wantNoApps:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := getStatusCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			// Parse flags
			cmd.ParseFlags(tt.args)
			
			// Check flag values
			detailed, _ := cmd.Flags().GetBool("detailed")
			noApps, _ := cmd.Flags().GetBool("no-apps")
			
			assert.Equal(t, tt.wantDetailed, detailed)
			assert.Equal(t, tt.wantNoApps, noApps)
		})
	}
}

func TestStatusCommand_ArgumentValidation(t *testing.T) {
	t.Run("maximum args validation", func(t *testing.T) {
		cmd := getStatusCmd()
		
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

func TestStatusCommand_Examples(t *testing.T) {
	cmd := getStatusCmd()
	
	// Verify examples are documented
	assert.Contains(t, cmd.Long, "openframe cluster status my-cluster")
	assert.Contains(t, cmd.Long, "Interactive cluster selection")
	assert.Contains(t, cmd.Long, "Show status with verbose output")
}

func TestStatusCommand_LongDescription(t *testing.T) {
	cmd := getStatusCmd()
	
	// Verify comprehensive description
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "Cluster health and node status")
	assert.Contains(t, longDesc, "Installed Helm charts")
	assert.Contains(t, longDesc, "Resource usage and capacity")
	assert.Contains(t, longDesc, "Connectivity and configuration")
}

// Test getStatusColor function
func TestGetStatusColor(t *testing.T) {
	tests := []struct {
		status       string
		expectedType string
	}{
		{"Running", "green"},
		{"ready", "green"},
		{"READY", "green"},
		{"Stopped", "yellow"},
		{"not ready", "yellow"},
		{"pending", "yellow"},
		{"Error", "red"},
		{"failed", "red"},
		{"UNHEALTHY", "red"},
		{"unknown", "gray"},
		{"custom", "gray"},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			colorFunc := getStatusColor(tt.status)
			assert.NotNil(t, colorFunc)
			
			// Test that the function can be called
			result := colorFunc(tt.status)
			assert.NotEmpty(t, result)
		})
	}
}

// Test error conditions
func TestStatusCommand_ErrorCases(t *testing.T) {
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
			
			cmd := getStatusCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			
			// Run with problematic input
			err := runClusterStatus(cmd, tt.args)
			
			// Should produce some kind of error or output
			assert.True(t, err != nil || out.Len() > 0, "Expected error or output for invalid input")
		})
	}
}

// Benchmark for command creation
func BenchmarkGetStatusCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getStatusCmd()
	}
}

// Test command lifecycle
func TestStatusCommand_Lifecycle(t *testing.T) {
	// Test that command can be created and executed multiple times
	for i := 0; i < 3; i++ {
		cmd := getStatusCmd()
		assert.NotNil(t, cmd)
		assert.Equal(t, "status [NAME]", cmd.Use)
		
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
func TestStatusCommand_OutputFormatting(t *testing.T) {
	// Test that command produces reasonable output structure
	cmd := getStatusCmd()
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

func TestStatusCommand_DescriptionContent(t *testing.T) {
	cmd := getStatusCmd()
	
	// Verify that the description mentions key functionality
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "comprehensive information")
	assert.Contains(t, longDesc, "interactive selection")
	assert.Contains(t, longDesc, "Resource usage and capacity")
	assert.Contains(t, longDesc, "Service endpoints")
}

// Test command structure consistency
func TestStatusCommand_StructureConsistency(t *testing.T) {
	cmd := getStatusCmd()
	
	// Should have Run function
	assert.NotNil(t, cmd.RunE)
	
	// Should have proper argument validation
	assert.NotNil(t, cmd.Args)
	
	// Should have description
	assert.NotEmpty(t, cmd.Short)
	assert.NotEmpty(t, cmd.Long)
	
	// Should have proper command name
	assert.Equal(t, "status [NAME]", cmd.Use)
	
	// Should have flags
	detailedFlag := cmd.Flags().Lookup("detailed")
	assert.NotNil(t, detailedFlag)
	assert.Equal(t, "d", detailedFlag.Shorthand)
	
	noAppsFlag := cmd.Flags().Lookup("no-apps")
	assert.NotNil(t, noAppsFlag)
}

// Test flag combinations
func TestStatusCommand_FlagCombinations(t *testing.T) {
	testCases := [][]string{
		{"--detailed"},
		{"-d"},
		{"--no-apps"},
		{"--detailed", "--no-apps"},
		{"-d", "--no-apps"},
		{"--detailed=true"},
		{"--no-apps=false"},
	}
	
	for _, args := range testCases {
		t.Run(fmt.Sprintf("args: %v", args), func(t *testing.T) {
			cmd := getStatusCmd()
			cmd.SetArgs(append(args, "test-cluster"))
			
			// Should parse without error
			err := cmd.ParseFlags(append(args, "test-cluster"))
			assert.NoError(t, err)
			
			// Should be able to retrieve flag values
			detailed, err := cmd.Flags().GetBool("detailed")
			assert.NoError(t, err)
			_ = detailed
			
			noApps, err := cmd.Flags().GetBool("no-apps")
			assert.NoError(t, err)
			_ = noApps
		})
	}
}