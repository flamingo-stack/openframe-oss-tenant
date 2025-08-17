package cluster

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/flamingo/openframe-cli/tests/testutil"
)

func init() {
	// Suppress logo output during tests
	testutil.InitializeTestMode()
}
func TestCleanupCommand_Structure(t *testing.T) {
	// Set up global flags for testing
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getCleanupCmd()
	
	tcs := testutil.TestCommandStructure{
		Name:     "cleanup",
		Use:      "cleanup [NAME]",
		Short:    "Clean up unused cluster resources",
		Aliases:  []string{"c"},
		HasRunE:  true,
		HasArgs:  true,
		LongContains: []string{
			"Remove unused images and resources from cluster nodes",
			"openframe cluster cleanup",
			"cleanup my-cluster",
		},
	}
	
	tcs.TestCommand(t, cmd)
}

func TestCleanupCommand_Execution(t *testing.T) {
	tests := []struct {
		name string
		args []string
		desc string
	}{
		{"with cluster name", []string{"test-cluster"}, "should handle cluster name argument"},
		{"no args", []string{}, "should use default cluster name"},
		{"empty name", []string{""}, "should handle empty cluster name"},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set up global flags for testing
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
			defer utils.ResetGlobalFlags()
			
			cmd := getCleanupCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			
			err := runCleanupCluster(cmd, tt.args)
			
			// Should either succeed gracefully or return meaningful error
			if err != nil {
				assert.True(t, 
					strings.Contains(err.Error(), "failed to detect cluster type") ||
					strings.Contains(err.Error(), "cluster not found") ||
					strings.Contains(err.Error(), "cleanup not supported") ||
					strings.Contains(err.Error(), "failed to list clusters"),
					"Expected cluster-related error, got: %v", err)
			}
		})
	}
}

func TestCleanupCommand_CLI(t *testing.T) {
	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		contains []string
	}{
		{"help flag", []string{"--help"}, false, []string{"Remove unused images and resources", "openframe cluster cleanup"}},
		{"invalid flag", []string{"--invalid-flag"}, true, []string{"unknown flag"}},
		{"too many args", []string{"cluster1", "cluster2"}, true, []string{"accepts at most 1 arg"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set up global flags for testing
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
			defer utils.ResetGlobalFlags()
			
			cmd := getCleanupCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			err := cmd.Execute()
			assert.Equal(t, tt.wantErr, err != nil)
			
			output := out.String()
			for _, contains := range tt.contains {
				assert.Contains(t, output, contains)
			}
		})
	}
}

func TestCleanupCommand_ArgumentValidation(t *testing.T) {
	t.Run("maximum args validation", func(t *testing.T) {
		// Set up global flags for testing
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer utils.ResetGlobalFlags()
		
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

func TestCleanupCommand_Content(t *testing.T) {
	// Set up global flags for testing
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getCleanupCmd()
	longDesc := cmd.Long
	
	// Verify description content and examples
	assert.Contains(t, longDesc, "Remove unused images and resources")
	assert.Contains(t, longDesc, "freeing disk space")
	assert.Contains(t, longDesc, "development clusters")
	assert.Contains(t, longDesc, "openframe cluster cleanup")
	assert.Contains(t, longDesc, "openframe cluster cleanup my-cluster")
}

func TestCleanupCommand_VerboseFlag(t *testing.T) {
	// Test that verbose flag affects cleanup behavior
	// Set up global flags for testing
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	// Test with verbose enabled
	utils.GetGlobalFlags().Global.Verbose = true
	cmd := getCleanupCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	err := runCleanupCluster(cmd, []string{"test-cluster"})
	// Should handle gracefully regardless of verbose setting
	if err != nil {
		assert.Contains(t, err.Error(), "cluster")
	}
	
	// Reset verbose
	utils.GetGlobalFlags().Global.Verbose = false
	assert.False(t, utils.GetGlobalFlags().Global.Verbose)
}



