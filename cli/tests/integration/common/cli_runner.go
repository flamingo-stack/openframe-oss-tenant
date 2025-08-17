package common

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

var (
	cliBinary string
	projectRoot string
)

// InitializeCLI builds the CLI binary for testing
func InitializeCLI() error {
	root := GetProjectRoot()
	projectRoot = root
	cliBinary = filepath.Join(root, "build", "openframe-test")
	
	buildCmd := exec.Command("go", "build", "-o", cliBinary, ".")
	buildCmd.Dir = root
	return buildCmd.Run()
}

// CleanupCLI removes the test CLI binary
func CleanupCLI() {
	if cliBinary != "" {
		os.Remove(cliBinary)
	}
}

// GetProjectRoot finds the project root directory
func GetProjectRoot() string {
	if projectRoot != "" {
		return projectRoot
	}
	
	// Get the current working directory and find project root
	wd, _ := os.Getwd()
	// Navigate up to find the directory containing go.mod
	for {
		if _, err := os.Stat(filepath.Join(wd, "go.mod")); err == nil {
			projectRoot = wd
			return wd
		}
		parent := filepath.Dir(wd)
		if parent == wd {
			break
		}
		wd = parent
	}
	projectRoot = wd
	return wd
}

// CLIResult contains the result of a CLI command execution
type CLIResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
	Error    error
}

// RunCLI executes the CLI binary with given arguments
func RunCLI(args ...string) *CLIResult {
	if cliBinary == "" {
		return &CLIResult{
			Error: fmt.Errorf("CLI binary not initialized, call InitializeCLI() first"),
		}
	}
	
	cmd := exec.Command(cliBinary, args...)
	
	// Set a reasonable timeout
	timeout := 2 * time.Minute
	cmd.Env = os.Environ() // Inherit environment
	
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	// Start the command
	if err := cmd.Start(); err != nil {
		return &CLIResult{
			Error: fmt.Errorf("failed to start command: %w", err),
		}
	}
	
	// Wait with timeout
	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()
	
	var err error
	select {
	case err = <-done:
		// Command completed
	case <-time.After(timeout):
		cmd.Process.Kill()
		err = fmt.Errorf("command timed out after %v", timeout)
	}
	
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		}
	}
	
	return &CLIResult{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: exitCode,
		Error:    err,
	}
}

// Success returns true if the command completed successfully
func (r *CLIResult) Success() bool {
	return r.ExitCode == 0 && r.Error == nil
}

// Failed returns true if the command failed
func (r *CLIResult) Failed() bool {
	return !r.Success()
}

// Output returns combined stdout and stderr
func (r *CLIResult) Output() string {
	return r.Stdout + r.Stderr
}