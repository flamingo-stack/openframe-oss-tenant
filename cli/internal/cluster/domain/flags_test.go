package domain

import (
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestGlobalFlags(t *testing.T) {
	t.Run("creates global flags with default values", func(t *testing.T) {
		flags := &GlobalFlags{}
		
		assert.False(t, flags.Verbose)
		assert.False(t, flags.DryRun)
		assert.False(t, flags.Force)
	})
	
	t.Run("creates global flags with set values", func(t *testing.T) {
		flags := &GlobalFlags{
			Verbose: true,
			DryRun:  true,
			Force:   true,
		}
		
		assert.True(t, flags.Verbose)
		assert.True(t, flags.DryRun)
		assert.True(t, flags.Force)
	})
}

func TestCreateFlags(t *testing.T) {
	t.Run("creates create flags with default values", func(t *testing.T) {
		flags := &CreateFlags{}
		
		assert.Empty(t, flags.ClusterType)
		assert.Equal(t, 0, flags.NodeCount)
		assert.Empty(t, flags.K8sVersion)
		assert.False(t, flags.SkipWizard)
		assert.False(t, flags.GlobalFlags.Verbose)
	})
	
	t.Run("creates create flags with set values", func(t *testing.T) {
		flags := &CreateFlags{
			ClusterType: "k3d",
			NodeCount:   5,
			K8sVersion:  "v1.25.0-k3s1",
			SkipWizard:  true,
		}
		
		assert.Equal(t, "k3d", flags.ClusterType)
		assert.Equal(t, 5, flags.NodeCount)
		assert.Equal(t, "v1.25.0-k3s1", flags.K8sVersion)
		assert.True(t, flags.SkipWizard)
	})
	
	t.Run("inherits global flags", func(t *testing.T) {
		globalFlags := GlobalFlags{Verbose: true, DryRun: true}
		flags := &CreateFlags{
			GlobalFlags: globalFlags,
			ClusterType: "k3d",
		}
		
		assert.True(t, flags.GlobalFlags.Verbose)
		assert.True(t, flags.GlobalFlags.DryRun)
		assert.Equal(t, "k3d", flags.ClusterType)
	})
}

func TestListFlags(t *testing.T) {
	t.Run("creates list flags with default values", func(t *testing.T) {
		flags := &ListFlags{}
		
		assert.False(t, flags.Quiet)
		assert.False(t, flags.GlobalFlags.Verbose)
	})
	
	t.Run("creates list flags with set values", func(t *testing.T) {
		flags := &ListFlags{
			Quiet: true,
		}
		
		assert.True(t, flags.Quiet)
	})
}

func TestStatusFlags(t *testing.T) {
	t.Run("creates status flags with default values", func(t *testing.T) {
		flags := &StatusFlags{}
		
		assert.False(t, flags.Detailed)
		assert.False(t, flags.NoApps)
		assert.False(t, flags.GlobalFlags.Verbose)
	})
	
	t.Run("creates status flags with set values", func(t *testing.T) {
		flags := &StatusFlags{
			Detailed: true,
			NoApps:   true,
		}
		
		assert.True(t, flags.Detailed)
		assert.True(t, flags.NoApps)
	})
}

func TestDeleteFlags(t *testing.T) {
	t.Run("creates delete flags with default values", func(t *testing.T) {
		flags := &DeleteFlags{}
		
		assert.False(t, flags.GlobalFlags.Force)
		assert.False(t, flags.GlobalFlags.Verbose)
	})
	
	t.Run("inherits global flags", func(t *testing.T) {
		globalFlags := GlobalFlags{Force: true}
		flags := &DeleteFlags{
			GlobalFlags: globalFlags,
		}
		
		assert.True(t, flags.GlobalFlags.Force)
	})
}

func TestStartFlags(t *testing.T) {
	t.Run("creates start flags with default values", func(t *testing.T) {
		flags := &StartFlags{}
		
		assert.False(t, flags.GlobalFlags.Verbose)
	})
}

func TestCleanupFlags(t *testing.T) {
	t.Run("creates cleanup flags with default values", func(t *testing.T) {
		flags := &CleanupFlags{}
		
		assert.False(t, flags.GlobalFlags.Verbose)
	})
}



func TestAddGlobalFlags(t *testing.T) {
	t.Run("adds global flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &GlobalFlags{}
		
		AddGlobalFlags(cmd, flags)
		
		// Verify flags were added
		verboseFlag := cmd.PersistentFlags().Lookup("verbose")
		assert.NotNil(t, verboseFlag)
		assert.Equal(t, "v", verboseFlag.Shorthand)
		assert.Equal(t, "false", verboseFlag.DefValue)
		
		dryRunFlag := cmd.PersistentFlags().Lookup("dry-run")
		assert.NotNil(t, dryRunFlag)
		assert.Equal(t, "false", dryRunFlag.DefValue)
	})
}

func TestAddCreateFlags(t *testing.T) {
	t.Run("adds create flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &CreateFlags{}
		
		AddCreateFlags(cmd, flags)
		
		// Verify flags were added
		typeFlag := cmd.Flags().Lookup("type")
		assert.NotNil(t, typeFlag)
		assert.Equal(t, "t", typeFlag.Shorthand)
		assert.Equal(t, "", typeFlag.DefValue)
		
		nodesFlag := cmd.Flags().Lookup("nodes")
		assert.NotNil(t, nodesFlag)
		assert.Equal(t, "n", nodesFlag.Shorthand)
		assert.Equal(t, "3", nodesFlag.DefValue)
		
		versionFlag := cmd.Flags().Lookup("version")
		assert.NotNil(t, versionFlag)
		assert.Equal(t, "", versionFlag.DefValue)
		
		wizardFlag := cmd.Flags().Lookup("skip-wizard")
		assert.NotNil(t, wizardFlag)
		assert.Equal(t, "false", wizardFlag.DefValue)
	})
}

func TestAddListFlags(t *testing.T) {
	t.Run("adds list flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &ListFlags{}
		
		AddListFlags(cmd, flags)
		
		// Verify flags were added
		quietFlag := cmd.Flags().Lookup("quiet")
		assert.NotNil(t, quietFlag)
		assert.Equal(t, "q", quietFlag.Shorthand)
		assert.Equal(t, "false", quietFlag.DefValue)
	})
}

func TestAddStatusFlags(t *testing.T) {
	t.Run("adds status flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &StatusFlags{}
		
		AddStatusFlags(cmd, flags)
		
		// Verify flags were added
		detailedFlag := cmd.Flags().Lookup("detailed")
		assert.NotNil(t, detailedFlag)
		assert.Equal(t, "d", detailedFlag.Shorthand)
		assert.Equal(t, "false", detailedFlag.DefValue)
		
		noAppsFlag := cmd.Flags().Lookup("no-apps")
		assert.NotNil(t, noAppsFlag)
		assert.Equal(t, "false", noAppsFlag.DefValue)
	})
}

func TestAddDeleteFlags(t *testing.T) {
	t.Run("adds delete flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &DeleteFlags{}
		
		AddDeleteFlags(cmd, flags)
		
		// Verify flags were added
		forceFlag := cmd.Flags().Lookup("force")
		assert.NotNil(t, forceFlag)
		assert.Equal(t, "f", forceFlag.Shorthand)
		assert.Equal(t, "false", forceFlag.DefValue)
	})
}

func TestAddStartFlags(t *testing.T) {
	t.Run("adds start flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &StartFlags{}
		
		// Should not panic even though start has no specific flags
		assert.NotPanics(t, func() {
			AddStartFlags(cmd, flags)
		})
	})
}

func TestAddCleanupFlags(t *testing.T) {
	t.Run("adds cleanup flags to command", func(t *testing.T) {
		cmd := &cobra.Command{}
		flags := &CleanupFlags{}
		
		// Should not panic even though cleanup has no specific flags
		assert.NotPanics(t, func() {
			AddCleanupFlags(cmd, flags)
		})
	})
}

func TestFlagValidation(t *testing.T) {
	t.Run("validates global flags", func(t *testing.T) {
		flags := &GlobalFlags{
			Verbose: true,
			DryRun:  false,
			Force:   true,
		}
		
		err := ValidateGlobalFlags(flags)
		assert.NoError(t, err)
	})
	
	t.Run("validates create flags", func(t *testing.T) {
		flags := &CreateFlags{
			ClusterType: "k3d",
			NodeCount:   3,
			K8sVersion:  "v1.25.0-k3s1",
			SkipWizard:  false,
		}
		
		err := ValidateCreateFlags(flags)
		assert.NoError(t, err)
		assert.Equal(t, 3, flags.NodeCount) // Should remain unchanged
	})
	
	t.Run("validates create flags with zero node count", func(t *testing.T) {
		flags := &CreateFlags{
			ClusterType: "k3d",
			NodeCount:   0, // Should be defaulted to 3
			K8sVersion:  "v1.25.0-k3s1",
		}
		
		err := ValidateCreateFlags(flags)
		assert.NoError(t, err)
		assert.Equal(t, 3, flags.NodeCount) // Should be defaulted to 3
	})
	
	t.Run("validates create flags with negative node count", func(t *testing.T) {
		flags := &CreateFlags{
			ClusterType: "k3d",
			NodeCount:   -1, // Should be defaulted to 3
		}
		
		err := ValidateCreateFlags(flags)
		assert.NoError(t, err)
		assert.Equal(t, 3, flags.NodeCount) // Should be defaulted to 3
	})
	
	t.Run("validates list flags", func(t *testing.T) {
		flags := &ListFlags{Quiet: true}
		
		err := ValidateListFlags(flags)
		assert.NoError(t, err)
	})
	
	t.Run("validates status flags", func(t *testing.T) {
		flags := &StatusFlags{Detailed: true, NoApps: false}
		
		err := ValidateStatusFlags(flags)
		assert.NoError(t, err)
	})
	
	t.Run("validates delete flags", func(t *testing.T) {
		flags := &DeleteFlags{}
		flags.GlobalFlags.Force = true
		
		err := ValidateDeleteFlags(flags)
		assert.NoError(t, err)
	})
	
	t.Run("validates start flags", func(t *testing.T) {
		flags := &StartFlags{}
		
		err := ValidateStartFlags(flags)
		assert.NoError(t, err)
	})
	
	t.Run("validates cleanup flags", func(t *testing.T) {
		flags := &CleanupFlags{}
		
		err := ValidateCleanupFlags(flags)
		assert.NoError(t, err)
	})
}