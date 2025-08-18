package flags

import (
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestCommonFlags(t *testing.T) {
	t.Run("default values", func(t *testing.T) {
		flags := &CommonFlags{}
		
		assert.False(t, flags.Verbose)
		assert.False(t, flags.DryRun)
		assert.False(t, flags.Force)
	})

	t.Run("setting values", func(t *testing.T) {
		flags := &CommonFlags{
			Verbose: true,
			DryRun:  true,
			Force:   true,
		}
		
		assert.True(t, flags.Verbose)
		assert.True(t, flags.DryRun)
		assert.True(t, flags.Force)
	})
}

func TestNewFlagManager(t *testing.T) {
	globalFlags := &CommonFlags{
		Verbose: true,
		DryRun:  false,
		Force:   true,
	}
	
	manager := NewFlagManager(globalFlags)
	
	assert.NotNil(t, manager)
	assert.Equal(t, globalFlags, manager.common)
}

func TestFlagManager_AddCommonFlags(t *testing.T) {
	globalFlags := &CommonFlags{}
	manager := NewFlagManager(globalFlags)
	
	cmd := &cobra.Command{
		Use: "test",
	}
	
	// Add global flags
	manager.AddCommonFlags(cmd)
	
	// Verify flags were added
	verboseFlag := cmd.PersistentFlags().Lookup("verbose")
	assert.NotNil(t, verboseFlag)
	assert.Equal(t, "v", verboseFlag.Shorthand)
	assert.Equal(t, "false", verboseFlag.DefValue)
	assert.Contains(t, verboseFlag.Usage, "Enable verbose output")
	
	forceFlag := cmd.PersistentFlags().Lookup("force")
	assert.NotNil(t, forceFlag)
	assert.Equal(t, "f", forceFlag.Shorthand)
	assert.Equal(t, "false", forceFlag.DefValue)
	assert.Contains(t, forceFlag.Usage, "Skip confirmation prompts")
}

func TestFlagManager_AddCommonFlags_Integration(t *testing.T) {
	globalFlags := &CommonFlags{}
	manager := NewFlagManager(globalFlags)
	
	cmd := &cobra.Command{
		Use: "test",
		Run: func(cmd *cobra.Command, args []string) {
			// Test run function
		},
	}
	
	manager.AddCommonFlags(cmd)
	
	// Test setting flags via command line simulation
	cmd.SetArgs([]string{"--verbose", "--force"})
	err := cmd.Execute()
	assert.NoError(t, err)
	
	// Verify flags were set
	assert.True(t, globalFlags.Verbose)
	assert.True(t, globalFlags.Force)
	assert.False(t, globalFlags.DryRun) // Not set
}

func TestFlagManager_AddCommonFlags_ShortFlags(t *testing.T) {
	globalFlags := &CommonFlags{}
	manager := NewFlagManager(globalFlags)
	
	cmd := &cobra.Command{
		Use: "test",
		Run: func(cmd *cobra.Command, args []string) {},
	}
	
	manager.AddCommonFlags(cmd)
	
	// Test setting flags via short flags
	cmd.SetArgs([]string{"-v", "-f"})
	err := cmd.Execute()
	assert.NoError(t, err)
	
	// Verify short flags work
	assert.True(t, globalFlags.Verbose)
	assert.True(t, globalFlags.Force)
}

func TestValidateCommonFlags(t *testing.T) {
	tests := []struct {
		name    string
		flags   *CommonFlags
		wantErr bool
	}{
		{
			name: "default flags",
			flags: &CommonFlags{
				Verbose: false,
				DryRun:  false,
				Force:   false,
			},
			wantErr: false,
		},
		{
			name: "all flags enabled",
			flags: &CommonFlags{
				Verbose: true,
				DryRun:  true,
				Force:   true,
			},
			wantErr: false,
		},
		{
			name: "verbose only",
			flags: &CommonFlags{
				Verbose: true,
				DryRun:  false,
				Force:   false,
			},
			wantErr: false,
		},
		{
			name: "force only",
			flags: &CommonFlags{
				Verbose: false,
				DryRun:  false,
				Force:   true,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateCommonFlags(tt.flags)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetFlagDescription(t *testing.T) {
	tests := []struct {
		name     string
		flagName string
		expected string
	}{
		{
			name:     "verbose flag",
			flagName: "verbose",
			expected: "Enable verbose output with detailed information",
		},
		{
			name:     "dry-run flag",
			flagName: "dry-run",
			expected: "Show what would be done without actually executing",
		},
		{
			name:     "force flag",
			flagName: "force",
			expected: "Skip confirmation prompts and proceed automatically",
		},
		{
			name:     "quiet flag",
			flagName: "quiet",
			expected: "Minimize output, showing only essential information",
		},
		{
			name:     "unknown flag",
			flagName: "unknown",
			expected: "",
		},
		{
			name:     "empty flag name",
			flagName: "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetFlagDescription(tt.flagName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestFlagManager_NilCommonFlags(t *testing.T) {
	// Test that manager handles nil global flags gracefully
	manager := NewFlagManager(nil)
	assert.NotNil(t, manager)
	assert.Nil(t, manager.common)
	
	cmd := &cobra.Command{Use: "test"}
	
	// This should not panic even with nil global flags
	assert.NotPanics(t, func() {
		manager.AddCommonFlags(cmd)
	})
}

func TestFlagManager_MultipleCommands(t *testing.T) {
	globalFlags := &CommonFlags{}
	manager := NewFlagManager(globalFlags)
	
	// Create multiple commands
	cmd1 := &cobra.Command{Use: "cmd1"}
	cmd2 := &cobra.Command{Use: "cmd2"}
	
	// Add flags to both commands
	manager.AddCommonFlags(cmd1)
	manager.AddCommonFlags(cmd2)
	
	// Verify both commands have the flags
	assert.NotNil(t, cmd1.PersistentFlags().Lookup("verbose"))
	assert.NotNil(t, cmd1.PersistentFlags().Lookup("force"))
	assert.NotNil(t, cmd2.PersistentFlags().Lookup("verbose"))
	assert.NotNil(t, cmd2.PersistentFlags().Lookup("force"))
}

func TestCommonFlags_Struct(t *testing.T) {
	// Test that CommonFlags is a proper struct with expected fields
	flags := CommonFlags{
		Verbose: true,
		DryRun:  true,
		Force:   true,
	}
	
	// Verify we can access all fields
	assert.True(t, flags.Verbose)
	assert.True(t, flags.DryRun)
	assert.True(t, flags.Force)
	
	// Test pointer to struct
	flagsPtr := &CommonFlags{
		Verbose: false,
		DryRun:  true,
		Force:   false,
	}
	
	assert.False(t, flagsPtr.Verbose)
	assert.True(t, flagsPtr.DryRun)
	assert.False(t, flagsPtr.Force)
}

func TestFlagManager_Struct(t *testing.T) {
	// Test that FlagManager has the expected structure
	globalFlags := &CommonFlags{}
	manager := NewFlagManager(globalFlags)
	
	assert.Equal(t, globalFlags, manager.common)
}

func TestFlagDescriptions_Coverage(t *testing.T) {
	// Test that all expected flag descriptions are covered
	expectedFlags := []string{"verbose", "dry-run", "force", "quiet"}
	
	for _, flag := range expectedFlags {
		description := GetFlagDescription(flag)
		assert.NotEmpty(t, description, "Flag %s should have a description", flag)
		assert.Greater(t, len(description), 10, "Description for %s should be meaningful", flag)
	}
}

func TestFlagManager_EdgeCases(t *testing.T) {
	tests := []struct {
		name string
		test func(t *testing.T)
	}{
		{
			name: "dry-run flag behavior",
			test: func(t *testing.T) {
				globalFlags := &CommonFlags{}
				manager := NewFlagManager(globalFlags)
				
				cmd := &cobra.Command{
					Use: "test",
					Run: func(cmd *cobra.Command, args []string) {},
				}
				
				manager.AddCommonFlags(cmd)
				cmd.SetArgs([]string{"--dry-run"})
				err := cmd.Execute()
				
				assert.NoError(t, err)
				assert.True(t, globalFlags.DryRun)
				assert.False(t, globalFlags.Verbose) // Other flags remain false
				assert.False(t, globalFlags.Force)
			},
		},
		{
			name: "conflicting flags behavior",
			test: func(t *testing.T) {
				globalFlags := &CommonFlags{}
				manager := NewFlagManager(globalFlags)
				
				cmd := &cobra.Command{
					Use: "test",
					Run: func(cmd *cobra.Command, args []string) {},
				}
				
				manager.AddCommonFlags(cmd)
				// Test that setting contradictory flags is allowed (business logic decides conflict)
				cmd.SetArgs([]string{"--dry-run", "--force"})
				err := cmd.Execute()
				
				assert.NoError(t, err)
				assert.True(t, globalFlags.DryRun)
				assert.True(t, globalFlags.Force)
			},
		},
		{
			name: "flag reset between executions",
			test: func(t *testing.T) {
				globalFlags := &CommonFlags{}
				manager := NewFlagManager(globalFlags)
				
				cmd := &cobra.Command{
					Use: "test",
					Run: func(cmd *cobra.Command, args []string) {},
				}
				
				manager.AddCommonFlags(cmd)
				
				// First execution
				cmd.SetArgs([]string{"--verbose"})
				err := cmd.Execute()
				assert.NoError(t, err)
				assert.True(t, globalFlags.Verbose)
				
				// Reset flags manually (simulating new command execution)
				globalFlags.Verbose = false
				globalFlags.Force = false
				globalFlags.DryRun = false
				
				// Second execution with different flags
				cmd.SetArgs([]string{"--force"})
				err = cmd.Execute()
				assert.NoError(t, err)
				assert.False(t, globalFlags.Verbose) // Should remain false
				assert.True(t, globalFlags.Force)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.test)
	}
}

func TestValidateCommonFlags_EdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		flags   *CommonFlags
		wantErr bool
	}{
		{
			name:    "nil flags",
			flags:   nil,
			wantErr: false, // Current implementation doesn't validate nil
		},
		{
			name: "all combinations valid",
			flags: &CommonFlags{
				Verbose: true,
				DryRun:  true,
				Force:   true,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateCommonFlags(tt.flags)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestGetFlagDescription_EdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		flagName string
		expected string
	}{
		{
			name:     "case sensitivity",
			flagName: "VERBOSE",
			expected: "", // Should be case sensitive
		},
		{
			name:     "partial match",
			flagName: "verb",
			expected: "", // Should be exact match
		},
		{
			name:     "special characters",
			flagName: "dry-run",
			expected: "Show what would be done without actually executing",
		},
		{
			name:     "hyphenated flag",
			flagName: "dry_run", // Underscore instead of hyphen
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetFlagDescription(tt.flagName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Benchmark tests
func BenchmarkGetFlagDescription(b *testing.B) {
	flags := []string{"verbose", "dry-run", "force", "quiet", "unknown"}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		flag := flags[i%len(flags)]
		GetFlagDescription(flag)
	}
}

func BenchmarkNewFlagManager(b *testing.B) {
	globalFlags := &CommonFlags{}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		NewFlagManager(globalFlags)
	}
}

func BenchmarkValidateCommonFlags(b *testing.B) {
	flags := &CommonFlags{
		Verbose: true,
		DryRun:  false,
		Force:   true,
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ValidateCommonFlags(flags)
	}
}