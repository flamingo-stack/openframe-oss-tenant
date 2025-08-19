package models

import (
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestAddGlobalFlags(t *testing.T) {
	cmd := &cobra.Command{
		Use: "test",
	}
	
	globalFlags := &GlobalFlags{}
	
	AddGlobalFlags(cmd, globalFlags)
	
	// Check that common flags were added as persistent flags
	assert.NotNil(t, cmd.PersistentFlags().Lookup("verbose"))
	assert.NotNil(t, cmd.PersistentFlags().Lookup("dry-run"))
	assert.NotNil(t, cmd.PersistentFlags().Lookup("force"))
}

func TestAddInstallFlags(t *testing.T) {
	cmd := &cobra.Command{
		Use: "install",
	}
	
	installFlags := &InstallFlags{}
	
	AddInstallFlags(cmd, installFlags)
	
	// Check that install-specific flags were added
	forceFlag := cmd.Flags().Lookup("force")
	assert.NotNil(t, forceFlag)
	assert.Equal(t, "f", forceFlag.Shorthand)
	assert.Equal(t, "Force installation even if charts already exist", forceFlag.Usage)
	
	dryRunFlag := cmd.Flags().Lookup("dry-run")
	assert.NotNil(t, dryRunFlag)
	assert.Equal(t, "Show what would be installed without executing", dryRunFlag.Usage)
}

func TestInstallFlags_Structure(t *testing.T) {
	flags := &InstallFlags{
		Force:  true,
		DryRun: false,
	}
	
	assert.True(t, flags.Force)
	assert.False(t, flags.DryRun)
}

func TestInstallFlags_Default(t *testing.T) {
	flags := &InstallFlags{}
	
	// Test default values
	assert.False(t, flags.Force)
	assert.False(t, flags.DryRun)
}

func TestInstallFlags_WithGlobalFlags(t *testing.T) {
	flags := &InstallFlags{
		GlobalFlags: GlobalFlags{
			Verbose: true,
		},
		Force:  true,
		DryRun: false,
	}
	
	assert.True(t, flags.Verbose)
	assert.True(t, flags.Force)
	assert.False(t, flags.DryRun)
}