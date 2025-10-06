package executor

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

// CommandExecutor provides an abstraction layer for executing external commands
// This interface allows for dependency injection and testing without running real commands
type CommandExecutor interface {
	Execute(ctx context.Context, name string, args ...string) (*CommandResult, error)
	ExecuteWithOptions(ctx context.Context, options ExecuteOptions) (*CommandResult, error)
}

// CommandResult represents the result of a command execution
type CommandResult struct {
	ExitCode int
	Stdout   string
	Stderr   string
	Duration time.Duration
}

// Output returns combined stdout and stderr for backward compatibility
func (r *CommandResult) Output() string {
	if r.Stderr != "" {
		return r.Stdout + "\n" + r.Stderr
	}
	return r.Stdout
}

// ExecuteOptions provides fine-grained control over command execution
type ExecuteOptions struct {
	Command string
	Args    []string
	Dir     string            // Working directory
	Env     map[string]string // Environment variables
	Timeout time.Duration     // Execution timeout
}

// RealCommandExecutor implements CommandExecutor using actual system commands
type RealCommandExecutor struct {
	dryRun  bool
	verbose bool
}

// NewRealCommandExecutor creates a new real command executor
func NewRealCommandExecutor(dryRun, verbose bool) CommandExecutor {
	return &RealCommandExecutor{
		dryRun:  dryRun,
		verbose: verbose,
	}
}

// Execute implements CommandExecutor.Execute
func (e *RealCommandExecutor) Execute(ctx context.Context, name string, args ...string) (*CommandResult, error) {
	options := ExecuteOptions{
		Command: name,
		Args:    args,
		Dir:     "",
		Env:     nil,
		Timeout: 0,
	}
	return e.ExecuteWithOptions(ctx, options)
}

// ExecuteWithOptions implements CommandExecutor.ExecuteWithOptions
func (e *RealCommandExecutor) ExecuteWithOptions(ctx context.Context, options ExecuteOptions) (*CommandResult, error) {
	start := time.Now()
	
	// Build full command string for logging
	fullCommand := options.Command
	if len(options.Args) > 0 {
		fullCommand += " " + strings.Join(options.Args, " ")
	}
	
	result := &CommandResult{
		Stdout: "",
		Stderr: "",
	}
	
	// Handle dry-run mode
	if e.dryRun {
		if e.verbose {
			fmt.Printf("Would run: %s\n", fullCommand)
		}
		result.Duration = time.Since(start)
		return result, nil
	}
	
	// Create the command
	cmd := exec.CommandContext(ctx, options.Command, options.Args...)
	
	// Set working directory if specified
	if options.Dir != "" {
		cmd.Dir = options.Dir
	}
	
	// Set environment variables if specified
	if len(options.Env) > 0 {
		// Start with current environment and add custom variables
		cmd.Env = append(os.Environ(), e.buildEnvStrings(options.Env)...)
	}
	
	// Apply timeout if specified
	if options.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, options.Timeout)
		defer cancel()
		cmd = exec.CommandContext(ctx, options.Command, options.Args...)
		
		// Reapply directory and env since we recreated the command
		if options.Dir != "" {
			cmd.Dir = options.Dir
		}
		if len(options.Env) > 0 {
			// Start with current environment and add custom variables
			cmd.Env = append(os.Environ(), e.buildEnvStrings(options.Env)...)
		}
	}
	
	// Log command execution in verbose mode
	if e.verbose {
		fmt.Printf("Executing: %s\n", fullCommand)
	}
	
	// Execute the command
	stdout, err := cmd.Output()
	result.Duration = time.Since(start)
	result.Stdout = string(stdout)
	
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
			result.Stderr = string(exitError.Stderr)
		} else {
			result.ExitCode = -1
		}
		
		// Log error in verbose mode
		if e.verbose {
			fmt.Printf("Command failed: %s (exit code: %d)\n", fullCommand, result.ExitCode)
			if result.Stderr != "" {
				fmt.Printf("Stderr: %s\n", result.Stderr)
			}
		}
		
		return result, fmt.Errorf("command failed: %s (exit code: %d): %w", redactSensitiveInfo(fullCommand), result.ExitCode, err)
	}
	
	result.ExitCode = 0
	
	// Log success in verbose mode
	if e.verbose {
		fmt.Printf("Command completed successfully: %s (took %v)\n", fullCommand, result.Duration)
	}

	return result, nil
}

// buildEnvStrings converts environment map to string slice
func (e *RealCommandExecutor) buildEnvStrings(env map[string]string) []string {
	var envStrings []string
	for key, value := range env {
		envStrings = append(envStrings, fmt.Sprintf("%s=%s", key, value))
	}
	return envStrings
}