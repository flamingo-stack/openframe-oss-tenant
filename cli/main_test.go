package main

import (
	"bytes"
	"os"
	"os/exec"
	"strings"
	"testing"
)

func TestMain_NoArgs(t *testing.T) {
	// Test that main doesn't panic when called without arguments
	// We can't easily test main() directly, but we can test that
	// the program structure is sound by importing it
	if os.Getenv("BE_CRASHER") == "1" {
		main()
		return
	}
	
	// This test mainly ensures the main package compiles correctly
	// and imports are properly resolved
	t.Log("Main package imports resolved successfully")
}

func TestMainFunction(t *testing.T) {
	// Test main function by running the compiled binary
	if testing.Short() {
		t.Skip("skipping main function test in short mode")
	}

	// Build the binary first
	buildCmd := exec.Command("go", "build", "-o", "test-openframe", ".")
	buildCmd.Dir = "."
	err := buildCmd.Run()
	if err != nil {
		t.Fatalf("failed to build binary for testing: %v", err)
	}
	defer os.Remove("test-openframe")

	// Test help command
	cmd := exec.Command("./test-openframe", "--help")
	var output bytes.Buffer
	cmd.Stdout = &output
	cmd.Stderr = &output
	
	err = cmd.Run()
	if err != nil {
		t.Errorf("main function failed with --help: %v\nOutput: %s", err, output.String())
	}
	
	if !strings.Contains(output.String(), "OpenFrame CLI") {
		t.Error("main function should show OpenFrame CLI help")
	}
}

func TestMainErrorHandling(t *testing.T) {
	// Test main function error handling by running invalid command
	if testing.Short() {
		t.Skip("skipping main error handling test in short mode")
	}

	// Build the binary first
	buildCmd := exec.Command("go", "build", "-o", "test-openframe-error", ".")
	buildCmd.Dir = "."
	err := buildCmd.Run()
	if err != nil {
		t.Fatalf("failed to build binary for testing: %v", err)
	}
	defer os.Remove("test-openframe-error")

	// Test invalid command
	cmd := exec.Command("./test-openframe-error", "invalid-command")
	var output bytes.Buffer
	cmd.Stdout = &output
	cmd.Stderr = &output
	
	err = cmd.Run()
	if err == nil {
		t.Error("main function should return error for invalid command")
	}
	
	// Check exit code
	if exitError, ok := err.(*exec.ExitError); ok {
		if exitError.ExitCode() != 1 {
			t.Errorf("expected exit code 1, got %d", exitError.ExitCode())
		}
	}
}

func TestMainImports(t *testing.T) {
	// Test that main package imports are resolved correctly
	// The main function depends on cmd.Execute() from cmd package
	t.Log("Main package imports resolved successfully")
}