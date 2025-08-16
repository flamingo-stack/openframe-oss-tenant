package cmd

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
)

func init() {
	// Suppress logo output during tests
	common.TestMode = true
}

func TestRootCommand(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		expectErr bool
		contains  string
	}{
		{
			name:      "root help",
			args:      []string{"--help"},
			expectErr: false,
			contains:  "OpenFrame CLI - Interactive Kubernetes Platform Bootstrapper",
		},
		{
			name:      "root version",
			args:      []string{"version"},
			expectErr: true, // version subcommand doesn't exist, so it will error
			contains:  "unknown command",
		},
		{
			name:      "invalid command",
			args:      []string{"invalid-command"},
			expectErr: true,
			contains:  "unknown command",
		},
		{
			name:      "no args shows help",
			args:      []string{},
			expectErr: false,
			contains:  "Available Commands:",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var output bytes.Buffer
			
			// Create fresh root command for isolated testing
			testRootCmd := &cobra.Command{
				Use:   "openframe",
				Short: "OpenFrame CLI - Kubernetes cluster bootstrapping and development tools",
				Long:  rootCmd.Long,
			}
			testRootCmd.AddCommand(getClusterCmd())
			testRootCmd.SetArgs(tt.args)
			testRootCmd.SetOut(&output)
			testRootCmd.SetErr(&output)

			err := testRootCmd.Execute()

			if tt.expectErr && err == nil {
				t.Error("expected error but got none")
			}
			if !tt.expectErr && err != nil {
				t.Errorf("unexpected error: %v\nOutput: %s", err, output.String())
			}

			if tt.contains != "" && !strings.Contains(output.String(), tt.contains) {
				t.Errorf("output missing expected string %q\nOutput: %s", tt.contains, output.String())
			}
		})
	}
}

func TestRootGlobalFlags(t *testing.T) {
	tests := []struct {
		name      string
		args      []string
		expectErr bool
		checkFunc func(*testing.T, string)
	}{
		{
			name:      "verbose flag",
			args:      []string{"--verbose", "cluster", "list"},
			expectErr: false,
			checkFunc: func(t *testing.T, output string) {
				// Should execute without error with verbose flag
			},
		},
		{
			name:      "silent flag",
			args:      []string{"--silent", "cluster", "list"},
			expectErr: false,
			checkFunc: func(t *testing.T, output string) {
				// Should execute without error with silent flag
			},
		},
		{
			name:      "verbose and silent combined",
			args:      []string{"--verbose", "--silent", "cluster", "list"},
			expectErr: false,
			checkFunc: func(t *testing.T, output string) {
				// Should execute without error - silent takes precedence
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var output bytes.Buffer
			
			// Reset global flags
			globalVerbose = false
			globalSilent = false
			
			testRootCmd := &cobra.Command{
				Use:   "openframe",
				Short: "OpenFrame CLI - Kubernetes cluster bootstrapping and development tools",
				PersistentPreRun: rootCmd.PersistentPreRun,
			}
			testRootCmd.PersistentFlags().BoolVarP(&globalVerbose, "verbose", "v", false, "Enable verbose output")
			testRootCmd.PersistentFlags().BoolVar(&globalSilent, "silent", false, "Suppress all output except errors")
			testRootCmd.AddCommand(getClusterCmd())
			testRootCmd.SetArgs(tt.args)
			testRootCmd.SetOut(&output)
			testRootCmd.SetErr(&output)

			err := testRootCmd.Execute()

			if tt.expectErr && err == nil {
				t.Error("expected error but got none")
			}
			if !tt.expectErr && err != nil {
				t.Errorf("unexpected error: %v\nOutput: %s", err, output.String())
			}

			if tt.checkFunc != nil {
				tt.checkFunc(t, output.String())
			}
		})
	}
}

func TestShowLogo(t *testing.T) {
	// Test that ShowLogo function exists and can be called without panicking
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("ShowLogo should not panic: %v", r)
		}
	}()
	
	// Just call the function to ensure it doesn't crash
	ShowLogo()
	
	// The function exists and is callable
	t.Log("ShowLogo function executed successfully")
}

func TestInitConfig(t *testing.T) {
	// Test that initConfig runs without error
	initConfig()
	
	// Check that log directory was created
	if _, err := os.Stat("/tmp/openframe-deployment-logs"); os.IsNotExist(err) {
		t.Error("initConfig() should create log directory")
	}
}

func TestExecuteExists(t *testing.T) {
	// Test that Execute function exists and can be called
	// We test by checking if it's a valid function (not nil when called)
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Execute function should exist and be callable: %v", r)
		}
	}()
	
	// Test that we can reference the Execute function
	// This will compile-time verify the function exists
	executeFunc := Execute
	if executeFunc == nil {
		t.Error("Execute function should not be nil")
	}
}

func TestVersionVariables(t *testing.T) {
	// Test that version variables exist and have default values
	if version == "" {
		t.Error("version variable should be initialized")
	}
	if commit == "" {
		t.Error("commit variable should be initialized")
	}
	if date == "" {
		t.Error("date variable should be initialized")
	}
}