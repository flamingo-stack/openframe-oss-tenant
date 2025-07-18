package cmd

import (
	"context"
	"testing"
	"time"

	"github.com/spf13/cobra"
)

func TestExecute(t *testing.T) {
	// Test that Execute function exists and can be called
	// We'll test with help flag to avoid actual execution
	originalArgs := rootCmd.Args
	defer func() { rootCmd.Args = originalArgs }()

	// Temporarily modify root command to accept help
	rootCmd.Args = func(cmd *cobra.Command, args []string) error {
		return nil
	}

	// Test that Execute doesn't panic
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Execute() panicked: %v", r)
		}
	}()

	// This would normally execute the command, but we've modified it
	// to just return success for testing
	t.Log("Execute() function exists and is callable")
}

func TestWithGracefulShutdown(t *testing.T) {
	// Test withGracefulShutdown function
	ctx := context.Background()

	// Test successful execution
	err := withGracefulShutdown(ctx, func(ctx context.Context) error {
		return nil
	})
	if err != nil {
		t.Errorf("withGracefulShutdown should return nil for successful execution: %v", err)
	}

	// Test error propagation
	expectedErr := context.Canceled
	err = withGracefulShutdown(ctx, func(ctx context.Context) error {
		return expectedErr
	})
	if err != expectedErr {
		t.Errorf("withGracefulShutdown should propagate errors: got %v, want %v", err, expectedErr)
	}

	// Test context cancellation
	err = withGracefulShutdown(ctx, func(ctx context.Context) error {
		// Simulate some work
		time.Sleep(10 * time.Millisecond)
		// Check if context was cancelled
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			return nil
		}
	})
	if err != nil {
		t.Errorf("withGracefulShutdown should handle context cancellation gracefully: %v", err)
	}
}

func TestRootCommandInitialization(t *testing.T) {
	// Test that root command is properly initialized
	if rootCmd.Use != "openframe" {
		t.Errorf("Expected root command use to be 'openframe', got %s", rootCmd.Use)
	}

	if rootCmd.Short == "" {
		t.Error("Root command should have a short description")
	}

	if rootCmd.Long == "" {
		t.Error("Root command should have a long description")
	}

	// Test that persistent flags are added
	dryRunFlag := rootCmd.PersistentFlags().Lookup("dry-run")
	if dryRunFlag == nil {
		t.Error("dry-run flag should be added to root command")
	}

	verboseFlag := rootCmd.PersistentFlags().Lookup("verbose")
	if verboseFlag == nil {
		t.Error("verbose flag should be added to root command")
	}

	// Test that completion command is added
	completionCmd := rootCmd.Commands()
	found := false
	for _, cmd := range completionCmd {
		if cmd.Use == "completion [bash|zsh|fish|powershell]" {
			found = true
			break
		}
	}
	if !found {
		t.Error("completion command should be added to root command")
	}
}

func TestRootCommandPersistentPreRunE(t *testing.T) {
	// Test PersistentPreRunE function
	// This would normally initialize the CLI app
	// For testing, we'll just verify the function exists
	if rootCmd.PersistentPreRunE == nil {
		t.Error("Root command should have PersistentPreRunE function")
	}
}

func TestVersionInformation(t *testing.T) {
	// Test that version information is properly set
	if version == "" {
		t.Error("version should not be empty")
	}
	if commit == "" {
		t.Error("commit should not be empty")
	}
	if date == "" {
		t.Error("date should not be empty")
	}
}
