package cluster

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/flamingo/openframe-cli/tests/testutil"
	"github.com/flamingo/openframe-cli/internal/ui/common"
)

func init() {
	common.TestMode = true
}
func TestStartCommand_Structure(t *testing.T) {
	cmd := getStartCmd()
	
	tcs := testutil.TestCommandStructure{
		Name:    "start",
		Use:     "start [NAME]",
		Short:   "Start a stopped Kubernetes cluster",
		Aliases: nil,
		HasRunE: true,
		HasArgs: true,
		LongContains: []string{
			"Start a previously stopped Kubernetes cluster",
			"openframe cluster start",
			"interactive selection",
		},
	}
	
	tcs.TestCommand(t, cmd)
}

func TestStartCommand_CLI(t *testing.T) {
	scenarios := []testutil.TestCLIScenario{
		{Name: "help flag", Args: []string{"--help"}, WantErr: false, Contains: []string{"Start a previously stopped Kubernetes cluster", "interactive selection"}},
		{Name: "invalid flag", Args: []string{"--invalid-flag"}, WantErr: true, Contains: []string{"unknown flag"}},
		{Name: "too many args", Args: []string{"cluster1", "cluster2"}, WantErr: true, Contains: []string{"accepts at most 1 arg"}},
	}
	
	testutil.TestCLIScenarios(t, getStartCmd, scenarios)
}

func TestStartCommand_Execution(t *testing.T) {
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
			ResetTestState()
			
			cmd := getStartCmd()
			err := runStartCluster(cmd, tt.args)
			
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
						strings.Contains(err.Error(), "failed to start cluster") ||
						strings.Contains(err.Error(), "cluster not found"),
						"Expected cluster-related error, got: %v", err)
				}
			}
		})
	}
}

func TestStartCommand_ArgumentValidation(t *testing.T) {
	cmd := getStartCmd()
	
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