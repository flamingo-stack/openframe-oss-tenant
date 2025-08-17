package cluster

import (
	"github.com/flamingo/openframe-cli/internal/cluster/utils"
	"strings"
	"testing"
	"time"

	"github.com/spf13/cobra"
	uiCluster "github.com/flamingo/openframe-cli/internal/cluster/ui"
	"github.com/stretchr/testify/assert"
	"github.com/flamingo/openframe-cli/tests/testutil"
)

func init() {
	testutil.InitializeTestMode()
}
func TestListCommand_Structure(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getListCmd()
	
	tcs := testutil.TestCommandStructure{
		Name:    "list",
		Use:     "list",
		Short:   "List all Kubernetes clusters",
		Aliases: nil,
		HasRunE: true,
		HasArgs: false, // List command doesn't validate args
		LongContains: []string{
			"List all Kubernetes clusters managed by OpenFrame CLI",
			"openframe cluster list",
			"--quiet",
		},
	}
	
	tcs.TestCommand(t, cmd)
}

func TestListCommand_Flags(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getListCmd()
	
	tests := []struct {
		flag      string
		shorthand string
		defValue  string
		usage     string
	}{
		{"quiet", "q", "false", "Only show cluster names"},
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

func TestListCommand_CLI(t *testing.T) {
	scenarios := []testutil.TestCLIScenario{
		{Name: "help flag", Args: []string{"--help"}, WantErr: false, Contains: []string{"List all Kubernetes clusters", "--quiet", "-q"}},
		{Name: "invalid flag", Args: []string{"--invalid-flag"}, WantErr: true, Contains: []string{"unknown flag"}},
		{Name: "with args", Args: []string{"extra-arg"}, WantErr: true, Contains: []string{"failed to list clusters"}}, // List command fails without k3d in test environment
	}
	
	testutil.TestCLIScenarios(t, func() *cobra.Command {
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer utils.ResetGlobalFlags()
		return getListCmd()
	}, scenarios)
}

func TestListCommand_Execution(t *testing.T) {
	tests := []struct {
		name string
		args []string
	}{
		{"no arguments", []string{}},
		{"with extra args", []string{"extra-arg"}},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// No setup needed
			
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getListCmd()
			err := runListClusters(cmd, tt.args)
			
			// Should complete gracefully when no clusters found or return expected error
			if err != nil {
				assert.True(t, 
					strings.Contains(err.Error(), "failed to list clusters") ||
					strings.Contains(err.Error(), "failed to parse cluster list JSON"),
					"Expected cluster-related error, got: %v", err)
			}
		})
	}
}

func TestListCommand_FlagValues(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		wantQuiet bool
	}{
		{"quiet flag long form", []string{"--quiet"}, true},
		{"quiet flag short form", []string{"-q"}, true},
		{"no quiet flag", []string{}, false},
		{"quiet=true", []string{"--quiet=true"}, true},
		{"quiet=false", []string{"--quiet=false"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getListCmd()
			cmd.SetArgs(tt.args)
			cmd.ParseFlags(tt.args)
			
			quiet, _ := cmd.Flags().GetBool("quiet")
			assert.Equal(t, tt.wantQuiet, quiet)
		})
	}
}

// Test utility functions that are used by the list command
func TestListUtilityFunctions(t *testing.T) {
	t.Run("FormatAge", func(t *testing.T) {
		now := time.Now()
		tests := []struct {
			name     string
			duration time.Duration
			expected string
		}{
			{"30 seconds", 30 * time.Second, "30s"},
			{"5 minutes", 5 * time.Minute, "5m"},
			{"2 hours", 2 * time.Hour, "2h"},
			{"3 days", 3 * 24 * time.Hour, "3d"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				createdAt := now.Add(-tt.duration)
				result := uiCluster.FormatAge(createdAt)
				assert.Equal(t, tt.expected, result)
			})
		}
	})
}

