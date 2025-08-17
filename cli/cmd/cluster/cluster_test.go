package cluster

import (
	"bytes"
	"testing"

	"github.com/flamingo/openframe-cli/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func init() {
	// Suppress logo output during tests
	testutil.InitializeTestMode()
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

func TestFlagContainerReset(t *testing.T) {
	// Create flag container and set some values
	flags := testutil.CreateTestFlagContainer()
	flags.Create.ClusterType = "k3d"
	flags.Create.NodeCount = 5
	flags.Create.K8sVersion = "v1.28.0"
	flags.Create.SkipWizard = true
	flags.Global.Verbose = true
	flags.Global.DryRun = true
	flags.Global.Force = true

	// Reset flags
	flags.Reset()

	// Verify all flags are reset
	assert.Equal(t, "", flags.Create.ClusterType)
	assert.Equal(t, 0, flags.Create.NodeCount)
	assert.Equal(t, "", flags.Create.K8sVersion)
	assert.False(t, flags.Create.SkipWizard)
	assert.False(t, flags.Global.Verbose)
	assert.False(t, flags.Global.DryRun)
	assert.False(t, flags.Global.Force)
}

func TestSetVerboseForTesting(t *testing.T) {
	// Create flag container
	flags := testutil.CreateTestFlagContainer()
	assert.False(t, flags.Global.Verbose)

	// Set verbose to true
	testutil.SetVerboseMode(flags, true)
	assert.True(t, flags.Global.Verbose)

	// Set verbose to false
	testutil.SetVerboseMode(flags, false)
	assert.False(t, flags.Global.Verbose)
}


func TestClusterCommand_FlagInheritance(t *testing.T) {
	cmd := GetClusterCmd()
	
	// Test that persistent flags are inherited by subcommands
	createCmd := cmd.Commands()[0] // Should be create command
	verboseFlag := createCmd.InheritedFlags().Lookup("verbose")
	assert.NotNil(t, verboseFlag, "Verbose flag should be available to subcommands")
}