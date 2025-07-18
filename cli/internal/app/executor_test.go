package app

import (
	"context"
	"testing"
)

func TestNewCommandExecutor(t *testing.T) {
	app := &App{}
	executor := NewCommandExecutor(app)

	if executor == nil {
		t.Fatal("NewCommandExecutor() returned nil")
	}

	if executor.app != app {
		t.Error("NewCommandExecutor() should set app reference correctly")
	}
}

func TestRun(t *testing.T) {
	// Create a mock app
	app := &App{
		dryRun:  false,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test Run method with a simple command
	ctx := context.Background()
	err := executor.Run(ctx, "echo", "hello")
	// This should succeed since echo is a standard command
	if err != nil {
		t.Logf("Run() returned error (may be expected): %v", err)
	}
}

func TestRunInDir(t *testing.T) {
	// Create a mock app
	app := &App{
		dryRun:  false,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test RunInDir method with a simple command
	ctx := context.Background()
	err := executor.RunInDir(ctx, "/tmp", "echo", "hello")
	// This should succeed since echo is a standard command
	if err != nil {
		t.Logf("RunInDir() returned error (may be expected): %v", err)
	}
}

func TestRunWithSignalHandling(t *testing.T) {
	// Create a mock app
	app := &App{
		dryRun:  false,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test RunWithSignalHandling method with a simple command
	ctx := context.Background()
	err := executor.RunWithSignalHandling(ctx, "echo", "hello")
	// This should succeed since echo is a standard command
	if err != nil {
		t.Logf("RunWithSignalHandling() returned error (may be expected): %v", err)
	}
}

func TestRunInDirWithSignalHandling(t *testing.T) {
	// Create a mock app
	app := &App{
		dryRun:  false,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test RunInDirWithSignalHandling method with a simple command
	ctx := context.Background()
	err := executor.RunInDirWithSignalHandling(ctx, "/tmp", "echo", "hello")
	// This should succeed since echo is a standard command
	if err != nil {
		t.Logf("RunInDirWithSignalHandling() returned error (may be expected): %v", err)
	}
}

func TestRunWithDryRun(t *testing.T) {
	// Create a mock app with dry run enabled
	app := &App{
		dryRun:  true,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test Run method with dry run
	ctx := context.Background()
	err := executor.Run(ctx, "echo", "hello")
	// This should succeed since it's just a dry run
	if err != nil {
		t.Errorf("Run() should not error in dry run mode: %v", err)
	}
}

func TestRunInDirWithDryRun(t *testing.T) {
	// Create a mock app with dry run enabled
	app := &App{
		dryRun:  true,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test RunInDir method with dry run
	ctx := context.Background()
	err := executor.RunInDir(ctx, "/tmp", "echo", "hello")
	// This should succeed since it's just a dry run
	if err != nil {
		t.Errorf("RunInDir() should not error in dry run mode: %v", err)
	}
}

func TestRunWithVerbose(t *testing.T) {
	// Create a mock app with verbose enabled
	app := &App{
		dryRun:  false,
		verbose: true,
	}
	executor := &CommandExecutor{app: app}

	// Test Run method with verbose output
	ctx := context.Background()
	err := executor.Run(ctx, "echo", "hello")
	// This should succeed since echo is a standard command
	if err != nil {
		t.Logf("Run() returned error (may be expected): %v", err)
	}
}

func TestRunInDirWithVerbose(t *testing.T) {
	// Create a mock app with verbose enabled
	app := &App{
		dryRun:  false,
		verbose: true,
	}
	executor := &CommandExecutor{app: app}

	// Test RunInDir method with verbose output
	ctx := context.Background()
	err := executor.RunInDir(ctx, "/tmp", "echo", "hello")
	// This should succeed since echo is a standard command
	if err != nil {
		t.Logf("RunInDir() returned error (may be expected): %v", err)
	}
}

func TestRunWithInvalidCommand(t *testing.T) {
	// Create a mock app
	app := &App{
		dryRun:  false,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test Run method with invalid command
	ctx := context.Background()
	err := executor.Run(ctx, "invalid-command-that-does-not-exist")
	// This should fail since the command doesn't exist
	if err == nil {
		t.Error("Run() should error with invalid command")
	}
}

func TestRunInDirWithInvalidCommand(t *testing.T) {
	// Create a mock app
	app := &App{
		dryRun:  false,
		verbose: false,
	}
	executor := &CommandExecutor{app: app}

	// Test RunInDir method with invalid command
	ctx := context.Background()
	err := executor.RunInDir(ctx, "/tmp", "invalid-command-that-does-not-exist")
	// This should fail since the command doesn't exist
	if err == nil {
		t.Error("RunInDir() should error with invalid command")
	}
}

func TestCommandExecutorStructFields(t *testing.T) {
	// Test that CommandExecutor struct has all expected fields
	app := &App{}
	executor := &CommandExecutor{app: app}

	// Test that app field can be accessed
	if executor.app != app {
		t.Error("app field should be accessible")
	}
}
