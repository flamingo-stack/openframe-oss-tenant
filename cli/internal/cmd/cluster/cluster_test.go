package cluster

import (
	"bytes"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetClusterCmd(t *testing.T) {
	cmd := GetClusterCmd()

	// Test basic command properties
	assert.Equal(t, "cluster", cmd.Use)
	assert.Equal(t, []string{"k"}, cmd.Aliases)
	assert.Equal(t, "Manage Kubernetes clusters", cmd.Short)
	assert.Contains(t, cmd.Long, "Cluster Management")
	assert.Contains(t, cmd.Long, "Create, manage, and clean up Kubernetes clusters")
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

func TestClusterCommand_HelpOutput(t *testing.T) {
	cmd := GetClusterCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)

	// Trigger help by running the command with no args
	cmd.SetArgs([]string{})
	err := cmd.Execute()

	// Should not return an error (help is displayed)
	assert.NoError(t, err)

	output := out.String()
	
	// Check help content
	assert.Contains(t, output, "Manage Kubernetes clusters")
	assert.Contains(t, output, "Available Commands:")
	assert.Contains(t, output, "create")
	assert.Contains(t, output, "delete")
	assert.Contains(t, output, "list")
	assert.Contains(t, output, "status")
	assert.Contains(t, output, "start")
	assert.Contains(t, output, "cleanup")
}

func TestClusterCommand_ExplicitHelp(t *testing.T) {
	cmd := GetClusterCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)

	// Trigger explicit help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()

	// Should not return an error
	assert.NoError(t, err)

	output := out.String()
	assert.Contains(t, output, "Cluster Management")
	assert.Contains(t, output, "Examples:")
	assert.Contains(t, output, "openframe cluster create")
	assert.Contains(t, output, "openframe cluster delete")
}

func TestClusterCommand_GlobalFlags(t *testing.T) {
	cmd := GetClusterCmd()

	// Test that verbose flag exists
	verboseFlag := cmd.PersistentFlags().Lookup("verbose")
	assert.NotNil(t, verboseFlag)
	assert.Equal(t, "false", verboseFlag.DefValue)
	assert.Equal(t, "Verbose output", verboseFlag.Usage)
}

func TestClusterCommand_Examples(t *testing.T) {
	cmd := GetClusterCmd()

	// Verify examples are documented in long description
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "openframe cluster create")
	assert.Contains(t, longDesc, "openframe cluster delete")
	assert.Contains(t, longDesc, "openframe cluster start")
	assert.Contains(t, longDesc, "./run.sh k")
	assert.Contains(t, longDesc, "./run.sh d")
	assert.Contains(t, longDesc, "./run.sh s")
}

func TestClusterCommand_SupportedTypes(t *testing.T) {
	cmd := GetClusterCmd()

	// Verify supported cluster types are documented
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "K3d")
	assert.Contains(t, longDesc, "GKE")
	assert.Contains(t, longDesc, "recommended for local development")
}

func TestClusterCommand_InvalidSubcommand(t *testing.T) {
	cmd := GetClusterCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)

	// Test invalid subcommand
	cmd.SetArgs([]string{"invalid-subcommand"})
	err := cmd.Execute()

	// Should return an error
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown command")
}

func TestClusterCommand_Aliases(t *testing.T) {
	cmd := GetClusterCmd()

	// Test command aliases
	expectedAliases := []string{"k"}
	assert.Equal(t, expectedAliases, cmd.Aliases)
}

func TestResetGlobalFlags(t *testing.T) {
	// Set some values
	clusterName = "test"
	clusterType = "k3d"
	nodeCount = 5
	k8sVersion = "v1.28.0"
	skipWizard = true
	verbose = true
	dryRun = true
	force = true

	// Reset flags
	ResetGlobalFlags()

	// Verify all flags are reset
	assert.Equal(t, "", clusterName)
	assert.Equal(t, "", clusterType)
	assert.Equal(t, 0, nodeCount)
	assert.Equal(t, "", k8sVersion)
	assert.False(t, skipWizard)
	assert.False(t, verbose)
	assert.False(t, dryRun)
	assert.False(t, force)
}

func TestSetVerboseForTesting(t *testing.T) {
	// Reset first
	ResetGlobalFlags()
	assert.False(t, verbose)

	// Set verbose to true
	SetVerboseForTesting(true)
	assert.True(t, verbose)

	// Set verbose to false
	SetVerboseForTesting(false)
	assert.False(t, verbose)
}

func TestClusterCommand_RunFunction(t *testing.T) {
	cmd := GetClusterCmd()
	
	// Test that Run function exists
	assert.NotNil(t, cmd.Run)
	
	// Test that it shows help when called
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Call the run function directly
	cmd.Run(cmd, []string{})
	
	output := out.String()
	// Should show help output (contains usage information)
	assert.True(t, strings.Contains(output, "Usage:") || strings.Contains(output, "Available Commands:"))
}

func TestClusterCommand_LongDescription(t *testing.T) {
	cmd := GetClusterCmd()
	
	// Verify comprehensive description content
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "lifecycle management")
	assert.Contains(t, longDesc, "shell script cluster operations")
	assert.Contains(t, longDesc, "interactive configuration")
	assert.Contains(t, longDesc, "Remove unused images and resources")
	assert.Contains(t, longDesc, "Lightweight Kubernetes in Docker")
}

// Test command structure consistency
func TestClusterCommand_StructureConsistency(t *testing.T) {
	cmd := GetClusterCmd()
	
	// Should have Run function
	assert.NotNil(t, cmd.Run)
	
	// Should have description
	assert.NotEmpty(t, cmd.Short)
	assert.NotEmpty(t, cmd.Long)
	
	// Should have proper command name
	assert.Equal(t, "cluster", cmd.Use)
	
	// Should have aliases
	assert.NotEmpty(t, cmd.Aliases)
	assert.Contains(t, cmd.Aliases, "k")
	
	// Should have subcommands
	assert.True(t, len(cmd.Commands()) > 0)
}

// Benchmark for command creation
func BenchmarkGetClusterCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = GetClusterCmd()
	}
}

// Test that global flags are properly inherited by subcommands
func TestClusterCommand_FlagInheritance(t *testing.T) {
	cmd := GetClusterCmd()
	
	// Get a subcommand to test flag inheritance
	createCmd := cmd.Commands()[0] // Should be create command
	
	// Test that persistent flags are available to subcommands
	verboseFlag := createCmd.Flags().Lookup("verbose")
	if verboseFlag == nil {
		// Try inherited flags
		verboseFlag = createCmd.InheritedFlags().Lookup("verbose")
	}
	assert.NotNil(t, verboseFlag, "Verbose flag should be available to subcommands")
}