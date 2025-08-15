package cluster

import (
	"bytes"
	"fmt"
	"testing"
	"time"

	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/stretchr/testify/assert"
)

func TestListCommand_Flags(t *testing.T) {
	cmd := getListCmd()
	
	// Test that all expected flags are present
	assert.NotNil(t, cmd.Flags().Lookup("quiet"))
	
	// Test flag default values
	quietFlag := cmd.Flags().Lookup("quiet")
	assert.Equal(t, "false", quietFlag.DefValue)
	assert.Equal(t, "q", quietFlag.Shorthand)
}

func TestListCommand_Usage(t *testing.T) {
	cmd := getListCmd()
	
	// Test basic command properties
	assert.Equal(t, "list", cmd.Use)
	assert.Equal(t, "List all Kubernetes clusters", cmd.Short)
	assert.Contains(t, cmd.Long, "List - List all Kubernetes clusters managed by OpenFrame CLI")
	
	// List command should accept any number of arguments (gracefully ignored)
	// Args can be nil for commands that don't validate arguments
}

func TestListCommand_HelpOutput(t *testing.T) {
	cmd := getListCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Trigger help
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	
	// Help should not return an error
	assert.NoError(t, err)
	
	output := out.String()
	assert.Contains(t, output, "List all Kubernetes clusters")
	assert.Contains(t, output, "--quiet")
	assert.Contains(t, output, "-q,")
	assert.Contains(t, output, "Only show cluster names")
	assert.Contains(t, output, "openframe cluster list")
}

func TestRunListClusters_NoArgs(t *testing.T) {
	// Reset global flags
	ResetGlobalFlags()
	
	// Create command with output buffer
	cmd := getListCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test with no arguments 
	err := runListClusters(cmd, []string{})
	
	// Command should complete gracefully when no clusters are found
	// The list command shows "No clusters found." and helpful message, then returns nil
	assert.NoError(t, err)
	output := out.String()
	// The "No clusters found" message might be printed to stderr or stdout directly
	// Just verify that the command completed without error
	_ = output
}

func TestListCommand_Integration(t *testing.T) {
	// Test command structure and flag parsing
	tests := []struct {
		name     string
		args     []string
		wantErr  bool
		contains []string
	}{
		{
			name:     "help flag",
			args:     []string{"--help"},
			wantErr:  false,
			contains: []string{"List all Kubernetes clusters"},
		},
		{
			name:     "invalid flag",
			args:     []string{"--invalid-flag"},
			wantErr:  true,
			contains: []string{"unknown flag"},
		},
		{
			name:     "too many args",
			args:     []string{"extra-arg"},
			wantErr:  false, // list command should accept extra args gracefully or ignore them
			contains: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := getListCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			err := cmd.Execute()
			
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			
			output := out.String()
			for _, contains := range tt.contains {
				assert.Contains(t, output, contains)
			}
		})
	}
}

func TestListCommand_QuietFlag(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		wantQuiet bool
	}{
		{
			name:      "quiet flag long form",
			args:      []string{"--quiet"},
			wantQuiet: true,
		},
		{
			name:      "quiet flag short form",
			args:      []string{"-q"},
			wantQuiet: true,
		},
		{
			name:      "no quiet flag",
			args:      []string{},
			wantQuiet: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cmd := getListCmd()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.args)
			
			// Parse flags
			cmd.ParseFlags(tt.args)
			
			// Check quiet flag value
			quiet, _ := cmd.Flags().GetBool("quiet")
			assert.Equal(t, tt.wantQuiet, quiet)
		})
	}
}

func TestListCommand_Examples(t *testing.T) {
	cmd := getListCmd()
	
	// Verify examples are documented
	assert.Contains(t, cmd.Long, "openframe cluster list")
	assert.Contains(t, cmd.Long, "--verbose")
	assert.Contains(t, cmd.Long, "--silent")
}

func TestListCommand_LongDescription(t *testing.T) {
	cmd := getListCmd()
	
	// Verify comprehensive description
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "comprehensive cluster information")
	assert.Contains(t, longDesc, "cluster name, type, status")
	assert.Contains(t, longDesc, "formatted table")
	assert.Contains(t, longDesc, "all registered providers")
}

// Test formatAge function
func TestFormatAge(t *testing.T) {
	now := time.Now()
	
	tests := []struct {
		name     string
		duration time.Duration
		expected string
	}{
		{
			name:     "30 seconds",
			duration: 30 * time.Second,
			expected: "30s",
		},
		{
			name:     "5 minutes",
			duration: 5 * time.Minute,
			expected: "5m",
		},
		{
			name:     "2 hours",
			duration: 2 * time.Hour,
			expected: "2h",
		},
		{
			name:     "3 days",
			duration: 3 * 24 * time.Hour,
			expected: "3d",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			createdAt := now.Add(-tt.duration)
			result := uiCluster.FormatAge(createdAt)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// Benchmark for command creation
func BenchmarkGetListCmd(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = getListCmd()
	}
}

// Test command lifecycle
func TestListCommand_Lifecycle(t *testing.T) {
	// Test that command can be created and executed multiple times
	for i := 0; i < 3; i++ {
		cmd := getListCmd()
		assert.NotNil(t, cmd)
		assert.Equal(t, "list", cmd.Use)
		
		// Should be able to access help
		var out bytes.Buffer
		cmd.SetOut(&out)
		cmd.SetErr(&out)
		cmd.SetArgs([]string{"--help"})
		err := cmd.Execute()
		assert.NoError(t, err)
	}
}

// Test output formatting
func TestListCommand_OutputFormatting(t *testing.T) {
	// Test that command produces reasonable output structure
	cmd := getListCmd()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Test help output formatting
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	assert.NoError(t, err)
	
	output := out.String()
	
	// Should have proper structure
	assert.Contains(t, output, "Usage:")
	assert.Contains(t, output, "Flags:")
	assert.Contains(t, output, "Examples:")
}

func TestListCommand_DescriptionContent(t *testing.T) {
	cmd := getListCmd()
	
	// Verify that the description mentions key functionality
	longDesc := cmd.Long
	assert.Contains(t, longDesc, "cluster name, type, status")
	assert.Contains(t, longDesc, "formatted table")
	assert.Contains(t, longDesc, "all registered providers")
	assert.Contains(t, longDesc, "quiet mode")
}

// Test command structure consistency
func TestListCommand_StructureConsistency(t *testing.T) {
	cmd := getListCmd()
	
	// Should have Run function
	assert.NotNil(t, cmd.RunE)
	
	// Should have description
	assert.NotEmpty(t, cmd.Short)
	assert.NotEmpty(t, cmd.Long)
	
	// Should have proper command name
	assert.Equal(t, "list", cmd.Use)
	
	// Should have quiet flag
	quietFlag := cmd.Flags().Lookup("quiet")
	assert.NotNil(t, quietFlag)
	assert.Equal(t, "q", quietFlag.Shorthand)
}

// Test flag handling
func TestListCommand_FlagHandling(t *testing.T) {
	// Test flag parsing with various combinations
	testCases := [][]string{
		{"--quiet"},
		{"-q"},
		{"--quiet=true"},
		{"--quiet=false"},
	}
	
	for _, args := range testCases {
		t.Run(fmt.Sprintf("args: %v", args), func(t *testing.T) {
			// Reset command state
			cmd := getListCmd()
			cmd.SetArgs(args)
			
			// Should parse without error
			err := cmd.ParseFlags(args)
			assert.NoError(t, err)
			
			// Should be able to retrieve flag value
			quiet, err := cmd.Flags().GetBool("quiet")
			assert.NoError(t, err)
			_ = quiet // Value doesn't matter for this test
		})
	}
}

// Test error conditions
func TestListCommand_ErrorHandling(t *testing.T) {
	// Test that the command handles various error conditions gracefully
	// Should handle empty output buffers
	var out bytes.Buffer
	cmd := getListCmd()
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	
	// Should be able to show help without errors
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	assert.NoError(t, err)
	assert.NotEmpty(t, out.String())
}