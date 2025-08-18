package executor

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCommandResult_Output(t *testing.T) {
	tests := []struct {
		name     string
		result   CommandResult
		expected string
	}{
		{
			name: "stdout only",
			result: CommandResult{
				Stdout: "hello world",
				Stderr: "",
			},
			expected: "hello world",
		},
		{
			name: "stdout and stderr",
			result: CommandResult{
				Stdout: "hello world",
				Stderr: "error message",
			},
			expected: "hello world\nerror message",
		},
		{
			name: "stderr only",
			result: CommandResult{
				Stdout: "",
				Stderr: "error message",
			},
			expected: "\nerror message",
		},
		{
			name: "empty result",
			result: CommandResult{
				Stdout: "",
				Stderr: "",
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.result.Output())
		})
	}
}

func TestNewRealCommandExecutor(t *testing.T) {
	tests := []struct {
		name    string
		dryRun  bool
		verbose bool
	}{
		{
			name:    "default settings",
			dryRun:  false,
			verbose: false,
		},
		{
			name:    "dry run enabled",
			dryRun:  true,
			verbose: false,
		},
		{
			name:    "verbose enabled",
			dryRun:  false,
			verbose: true,
		},
		{
			name:    "both enabled",
			dryRun:  true,
			verbose: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			executor := NewRealCommandExecutor(tt.dryRun, tt.verbose)
			assert.NotNil(t, executor)

			// Verify it implements the interface
			var _ CommandExecutor = executor
		})
	}
}

func TestRealCommandExecutor_Execute_DryRun(t *testing.T) {
	executor := NewRealCommandExecutor(true, false)

	ctx := context.Background()
	result, err := executor.Execute(ctx, "echo", "hello", "world")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.ExitCode)
	assert.Equal(t, "", result.Stdout)
	assert.Equal(t, "", result.Stderr)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestRealCommandExecutor_Execute_RealCommand(t *testing.T) {
	executor := NewRealCommandExecutor(false, false)

	ctx := context.Background()
	result, err := executor.Execute(ctx, "echo", "hello")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.ExitCode)
	assert.Contains(t, result.Stdout, "hello")
	assert.Equal(t, "", result.Stderr)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestRealCommandExecutor_Execute_FailingCommand(t *testing.T) {
	executor := NewRealCommandExecutor(false, false)

	ctx := context.Background()
	result, err := executor.Execute(ctx, "nonexistentcommand")

	assert.Error(t, err)
	assert.NotNil(t, result)
	assert.NotEqual(t, 0, result.ExitCode)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestRealCommandExecutor_ExecuteWithOptions_DryRun(t *testing.T) {
	executor := NewRealCommandExecutor(true, true) // Enable verbose for coverage

	options := ExecuteOptions{
		Command: "echo",
		Args:    []string{"hello", "world"},
		Dir:     "/tmp",
		Env:     map[string]string{"TEST_VAR": "test_value"},
		Timeout: 5 * time.Second,
	}

	ctx := context.Background()
	result, err := executor.ExecuteWithOptions(ctx, options)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.ExitCode)
	assert.Equal(t, "", result.Stdout)
	assert.Equal(t, "", result.Stderr)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestRealCommandExecutor_ExecuteWithOptions_RealCommand(t *testing.T) {
	executor := NewRealCommandExecutor(false, true) // Enable verbose

	options := ExecuteOptions{
		Command: "echo",
		Args:    []string{"hello", "world"},
	}

	ctx := context.Background()
	result, err := executor.ExecuteWithOptions(ctx, options)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.ExitCode)
	assert.Contains(t, result.Stdout, "hello world")
	assert.Equal(t, "", result.Stderr)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestRealCommandExecutor_ExecuteWithOptions_WithTimeout(t *testing.T) {
	executor := NewRealCommandExecutor(false, false)

	options := ExecuteOptions{
		Command: "echo", // Use a fast command for testing
		Args:    []string{"hello"},
		Timeout: 1 * time.Second,
	}

	ctx := context.Background()
	result, err := executor.ExecuteWithOptions(ctx, options)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.ExitCode)
	assert.Contains(t, result.Stdout, "hello")
}

func TestRealCommandExecutor_ExecuteWithOptions_WithEnv(t *testing.T) {
	executor := NewRealCommandExecutor(false, false)

	options := ExecuteOptions{
		Command: "sh",
		Args:    []string{"-c", "echo $TEST_VAR"},
		Env:     map[string]string{"TEST_VAR": "test_value"},
	}

	ctx := context.Background()
	result, err := executor.ExecuteWithOptions(ctx, options)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.ExitCode)
	assert.Contains(t, result.Stdout, "test_value")
}

func TestRealCommandExecutor_ExecuteWithOptions_FailingCommand(t *testing.T) {
	executor := NewRealCommandExecutor(false, true) // Enable verbose for error coverage

	options := ExecuteOptions{
		Command: "sh",
		Args:    []string{"-c", "exit 1"},
	}

	ctx := context.Background()
	result, err := executor.ExecuteWithOptions(ctx, options)

	assert.Error(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.ExitCode)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestRealCommandExecutor_buildEnvStrings(t *testing.T) {
	executor := &RealCommandExecutor{}

	tests := []struct {
		name     string
		env      map[string]string
		expected []string
	}{
		{
			name:     "empty env",
			env:      map[string]string{},
			expected: []string{},
		},
		{
			name:     "single env var",
			env:      map[string]string{"KEY": "value"},
			expected: []string{"KEY=value"},
		},
		{
			name: "multiple env vars",
			env: map[string]string{
				"KEY1": "value1",
				"KEY2": "value2",
			},
			expected: []string{"KEY1=value1", "KEY2=value2"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := executor.buildEnvStrings(tt.env)

			// Sort both slices for comparison since map iteration order is not guaranteed
			assert.ElementsMatch(t, tt.expected, result)
		})
	}
}

func TestRealCommandExecutor_Execute_ContextCancellation(t *testing.T) {
	executor := NewRealCommandExecutor(false, false)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancel immediately

	result, err := executor.Execute(ctx, "sleep", "10")

	assert.Error(t, err)
	assert.NotNil(t, result)
	assert.NotEqual(t, 0, result.ExitCode)
}

// Test interface compliance
func TestCommandExecutorInterface(t *testing.T) {
	var _ CommandExecutor = NewRealCommandExecutor(false, false)
}

func TestExecuteOptions(t *testing.T) {
	options := ExecuteOptions{
		Command: "test",
		Args:    []string{"arg1", "arg2"},
		Dir:     "/tmp",
		Env:     map[string]string{"VAR": "value"},
		Timeout: 5 * time.Second,
	}

	assert.Equal(t, "test", options.Command)
	assert.Equal(t, []string{"arg1", "arg2"}, options.Args)
	assert.Equal(t, "/tmp", options.Dir)
	assert.Equal(t, map[string]string{"VAR": "value"}, options.Env)
	assert.Equal(t, 5*time.Second, options.Timeout)
}
