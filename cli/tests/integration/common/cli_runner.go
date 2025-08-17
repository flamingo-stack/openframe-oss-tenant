package common

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var (
	cliBinary string
	projectRoot string
)

// InitializeCLI builds the CLI binary for testing
func InitializeCLI() error {
	// If already initialized and binary exists, just return
	if cliBinary != "" {
		if _, err := os.Stat(cliBinary); err == nil {
			return nil
		}
	}
	
	root := GetProjectRoot()
	projectRoot = root
	
	// Ensure build directory exists
	buildDir := filepath.Join(root, "build")
	if err := os.MkdirAll(buildDir, 0755); err != nil {
		return fmt.Errorf("failed to create build directory: %w", err)
	}
	
	cliBinary = filepath.Join(buildDir, "openframe")
	
	buildCmd := exec.Command("go", "build", "-o", cliBinary, ".")
	buildCmd.Dir = root
	
	if err := buildCmd.Run(); err != nil {
		return fmt.Errorf("failed to build CLI binary: %w", err)
	}
	
	// Verify the binary was created and is executable
	if _, err := os.Stat(cliBinary); err != nil {
		return fmt.Errorf("CLI binary not found after build: %w", err)
	}
	
	return nil
}

// CleanupCLI removes the test CLI binary
func CleanupCLI() {
	if cliBinary != "" {
		os.Remove(cliBinary)
		cliBinary = ""
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
		goModPath := filepath.Join(wd, "go.mod")
		if _, err := os.Stat(goModPath); err == nil {
			// Verify this is the openframe project by checking go.mod content
			projectRoot = wd
			return wd
		}
		parent := filepath.Dir(wd)
		if parent == wd {
			// Reached filesystem root without finding go.mod
			break
		}
		wd = parent
	}
	
	// Fallback: if we can't find go.mod, try a more explicit approach
	// This handles cases where tests are run from different working directories
	wd, _ = os.Getwd()
	if filepath.Base(wd) == "cluster" && filepath.Base(filepath.Dir(wd)) == "integration" {
		// We're in tests/integration/cluster, go up to project root
		projectRoot = filepath.Clean(filepath.Join(wd, "..", "..", ".."))
		return projectRoot
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
	
	// Check if binary exists and is executable
	if _, err := os.Stat(cliBinary); err != nil {
		return &CLIResult{
			Error: fmt.Errorf("CLI binary not found at %s: %w", cliBinary, err),
			Stderr: fmt.Sprintf("CLI binary not found at %s: %v", cliBinary, err),
		}
	}
	
	cmd := exec.Command(cliBinary, args...)
	cmd.Env = os.Environ()
	
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	err := cmd.Run()
	exitCode := 0
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			exitCode = exitError.ExitCode()
		} else {
			// If it's not an ExitError, it might be a more serious issue
			return &CLIResult{
				Error:    err,
				Stderr:   fmt.Sprintf("Command execution failed: %v", err),
				ExitCode: -1,
			}
		}
	}
	
	result := &CLIResult{
		Stdout:   stdout.String(),
		Stderr:   stderr.String(),
		ExitCode: exitCode,
		Error:    err,
	}
	
	// Debug: If we have an empty output but no error, something is wrong
	if result.Stdout == "" && result.Stderr == "" && result.Error == nil {
		result.Error = fmt.Errorf("command executed but produced no output")
		result.Stderr = "command executed but produced no output"
	}
	
	return result
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

// ErrorMessage extracts just the error message without usage text
func (r *CLIResult) ErrorMessage() string {
	if r.Stderr == "" {
		return ""
	}
	
	lines := strings.Split(r.Stderr, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "Error: ") {
			return line
		}
	}
	
	// If no "Error: " prefix found, return first non-empty line
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "Usage:") && !strings.HasPrefix(line, "Flags:") {
			return line
		}
	}
	
	return r.Stderr
}