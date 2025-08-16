package cluster

import (
	"bytes"
	"testing"

	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/stretchr/testify/assert"
)

func init() {
	// Suppress logo output during tests
	common.TestMode = true
}

func TestClusterCommand_Structure(t *testing.T) {
	cmd := GetClusterCmd()

	// Test command properties
	assert.Equal(t, "cluster", cmd.Use)
	assert.Equal(t, []string{"k"}, cmd.Aliases)
	assert.Equal(t, "Manage Kubernetes clusters", cmd.Short)
	assert.Contains(t, cmd.Long, "Cluster Management")
	assert.Contains(t, cmd.Long, "Create, manage, and clean up Kubernetes clusters")
	
	// Test command structure
	assert.NotEmpty(t, cmd.Short)
	assert.NotEmpty(t, cmd.Long)
	assert.True(t, len(cmd.Commands()) > 0)
	
	// Test global flags
	verboseFlag := cmd.PersistentFlags().Lookup("verbose")
	assert.NotNil(t, verboseFlag)
	assert.Equal(t, "false", verboseFlag.DefValue)
	assert.Equal(t, "Enable verbose output", verboseFlag.Usage)
}

func TestClusterCommand_Subcommands(t *testing.T) {
	cmd := GetClusterCmd()

	// Check that all expected subcommands are present
	expectedSubcommands := []string{
		"create",
		"delete", 
		"list",
		"status",
		"start",
		"cleanup",
	}

	for _, expectedCmd := range expectedSubcommands {
		found := false
		for _, subCmd := range cmd.Commands() {
			if subCmd.Name() == expectedCmd {
				found = true
				break
			}
		}
		assert.True(t, found, "Expected subcommand %s not found", expectedCmd)
	}
}

func TestClusterCommand_CLI(t *testing.T) {
	tests := []struct {
		name string
		args []string
		wantErr bool
		contains []string
	}{
		{"no args shows help", []string{}, false, []string{"Cluster Management", "Available Commands:", "create", "delete", "list", "status", "start", "cleanup"}},
		{"explicit help", []string{"--help"}, false, []string{"Cluster Management", "Examples:", "openframe cluster create", "openframe cluster delete"}},
		{"invalid subcommand", []string{"invalid-subcommand"}, true, []string{"unknown command"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := GetClusterCmd()
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

func TestClusterCommand_Content(t *testing.T) {
	cmd := GetClusterCmd()
	longDesc := cmd.Long

	// Verify content and examples in description
	assert.Contains(t, longDesc, "openframe cluster create")
	assert.Contains(t, longDesc, "openframe cluster delete")
	assert.Contains(t, longDesc, "openframe cluster start")
	assert.Contains(t, longDesc, "K3d")
	assert.Contains(t, longDesc, "lifecycle management")
	assert.Contains(t, longDesc, "interactive configuration")
}

func TestResetGlobalFlags(t *testing.T) {
	// Set some values
	createFlags.ClusterType = "k3d"
	createFlags.NodeCount = 5
	createFlags.K8sVersion = "v1.28.0"
	createFlags.SkipWizard = true
	globalFlags.Verbose = true
	globalFlags.DryRun = true
	globalFlags.Force = true

	// Reset flags
	ResetGlobalFlags()

	// Verify all flags are reset
	assert.Equal(t, "", createFlags.ClusterType)
	assert.Equal(t, 0, createFlags.NodeCount)
	assert.Equal(t, "", createFlags.K8sVersion)
	assert.False(t, createFlags.SkipWizard)
	assert.False(t, globalFlags.Verbose)
	assert.False(t, globalFlags.DryRun)
	assert.False(t, globalFlags.Force)
}

func TestSetVerboseForTesting(t *testing.T) {
	// Reset first
	ResetGlobalFlags()
	assert.False(t, globalFlags.Verbose)

	// Set verbose to true
	SetVerboseForTesting(true)
	assert.True(t, globalFlags.Verbose)

	// Set verbose to false
	SetVerboseForTesting(false)
	assert.False(t, globalFlags.Verbose)
}


func TestClusterCommand_FlagInheritance(t *testing.T) {
	cmd := GetClusterCmd()
	
	// Test that persistent flags are inherited by subcommands
	createCmd := cmd.Commands()[0] // Should be create command
	verboseFlag := createCmd.InheritedFlags().Lookup("verbose")
	assert.NotNil(t, verboseFlag, "Verbose flag should be available to subcommands")
}