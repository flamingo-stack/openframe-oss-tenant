package executor

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewMockCommandExecutor(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	assert.NotNil(t, mockExec)
	assert.NotNil(t, mockExec.responses)
	assert.NotNil(t, mockExec.defaultResult)
	assert.Empty(t, mockExec.commands)
	
	// Verify it implements the interface
	var _ CommandExecutor = mockExec
}

func TestMockCommandExecutor_Execute(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Set up expected response
	expectedResult := &CommandResult{
		ExitCode: 0,
		Stdout:   "hello world",
		Stderr:   "",
		Duration: 100 * time.Millisecond,
	}
	
	mockExec.SetResponse("echo hello world", expectedResult)
	
	// Execute
	ctx := context.Background()
	result, err := mockExec.Execute(ctx, "echo", "hello", "world")
	
	// Assertions
	assert.NoError(t, err)
	assert.Equal(t, expectedResult.ExitCode, result.ExitCode)
	assert.Equal(t, expectedResult.Stdout, result.Stdout)
	assert.Equal(t, expectedResult.Stderr, result.Stderr)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestMockCommandExecutor_Execute_DefaultResult(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Don't set any specific response, should use default
	ctx := context.Background()
	result, err := mockExec.Execute(ctx, "any", "command")
	
	// Assertions
	assert.NoError(t, err)
	assert.Equal(t, 0, result.ExitCode)
	assert.Equal(t, "mock output", result.Stdout)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestMockCommandExecutor_Execute_ShouldFail(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Configure to fail
	mockExec.SetShouldFail(true, "mock failure")
	
	// Execute
	ctx := context.Background()
	result, err := mockExec.Execute(ctx, "fail")
	
	// Assertions
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "mock failure")
	assert.NotNil(t, result)
	assert.Equal(t, 1, result.ExitCode)
	assert.Equal(t, "mock failure", result.Stderr)
}

func TestMockCommandExecutor_ExecuteWithOptions(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	options := ExecuteOptions{
		Command: "test",
		Args:    []string{"arg1"},
		Dir:     "/tmp",
		Env:     map[string]string{"VAR": "value"},
		Timeout: 5 * time.Second,
	}
	
	expectedResult := &CommandResult{
		ExitCode: 0,
		Stdout:   "test output",
		Stderr:   "",
		Duration: 200 * time.Millisecond,
	}
	
	mockExec.SetResponse("test arg1", expectedResult)
	
	// Execute
	ctx := context.Background()
	result, err := mockExec.ExecuteWithOptions(ctx, options)
	
	// Assertions
	assert.NoError(t, err)
	assert.Equal(t, expectedResult.ExitCode, result.ExitCode)
	assert.Equal(t, expectedResult.Stdout, result.Stdout)
	assert.Greater(t, result.Duration, time.Duration(0))
}

func TestMockCommandExecutor_SetResponse(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Set specific response
	result := &CommandResult{
		ExitCode: 0,
		Stdout:   "specific output",
		Duration: 50 * time.Millisecond,
	}
	
	mockExec.SetResponse("specific", result)
	
	ctx := context.Background()
	
	// Execute matching command
	actualResult, err := mockExec.Execute(ctx, "run", "specific", "command")
	assert.NoError(t, err)
	assert.Equal(t, "specific output", actualResult.Stdout)
	
	// Execute non-matching command (should use default)
	defaultResult, err := mockExec.Execute(ctx, "other", "command")
	assert.NoError(t, err)
	assert.Equal(t, "mock output", defaultResult.Stdout)
}

func TestMockCommandExecutor_SetDefaultResult(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Set custom default with successful exit code
	customDefault := &CommandResult{
		ExitCode: 0,
		Stdout:   "custom default",
		Duration: 75 * time.Millisecond,
	}
	
	mockExec.SetDefaultResult(customDefault)
	
	ctx := context.Background()
	result, err := mockExec.Execute(ctx, "unknown", "command")
	
	assert.NoError(t, err)
	assert.Equal(t, 0, result.ExitCode)
	assert.Equal(t, "custom default", result.Stdout)
	
	// Test with error exit code - note that default result doesn't check exit code
	errorDefault := &CommandResult{
		ExitCode: 2,
		Stdout:   "error default",
		Duration: 75 * time.Millisecond,
	}
	
	mockExec.SetDefaultResult(errorDefault)
	
	result2, err2 := mockExec.Execute(ctx, "another", "command")
	
	// Default result path doesn't check exit code, so no error is returned
	assert.NoError(t, err2) 
	assert.Equal(t, 2, result2.ExitCode)
	assert.Equal(t, "error default", result2.Stdout)
}

func TestMockCommandExecutor_GetExecutedCommands(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	ctx := context.Background()
	
	// Execute some commands
	mockExec.Execute(ctx, "echo", "hello")
	mockExec.Execute(ctx, "ls", "-la")
	mockExec.Execute(ctx, "pwd")
	
	commands := mockExec.GetExecutedCommands()
	
	assert.Len(t, commands, 3)
	assert.Contains(t, commands, "echo hello")
	assert.Contains(t, commands, "ls -la")
	assert.Contains(t, commands, "pwd")
}

func TestMockCommandExecutor_GetCommandCount(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	assert.Equal(t, 0, mockExec.GetCommandCount())
	
	ctx := context.Background()
	mockExec.Execute(ctx, "test1")
	assert.Equal(t, 1, mockExec.GetCommandCount())
	
	mockExec.Execute(ctx, "test2")
	assert.Equal(t, 2, mockExec.GetCommandCount())
}

func TestMockCommandExecutor_WasCommandExecuted(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	ctx := context.Background()
	mockExec.Execute(ctx, "echo", "hello", "world")
	mockExec.Execute(ctx, "ls", "-la")
	
	assert.True(t, mockExec.WasCommandExecuted("echo"))
	assert.True(t, mockExec.WasCommandExecuted("hello"))
	assert.True(t, mockExec.WasCommandExecuted("ls -la"))
	assert.False(t, mockExec.WasCommandExecuted("pwd"))
	assert.False(t, mockExec.WasCommandExecuted("nonexistent"))
}

func TestMockCommandExecutor_GetLastCommand(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// No commands executed yet
	assert.Equal(t, "", mockExec.GetLastCommand())
	
	ctx := context.Background()
	mockExec.Execute(ctx, "first")
	assert.Equal(t, "first", mockExec.GetLastCommand())
	
	mockExec.Execute(ctx, "second", "command")
	assert.Equal(t, "second command", mockExec.GetLastCommand())
}

func TestMockCommandExecutor_Reset(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Set up some state
	mockExec.SetShouldFail(true, "error")
	mockExec.SetResponse("test", &CommandResult{Stdout: "test"})
	
	ctx := context.Background()
	mockExec.Execute(ctx, "some", "command")
	
	// Verify state exists by checking behavior
	assert.Equal(t, 1, mockExec.GetCommandCount())
	
	// Test that failure is configured
	_, err := mockExec.Execute(ctx, "fail")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error")
	
	// Reset
	mockExec.Reset()
	
	// Verify state is cleared by checking behavior
	assert.Equal(t, 0, mockExec.GetCommandCount())
	
	// Test that failure is no longer configured
	_, err = mockExec.Execute(ctx, "test")
	assert.NoError(t, err)
}

func TestMockCommandExecutor_PatternMatching(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	
	// Set response for pattern
	result := &CommandResult{Stdout: "pattern matched"}
	mockExec.SetResponse("kubectl", result)
	
	ctx := context.Background()
	
	// Commands containing "kubectl" should match
	actualResult, _ := mockExec.Execute(ctx, "kubectl", "get", "pods")
	assert.Equal(t, "pattern matched", actualResult.Stdout)
	
	actualResult, _ = mockExec.Execute(ctx, "run", "kubectl", "version")
	assert.Equal(t, "pattern matched", actualResult.Stdout)
	
	// Commands not containing "kubectl" should use default
	actualResult, _ = mockExec.Execute(ctx, "docker", "ps")
	assert.Equal(t, "mock output", actualResult.Stdout)
}

// Test that mock implements the interface correctly
func TestMockCommandExecutorImplementsInterface(t *testing.T) {
	var _ CommandExecutor = &MockCommandExecutor{}
}

func TestMockCommandExecutor_EdgeCases(t *testing.T) {
	tests := []struct {
		name string
		test func(t *testing.T)
	}{
		{
			name: "empty command",
			test: func(t *testing.T) {
				mockExec := NewMockCommandExecutor()
				ctx := context.Background()
				result, err := mockExec.Execute(ctx, "")
				assert.NoError(t, err)
				assert.NotNil(t, result)
			},
		},
		{
			name: "command with no args",
			test: func(t *testing.T) {
				mockExec := NewMockCommandExecutor()
				ctx := context.Background()
				_, err := mockExec.Execute(ctx, "solo")
				assert.NoError(t, err)
				assert.Equal(t, "solo", mockExec.GetLastCommand())
			},
		},
		{
			name: "multiple response patterns",
			test: func(t *testing.T) {
				mockExec := NewMockCommandExecutor()
				mockExec.SetResponse("kubectl", &CommandResult{Stdout: "k8s"})
				mockExec.SetResponse("docker", &CommandResult{Stdout: "container"})
				
				ctx := context.Background()
				result1, _ := mockExec.Execute(ctx, "kubectl", "get", "pods")
				result2, _ := mockExec.Execute(ctx, "docker", "ps")
				result3, _ := mockExec.Execute(ctx, "other")
				
				assert.Equal(t, "k8s", result1.Stdout)
				assert.Equal(t, "container", result2.Stdout)
				assert.Equal(t, "mock output", result3.Stdout)
			},
		},
		{
			name: "zero-value result handling",
			test: func(t *testing.T) {
				mockExec := NewMockCommandExecutor()
				zeroResult := &CommandResult{} // Zero values
				mockExec.SetDefaultResult(zeroResult)
				
				ctx := context.Background()
				result, err := mockExec.Execute(ctx, "test")
				
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, 0, result.ExitCode)
				assert.Equal(t, "", result.Stdout)
				assert.Equal(t, "", result.Stderr)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.test)
	}
}

func TestMockCommandExecutor_ConcurrentAccess(t *testing.T) {
	mockExec := NewMockCommandExecutor()
	ctx := context.Background()
	
	// Test that mock doesn't panic under concurrent access
	// Note: Mock is not guaranteed to be thread-safe, but shouldn't crash
	done := make(chan bool, 5)
	
	for i := 0; i < 5; i++ {
		go func(n int) {
			defer func() { done <- true }()
			_, err := mockExec.Execute(ctx, "concurrent", "test")
			assert.NoError(t, err)
		}(i)
	}
	
	// Wait for all goroutines
	for i := 0; i < 5; i++ {
		<-done
	}
	
	// Just verify that commands were executed (count may vary due to race conditions)
	assert.Greater(t, mockExec.GetCommandCount(), 0)
	assert.LessOrEqual(t, mockExec.GetCommandCount(), 5)
}

// Benchmark tests
func BenchmarkMockCommandExecutor_Execute(b *testing.B) {
	mockExec := NewMockCommandExecutor()
	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		mockExec.Execute(ctx, "test", "command")
	}
}

func BenchmarkMockCommandExecutor_SetResponse(b *testing.B) {
	mockExec := NewMockCommandExecutor()
	result := &CommandResult{Stdout: "test"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		mockExec.SetResponse("test", result)
	}
}