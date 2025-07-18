package cmd

import (
	"testing"
)

func TestDevCommandInitialization(t *testing.T) {
	// Test that dev command is properly initialized
	if devCmd.Use != "dev [service]" {
		t.Errorf("Expected dev command use to be 'dev [service]', got %s", devCmd.Use)
	}

	if devCmd.Short == "" {
		t.Error("Dev command should have a short description")
	}

	if devCmd.Long == "" {
		t.Error("Dev command should have a long description")
	}

	// Test that flags are properly added
	portForwardFlag := devCmd.Flags().Lookup("port-forward")
	if portForwardFlag == nil {
		t.Error("port-forward flag should be added to dev command")
	}

	tailFlag := devCmd.Flags().Lookup("tail")
	if tailFlag == nil {
		t.Error("tail flag should be added to dev command")
	}

	cleanupFlag := devCmd.Flags().Lookup("cleanup")
	if cleanupFlag == nil {
		t.Error("cleanup flag should be added to dev command")
	}

	verboseFlag := devCmd.Flags().Lookup("verbose")
	if verboseFlag == nil {
		t.Error("verbose flag should be added to dev command")
	}

	timeoutFlag := devCmd.Flags().Lookup("timeout")
	if timeoutFlag == nil {
		t.Error("timeout flag should be added to dev command")
	}
}

func TestDevCommandArgsValidation(t *testing.T) {
	// Test argument validation
	tests := []struct {
		name    string
		args    []string
		wantErr bool
	}{
		{
			name:    "valid single argument",
			args:    []string{"openframe-api"},
			wantErr: false,
		},
		{
			name:    "no arguments",
			args:    []string{},
			wantErr: true,
		},
		{
			name:    "too many arguments",
			args:    []string{"service1", "service2"},
			wantErr: true,
		},
		{
			name:    "empty service name",
			args:    []string{""},
			wantErr: true,
		},
		{
			name:    "whitespace service name",
			args:    []string{"   "},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := devCmd.Args(devCmd, tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("devCmd.Args() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestDevCommandRunE(t *testing.T) {
	// Test the RunE function
	// Since this function depends on the CLI app being initialized,
	// we'll test the basic structure and error handling

	// Test with empty service name
	err := devCmd.RunE(devCmd, []string{""})
	if err == nil {
		t.Error("RunE should return error for empty service name")
	}

	// Test with whitespace service name
	err = devCmd.RunE(devCmd, []string{"   "})
	if err == nil {
		t.Error("RunE should return error for whitespace service name")
	}

	// Test with valid service name (when CLI is not initialized)
	err = devCmd.RunE(devCmd, []string{"openframe-api"})
	if err != nil {
		t.Errorf("RunE should return nil when CLI is not initialized: %v", err)
	}
}

func TestDevCommandFlags(t *testing.T) {
	// Test flag default values
	portForward, err := devCmd.Flags().GetBool("port-forward")
	if err != nil {
		t.Errorf("Failed to get port-forward flag: %v", err)
	}
	if !portForward {
		t.Error("port-forward flag should default to true")
	}

	tail, err := devCmd.Flags().GetBool("tail")
	if err != nil {
		t.Errorf("Failed to get tail flag: %v", err)
	}
	if !tail {
		t.Error("tail flag should default to true")
	}

	cleanup, err := devCmd.Flags().GetBool("cleanup")
	if err != nil {
		t.Errorf("Failed to get cleanup flag: %v", err)
	}
	if !cleanup {
		t.Error("cleanup flag should default to true")
	}

	verbose, err := devCmd.Flags().GetBool("verbose")
	if err != nil {
		t.Errorf("Failed to get verbose flag: %v", err)
	}
	if verbose {
		t.Error("verbose flag should default to false")
	}

	timeout, err := devCmd.Flags().GetString("timeout")
	if err != nil {
		t.Errorf("Failed to get timeout flag: %v", err)
	}
	if timeout != "0" {
		t.Errorf("timeout flag should default to '0', got %s", timeout)
	}
}

func TestDevCommandVariables(t *testing.T) {
	// Test that command variables are properly declared
	// These are package-level variables that should be accessible
	_ = devPortForward
	_ = devTail
	_ = devCleanup
	_ = devVerbose
	_ = devTimeout

	t.Log("Dev command variables are properly declared")
}
