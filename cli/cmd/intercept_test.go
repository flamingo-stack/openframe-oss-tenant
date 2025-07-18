package cmd

import (
	"testing"
)

func TestInterceptCommandInitialization(t *testing.T) {
	// Test that intercept command is properly initialized
	if interceptCmd.Use != "intercept [service] [local-port] [remote-port]" {
		t.Errorf("Expected intercept command use to be 'intercept [service] [local-port] [remote-port]', got %s", interceptCmd.Use)
	}

	if interceptCmd.Short == "" {
		t.Error("Intercept command should have a short description")
	}

	if interceptCmd.Long == "" {
		t.Error("Intercept command should have a long description")
	}

	// Test that flags are properly added
	mountFlag := interceptCmd.Flags().Lookup("mount")
	if mountFlag == nil {
		t.Error("mount flag should be added to intercept command")
	}

	forceFlag := interceptCmd.Flags().Lookup("force")
	if forceFlag == nil {
		t.Error("force flag should be added to intercept command")
	}

	verboseFlag := interceptCmd.Flags().Lookup("verbose")
	if verboseFlag == nil {
		t.Error("verbose flag should be added to intercept command")
	}

	timeoutFlag := interceptCmd.Flags().Lookup("timeout")
	if timeoutFlag == nil {
		t.Error("timeout flag should be added to intercept command")
	}
}

func TestInterceptCommandArgsValidation(t *testing.T) {
	// Test argument validation
	tests := []struct {
		name    string
		args    []string
		wantErr bool
	}{
		{
			name:    "valid three arguments",
			args:    []string{"openframe-api", "8080", "8080"},
			wantErr: false,
		},
		{
			name:    "no arguments",
			args:    []string{},
			wantErr: true,
		},
		{
			name:    "one argument",
			args:    []string{"openframe-api"},
			wantErr: true,
		},
		{
			name:    "two arguments",
			args:    []string{"openframe-api", "8080"},
			wantErr: true,
		},
		{
			name:    "too many arguments",
			args:    []string{"service1", "8080", "8080", "extra"},
			wantErr: true,
		},
		{
			name:    "empty service name",
			args:    []string{"", "8080", "8080"},
			wantErr: true,
		},
		{
			name:    "whitespace service name",
			args:    []string{"   ", "8080", "8080"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := interceptCmd.Args(interceptCmd, tt.args)
			if (err != nil) != tt.wantErr {
				t.Errorf("interceptCmd.Args() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestInterceptCommandRunE(t *testing.T) {
	// Test the RunE function
	// Since this function depends on the CLI app being initialized,
	// we'll test the basic structure and error handling

	// Test with empty service name
	err := interceptCmd.RunE(interceptCmd, []string{"", "8080", "8080"})
	if err == nil {
		t.Error("RunE should return error for empty service name")
	}

	// Test with whitespace service name
	err = interceptCmd.RunE(interceptCmd, []string{"   ", "8080", "8080"})
	if err == nil {
		t.Error("RunE should return error for whitespace service name")
	}

	// Test with valid arguments (when CLI is not initialized)
	err = interceptCmd.RunE(interceptCmd, []string{"openframe-api", "8080", "8080"})
	if err != nil {
		t.Errorf("RunE should return nil when CLI is not initialized: %v", err)
	}
}

func TestInterceptCommandFlags(t *testing.T) {
	// Test flag default values
	mount, err := interceptCmd.Flags().GetBool("mount")
	if err != nil {
		t.Errorf("Failed to get mount flag: %v", err)
	}
	if mount {
		t.Error("mount flag should default to false")
	}

	force, err := interceptCmd.Flags().GetBool("force")
	if err != nil {
		t.Errorf("Failed to get force flag: %v", err)
	}
	if force {
		t.Error("force flag should default to false")
	}

	verbose, err := interceptCmd.Flags().GetBool("verbose")
	if err != nil {
		t.Errorf("Failed to get verbose flag: %v", err)
	}
	if verbose {
		t.Error("verbose flag should default to false")
	}

	timeout, err := interceptCmd.Flags().GetString("timeout")
	if err != nil {
		t.Errorf("Failed to get timeout flag: %v", err)
	}
	if timeout != "30s" {
		t.Errorf("timeout flag should default to '30s', got %s", timeout)
	}
}

func TestInterceptCommandVariables(t *testing.T) {
	// Test that command variables are properly declared
	// These are package-level variables that should be accessible
	_ = interceptMount
	_ = interceptForce
	_ = interceptVerbose
	_ = interceptTimeout

	t.Log("Intercept command variables are properly declared")
}
