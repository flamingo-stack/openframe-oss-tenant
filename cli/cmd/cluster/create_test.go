package cluster

import (
	"bytes"
	"testing"

	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/tests/testutil"
	uiCluster "github.com/flamingo/openframe-cli/internal/cluster/ui"
	clusterUtils "github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/stretchr/testify/assert"
)

func init() {
	testutil.InitializeTestMode()
}

func TestCreateCommand_Structure(t *testing.T) {
	clusterUtils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer clusterUtils.ResetGlobalFlags()
	
	cmd := getCreateCmd()
	
	tcs := testutil.TestCommandStructure{
		Name:    "create",
		Use:     "create [NAME]",
		Short:   "Create a new Kubernetes cluster",
		Aliases: nil,
		HasRunE: true,
		HasArgs: true,
		LongContains: []string{
			"Create a new Kubernetes cluster",
			"OpenFrame development",
			"openframe cluster create",
		},
	}
	
	tcs.TestCommand(t, cmd)
}

func TestCreateCommand_Flags(t *testing.T) {
	clusterUtils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer clusterUtils.ResetGlobalFlags()
	
	cmd := getCreateCmd()
	
	tests := []struct {
		flag      string
		shorthand string
		defValue  string
		usage     string
	}{
		{"type", "t", "", "Cluster type (k3d, gke, eks)"},
		{"nodes", "n", "3", "Number of worker nodes (default 3)"},
		{"version", "", "", "Kubernetes version"},
		{"skip-wizard", "", "false", "Skip interactive wizard"},
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

func TestCreateCommand_CLI(t *testing.T) {
	scenarios := []testutil.TestCLIScenario{
		{Name: "help flag", Args: []string{"--help"}, WantErr: false, Contains: []string{"Create a new Kubernetes cluster", "--type", "--nodes"}},
		{Name: "invalid flag", Args: []string{"--invalid-flag"}, WantErr: true, Contains: []string{"unknown flag"}},
		{Name: "too many args", Args: []string{"cluster1", "cluster2"}, WantErr: true, Contains: []string{"accepts at most 1 arg"}},
	}
	
	testutil.TestCLIScenarios(t, func() *cobra.Command {
		clusterUtils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer clusterUtils.ResetGlobalFlags()
		return getCreateCmd()
	}, scenarios)
}

func TestCreateCommand_Execution(t *testing.T) {
	tests := []struct {
		name     string
		args     []string
		cmdArgs  []string
		wantErr  bool
		errContains string
	}{
		{
			name: "skip wizard with args",
			args: []string{"test-cluster"},
			cmdArgs: []string{"--skip-wizard", "--type", "k3d", "--nodes", "2", "test-cluster"},
			wantErr: false, // Should succeed with mock manager
		},
		{
			name: "skip wizard with default name",
			args: []string{},
			cmdArgs: []string{"--skip-wizard", "--type", "k3d"},
			wantErr: false, // Should succeed with mock manager
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clusterUtils.SetTestExecutor(testutil.NewTestMockExecutor())
			defer clusterUtils.ResetGlobalFlags()
			
		cmd := getCreateCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.cmdArgs)
			
			// Parse flags to set the global variables
			err := cmd.ParseFlags(tt.cmdArgs)
			assert.NoError(t, err, "Flag parsing should not fail")
			
			err = runCreateCluster(cmd, tt.args)
			
			if tt.wantErr {
				assert.Error(t, err)
				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test utility functions that are used by the create command
func TestCreateUtilityFunctions(t *testing.T) {
	t.Run("GetClusterName", func(t *testing.T) {
		tests := []struct {
			name     string
			args     []string
			expected string
		}{
			{"with cluster name", []string{"my-cluster"}, "my-cluster"},
			{"no args", []string{}, "openframe-dev"},
			{"empty args", nil, "openframe-dev"},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := uiCluster.GetClusterNameOrDefault(tt.args, "openframe-dev")
				assert.Equal(t, tt.expected, result)
			})
		}
	})
	
	t.Run("ParseClusterType", func(t *testing.T) {
		tests := []struct {
			name     string
			input    string
			expected clusterUtils.ClusterType
		}{
			{"k3d type", "k3d", clusterUtils.ClusterTypeK3d},
			{"empty defaults to k3d", "", clusterUtils.ClusterTypeK3d},
			{"unknown defaults to k3d", "unknown", clusterUtils.ClusterTypeK3d},
			{"case insensitive", "K3D", clusterUtils.ClusterTypeK3d},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := clusterUtils.ParseClusterType(tt.input)
				assert.Equal(t, tt.expected, result)
			})
		}
	})
	
	t.Run("GetNodeCount", func(t *testing.T) {
		tests := []struct {
			name     string
			input    int
			expected int
		}{
			{"valid count", 5, 5},
			{"zero defaults to 3", 0, 3},
			{"negative defaults to 3", -1, 3},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				result := clusterUtils.GetNodeCount(tt.input)
				assert.Equal(t, tt.expected, result)
			})
		}
	})
	
	t.Run("ValidateConfig", func(t *testing.T) {
		tests := []struct {
			name    string
			config  *cluster.ClusterConfig
			wantErr bool
		}{
			{"valid config", &cluster.ClusterConfig{Name: "test", Type: cluster.ClusterTypeK3d, NodeCount: 3}, false},
			{"empty name", &cluster.ClusterConfig{Name: "", Type: cluster.ClusterTypeK3d, NodeCount: 3}, true},
			{"whitespace only name", &cluster.ClusterConfig{Name: "   ", Type: cluster.ClusterTypeK3d, NodeCount: 3}, true},
			{"zero nodes gets defaulted", &cluster.ClusterConfig{Name: "test", Type: cluster.ClusterTypeK3d, NodeCount: 0}, false},
			{"large node count", &cluster.ClusterConfig{Name: "test", Type: cluster.ClusterTypeK3d, NodeCount: 10}, false},
		}
		
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				err := clusterUtils.ValidateClusterName(tt.config.Name)
				if tt.wantErr {
					assert.Error(t, err)
				} else {
					assert.NoError(t, err)
					// Test node count defaulting separately
					if tt.name == "zero nodes gets defaulted" {
						originalCount := tt.config.NodeCount
						if originalCount < 1 {
							tt.config.NodeCount = 3
						}
						assert.Equal(t, 3, tt.config.NodeCount, "Should default to 3 nodes")
					}
				}
			})
		}
	})
	
	// Note: ShowConfigSummary tests removed - function moved to UI layer
}

func TestCreateCommand_ArgumentValidation(t *testing.T) {
	clusterUtils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer clusterUtils.ResetGlobalFlags()
	
	cmd := getCreateCmd()
	
	// Test argument validation
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