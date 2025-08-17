package cluster

import (
	"github.com/flamingo/openframe-cli/internal/cluster/utils"
	"bytes"
	"strings"
	"testing"

	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func init() {
	testutil.InitializeTestMode()
}

func TestDeleteCommand_Structure(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getDeleteCmd()

	tcs := testutil.TestCommandStructure{
		Name:    "delete",
		Use:     "delete [NAME]",
		Short:   "Delete a Kubernetes cluster",
		Aliases: nil,
		HasRunE: true,
		HasArgs: true,
		LongContains: []string{
			"Delete a Kubernetes cluster and clean up all associated resources",
			"openframe cluster delete",
			"interactive selection",
		},
	}

	tcs.TestCommand(t, cmd)
}

func TestDeleteCommand_Flags(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getDeleteCmd()

	tests := []struct {
		flag      string
		shorthand string
		defValue  string
		usage     string
	}{
		{"force", "f", "false", "Skip confirmation prompt"},
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

func TestDeleteCommand_CLI(t *testing.T) {
	scenarios := []testutil.TestCLIScenario{
		{Name: "help flag", Args: []string{"--help"}, WantErr: false, Contains: []string{"Delete a Kubernetes cluster", "--force", "-f"}},
		{Name: "invalid flag", Args: []string{"--invalid-flag"}, WantErr: true, Contains: []string{"unknown flag"}},
		{Name: "too many args", Args: []string{"cluster1", "cluster2"}, WantErr: true, Contains: []string{"accepts at most 1 arg"}},
	}

	testutil.TestCLIScenarios(t, func() *cobra.Command {
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer utils.ResetGlobalFlags()
		return getDeleteCmd()
	}, scenarios)
}

func TestDeleteCommand_Execution(t *testing.T) {
	tests := []struct {
		name       string
		args       []string
		setupFlags func()
		wantErr    bool
	}{
		{
			name: "with cluster name and force",
			args: []string{"test-cluster"},
			setupFlags: func() {
				// Force flag will be set via command args
			},
			wantErr: false, // Should handle gracefully when cluster not found
		},
		{
			name: "no args triggers interactive selection",
			args: []string{},
			setupFlags: func() {
				// No special setup needed
			},
			wantErr: false, // Should complete gracefully when no clusters found
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.setupFlags()

			utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getDeleteCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)

			err := runDeleteCluster(cmd, tt.args)

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				// Should either succeed or return expected error
				if err != nil {
					// The delete command can fail in various ways when cluster doesn't exist
					assert.True(t,
						strings.Contains(err.Error(), "cluster not found") ||
							strings.Contains(err.Error(), "failed to detect cluster type") ||
							strings.Contains(err.Error(), "provider not found") ||
							strings.Contains(err.Error(), "failed to list clusters") ||
							strings.Contains(err.Error(), "^D") || // Interactive prompt interrupted
							strings.Contains(err.Error(), "EOF"),
						"Expected known error type, got: %v", err)
				}
			}
		})
	}
}

func TestDeleteCommand_FlagValues(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		wantForce bool
	}{
		{"force flag long form", []string{"--force", "test-cluster"}, true},
		{"force flag short form", []string{"-f", "test-cluster"}, true},
		{"no force flag", []string{"test-cluster"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			utils.SetTestExecutor(testutil.NewTestMockExecutor())
		defer utils.ResetGlobalFlags()

		cmd := getDeleteCmd()
			cmd.SetArgs(tt.args)
			cmd.ParseFlags(tt.args)

			assert.Equal(t, tt.wantForce, utils.GetGlobalFlags().Delete.Force)
		})
	}
}

func TestDeleteCommand_ArgumentValidation(t *testing.T) {
	utils.SetTestExecutor(testutil.NewTestMockExecutor())
	defer utils.ResetGlobalFlags()
	
	cmd := getDeleteCmd()

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
