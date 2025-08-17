package testutil

import (
	"bytes"
	"fmt"
	"strings"
	"testing"
	
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

// StandardTestPatterns provides common test patterns for CLI commands

// TestFlagValidation tests standard flag validation scenarios
func TestFlagValidation(t *testing.T, cmdFactory func() *cobra.Command, scenarios []TestCLIScenario) {
	t.Helper()
	
	// Add standard flag validation scenarios
	standardScenarios := []TestCLIScenario{
		{
			Name:     "invalid flag",
			Args:     []string{"--invalid-flag"},
			WantErr:  true,
			Contains: []string{"unknown flag"},
		},
		{
			Name:     "help flag",
			Args:     []string{"--help"},
			WantErr:  false,
			Contains: []string{"Usage:", "Flags:"},
		},
	}
	
	allScenarios := append(standardScenarios, scenarios...)
	TestCLIScenarios(t, cmdFactory, allScenarios)
}

// TestArgumentValidation tests common argument validation patterns
func TestArgumentValidation(t *testing.T, cmd *cobra.Command, validArgs, invalidArgs [][]string) {
	t.Helper()
	
	if cmd.Args == nil {
		t.Skip("Command has no argument validation")
		return
	}
	
	// Test valid arguments
	for i, args := range validArgs {
		t.Run(fmt.Sprintf("valid_args_%d", i), func(t *testing.T) {
			err := cmd.Args(cmd, args)
			assert.NoError(t, err, "Valid args should not produce error: %v", args)
		})
	}
	
	// Test invalid arguments  
	for i, args := range invalidArgs {
		t.Run(fmt.Sprintf("invalid_args_%d", i), func(t *testing.T) {
			err := cmd.Args(cmd, args)
			assert.Error(t, err, "Invalid args should produce error: %v", args)
		})
	}
}

// TestCommandExecution tests command execution with standard patterns
func TestCommandExecution(t *testing.T, cmdFactory func() *cobra.Command, tests []ExecutionTest) {
	t.Helper()
	
	for _, tt := range tests {
		t.Run(tt.Name, func(t *testing.T) {
			cmd := cmdFactory()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tt.Args)
			
			// Parse flags if needed
			if len(tt.Args) > 0 {
				err := cmd.ParseFlags(tt.Args)
				assert.NoError(t, err, "Flag parsing should not fail")
			}
			
			// Execute the run function directly if available
			var err error
			if cmd.RunE != nil {
				// Extract non-flag arguments
				var args []string
				for _, arg := range tt.Args {
					if !strings.HasPrefix(arg, "-") {
						args = append(args, arg)
					}
				}
				err = cmd.RunE(cmd, args)
			} else {
				err = cmd.Execute()
			}
			
			if tt.WantErr {
				assert.Error(t, err)
				if tt.ErrContains != "" {
					assert.Contains(t, err.Error(), tt.ErrContains)
				}
			} else {
				assert.NoError(t, err)
			}
			
			output := out.String()
			for _, contains := range tt.OutputContains {
				assert.Contains(t, output, contains)
			}
		})
	}
}

// ExecutionTest represents a command execution test case
type ExecutionTest struct {
	Name           string
	Args           []string
	WantErr        bool
	ErrContains    string
	OutputContains []string
}


// TestGlobalFlags tests common global flag patterns
func TestGlobalFlags(t *testing.T, cmdFactory func() *cobra.Command) {
	t.Helper()
	
	tests := []TestCLIScenario{
		{
			Name:     "verbose flag",
			Args:     []string{"--verbose", "--help"},
			WantErr:  false,
			Contains: []string{"Usage:"},
		},
		{
			Name:     "silent flag", 
			Args:     []string{"--silent", "--help"},
			WantErr:  false,
			Contains: []string{"Usage:"},
		},
	}
	
	TestCLIScenarios(t, cmdFactory, tests)
}