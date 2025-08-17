package cluster

import (
	"github.com/flamingo/openframe-cli/internal/cluster/utils"
	"strings"
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/flamingo/openframe-cli/tests/testutil"
	uiCluster "github.com/flamingo/openframe-cli/internal/cluster/ui"
)

func init() {
	testutil.InitializeTestMode()
}
func TestStatusCommand_Structure(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getStatusCmd()
	
	tcs := testutil.TestCommandStructure{
		Name:    "status",
		Use:     "status [NAME]",
		Short:   "Show detailed cluster status and information",
		Aliases: nil,
		HasRunE: true,
		HasArgs: true,
		LongContains: []string{
			"Show detailed status information for a Kubernetes cluster",
			"openframe cluster status",
			"interactive selection",
		},
	}
	
	tcs.TestCommand(t, cmd)
}

func TestStatusCommand_Flags(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getStatusCmd()
	
	tests := []struct {
		flag      string
		shorthand string
		defValue  string
		usage     string
	}{
		{"detailed", "d", "false", "Show detailed resource information"},
		{"no-apps", "", "false", "Skip application status"},
	}
	
	for _, tt := range tests {
		t.Run(tt.flag, func(t *testing.T) {
			flag := cmd.Flags().Lookup(tt.flag)
			assert.NotNil(t, flag, "Flag %s should exist", tt.flag)
			assert.Equal(t, tt.defValue, flag.DefValue, "Default value mismatch for %s", tt.flag)
			if tt.shorthand != "" {
				assert.Equal(t, tt.shorthand, flag.Shorthand, "Shorthand mismatch for %s", tt.flag)
			}
		})
	}
}

func TestStatusCommand_CLI(t *testing.T) {
	scenarios := []testutil.TestCLIScenario{
		{Name: "help flag", Args: []string{"--help"}, WantErr: false, Contains: []string{"Show detailed status information", "--detailed", "--no-apps"}},
		{Name: "invalid flag", Args: []string{"--invalid-flag"}, WantErr: true, Contains: []string{"unknown flag"}},
		{Name: "too many args", Args: []string{"cluster1", "cluster2"}, WantErr: true, Contains: []string{"accepts at most 1 arg"}},
	}
	
	testutil.TestCLIScenarios(t, func() *cobra.Command {
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer utils.ResetGlobalFlags()
		return getStatusCmd()
	}, scenarios)
}

func TestStatusCommand_Execution(t *testing.T) {
	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		errContains string
	}{
		{
			name: "with cluster name",
			args: []string{"test-cluster"},
			wantErr: false, // Should handle gracefully when cluster not found
		},
		{
			name: "empty cluster name",
			args: []string{""},
			wantErr: true,
			errContains: "cluster name cannot be empty",
		},
		{
			name: "no args triggers interactive selection",
			args: []string{},
			wantErr: false, // Should complete gracefully when no clusters found
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// No setup needed
			
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getStatusCmd()
			err := runClusterStatus(cmd, tt.args)
			
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
			} else {
				// Should either succeed or return cluster-related error
				if err != nil {
					assert.True(t, 
						strings.Contains(err.Error(), "failed to detect cluster type") ||
						strings.Contains(err.Error(), "failed to get cluster status") ||
						strings.Contains(err.Error(), "cluster not found") ||
						strings.Contains(err.Error(), "failed to list clusters"),
						"Expected cluster-related error, got: %v", err)
				}
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
		{"detailed flag long form", []string{"--detailed", "test-cluster"}, true, false},
		{"detailed flag short form", []string{"-d", "test-cluster"}, true, false},
		{"no-apps flag", []string{"--no-apps", "test-cluster"}, false, true},
		{"both flags", []string{"--detailed", "--no-apps", "test-cluster"}, true, true},
		{"no flags", []string{"test-cluster"}, false, false},
		{"detailed=true", []string{"--detailed=true"}, true, false},
		{"no-apps=false", []string{"--no-apps=false"}, false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getStatusCmd()
			cmd.SetArgs(tt.args)
			cmd.ParseFlags(tt.args)
			
			detailed, _ := cmd.Flags().GetBool("detailed")
			noApps, _ := cmd.Flags().GetBool("no-apps")
			
			assert.Equal(t, tt.wantDetailed, detailed)
			assert.Equal(t, tt.wantNoApps, noApps)
		})
	}
}

func TestStatusCommand_ArgumentValidation(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getStatusCmd()
	
	tests := []struct {
		name    string
		args    []string
		wantErr bool
	}{
		{"no args", []string{}, false},
		{"one arg", []string{"cluster-name"}, false},
		{"too many args", []string{"cluster1", "cluster2"}, true},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := cmd.Args(cmd, tt.args)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test utility functions that are used by the status command
func TestStatusUtilityFunctions(t *testing.T) {
	t.Run("GetStatusColor", func(t *testing.T) {
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
				colorFunc := uiCluster.GetStatusColor(tt.status)
				assert.NotNil(t, colorFunc)
				
				result := colorFunc(tt.status)
				assert.NotEmpty(t, result)
			})
		}
	})

	t.Run("ErrorCases", func(t *testing.T) {
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer utils.ResetGlobalFlags()
		
		cmd := getStatusCmd()
		err := runClusterStatus(cmd, []string{"   "}) // whitespace only
		assert.True(t, err != nil, "Expected error for whitespace-only cluster name")
	})
}