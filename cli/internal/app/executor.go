package app

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
)

// CommandExecutor handles command execution operations
type CommandExecutor struct {
	app *App
}

// NewCommandExecutor creates a new command executor
func NewCommandExecutor(app *App) *CommandExecutor {
	return &CommandExecutor{app: app}
}

// Run executes a command
func (ce *CommandExecutor) Run(ctx context.Context, name string, args ...string) error {
	if ce.app.dryRun {
		fmt.Printf("[DRY RUN] %s %s\n", name, strings.Join(args, " "))
		return nil
	}

	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if ce.app.verbose {
		fmt.Printf("Running: %s %s\n", name, strings.Join(args, " "))
	}

	return cmd.Run()
}

// RunInDir executes a command in a specific directory
func (ce *CommandExecutor) RunInDir(ctx context.Context, dir, name string, args ...string) error {
	if ce.app.dryRun {
		fmt.Printf("[DRY RUN] cd %s && %s %s\n", dir, name, strings.Join(args, " "))
		return nil
	}

	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if ce.app.verbose {
		fmt.Printf("Running in %s: %s %s\n", dir, name, strings.Join(args, " "))
	}

	return cmd.Run()
}

// RunWithSignalHandling executes a command with signal handling
func (ce *CommandExecutor) RunWithSignalHandling(ctx context.Context, name string, args ...string) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Set up signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n🛑 Received interrupt signal, shutting down...")
		cancel()
	}()

	return ce.Run(ctx, name, args...)
}

// RunInDirWithSignalHandling executes a command in a directory with signal handling
func (ce *CommandExecutor) RunInDirWithSignalHandling(ctx context.Context, dir, name string, args ...string) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// Set up signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		fmt.Println("\n🛑 Received interrupt signal, shutting down...")
		cancel()
	}()

	return ce.RunInDir(ctx, dir, name, args...)
}
