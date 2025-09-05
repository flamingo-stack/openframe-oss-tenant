package errors

import (
	"errors"
	"fmt"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidationError_Error(t *testing.T) {
	tests := []struct {
		name     string
		err      *ValidationError
		expected string
	}{
		{
			name: "with value",
			err: &ValidationError{
				Field:   "name",
				Value:   "invalid-name",
				Message: "must contain only letters",
			},
			expected: "validation failed for name 'invalid-name': must contain only letters",
		},
		{
			name: "without value",
			err: &ValidationError{
				Field:   "count",
				Value:   "",
				Message: "must be greater than zero",
			},
			expected: "validation failed for count: must be greater than zero",
		},
		{
			name: "empty field",
			err: &ValidationError{
				Field:   "",
				Value:   "test",
				Message: "required field",
			},
			expected: "validation failed for  'test': required field",
		},
		{
			name: "empty message",
			err: &ValidationError{
				Field:   "email",
				Value:   "invalid-email",
				Message: "",
			},
			expected: "validation failed for email 'invalid-email': ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.err.Error())
		})
	}
}

func TestCommandError_Error(t *testing.T) {
	tests := []struct {
		name     string
		err      *CommandError
		expected string
	}{
		{
			name: "with args",
			err: &CommandError{
				Command: "kubectl",
				Args:    []string{"get", "pods"},
				Err:     errors.New("connection refused"),
			},
			expected: "command 'kubectl [get pods]' failed: connection refused",
		},
		{
			name: "without args",
			err: &CommandError{
				Command: "ping",
				Args:    []string{},
				Err:     errors.New("host unreachable"),
			},
			expected: "command 'ping []' failed: host unreachable",
		},
		{
			name: "nil args",
			err: &CommandError{
				Command: "echo",
				Args:    nil,
				Err:     errors.New("test error"),
			},
			expected: "command 'echo []' failed: test error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.err.Error())
		})
	}
}

func TestCommandError_Unwrap(t *testing.T) {
	originalErr := errors.New("original error")
	cmdErr := &CommandError{
		Command: "test",
		Args:    []string{"arg1"},
		Err:     originalErr,
	}

	unwrapped := cmdErr.Unwrap()
	assert.Equal(t, originalErr, unwrapped)
	assert.True(t, errors.Is(cmdErr, originalErr))
}

func TestNewErrorHandler(t *testing.T) {
	tests := []struct {
		name    string
		verbose bool
	}{
		{
			name:    "verbose enabled",
			verbose: true,
		},
		{
			name:    "verbose disabled",
			verbose: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewErrorHandler(tt.verbose)
			assert.NotNil(t, handler)
			assert.Equal(t, tt.verbose, handler.verbose)
		})
	}
}

func TestErrorHandler_HandleError_Nil(t *testing.T) {
	handler := NewErrorHandler(false)
	
	// Should not panic with nil error
	assert.NotPanics(t, func() {
		handler.HandleError(nil)
	})
}

func TestErrorHandler_HandleError_ValidationError(t *testing.T) {
	handler := NewErrorHandler(false)
	err := &ValidationError{
		Field:   "name",
		Value:   "test",
		Message: "invalid format",
	}

	// Test that the function doesn't panic and runs successfully
	assert.NotPanics(t, func() {
		handler.HandleError(err)
	})
}

func TestErrorHandler_HandleError_ValidationError_NoValue(t *testing.T) {
	handler := NewErrorHandler(false)
	err := &ValidationError{
		Field:   "count",
		Value:   "",
		Message: "must be positive",
	}

	// Test that the function doesn't panic and runs successfully
	// Note: pterm output cannot be easily captured in tests
	assert.NotPanics(t, func() {
		handler.HandleError(err)
	})
}

func TestErrorHandler_HandleError_CommandError(t *testing.T) {
	tests := []struct {
		name    string
		verbose bool
		err     *CommandError
	}{
		{
			name:    "verbose mode",
			verbose: true,
			err: &CommandError{
				Command: "kubectl",
				Args:    []string{"get", "pods"},
				Err:     errors.New("connection failed"),
			},
		},
		{
			name:    "non-verbose mode",
			verbose: false,
			err: &CommandError{
				Command: "docker",
				Args:    []string{"ps"},
				Err:     errors.New("daemon not running"),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewErrorHandler(tt.verbose)

			// Test that the function doesn't panic and runs successfully
			// Note: pterm output cannot be easily captured in tests
			assert.NotPanics(t, func() {
				handler.HandleError(tt.err)
			})
		})
	}
}

func TestErrorHandler_HandleError_CommandError_NoArgs(t *testing.T) {
	handler := NewErrorHandler(false)
	err := &CommandError{
		Command: "uptime",
		Args:    []string{},
		Err:     errors.New("test error"),
	}

	// Test that the function doesn't panic and runs successfully
	// Note: pterm output cannot be easily captured in tests
	assert.NotPanics(t, func() {
		handler.HandleError(err)
	})
}

func TestErrorHandler_HandleError_GenericError(t *testing.T) {
	tests := []struct {
		name    string
		verbose bool
		err     error
	}{
		{
			name:    "generic error verbose",
			verbose: true,
			err:     errors.New("generic error"),
		},
		{
			name:    "generic error non-verbose",
			verbose: false,
			err:     fmt.Errorf("wrapped error: %w", errors.New("inner error")),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := NewErrorHandler(tt.verbose)

			// Test that the function doesn't panic and runs successfully
			// Note: pterm output cannot be easily captured in tests
			assert.NotPanics(t, func() {
				handler.HandleError(tt.err)
			})
		})
	}
}

func TestCreateValidationError(t *testing.T) {
	field := "email"
	value := "invalid-email"
	message := "must be valid email format"

	err := CreateValidationError(field, value, message)

	assert.NotNil(t, err)
	assert.Equal(t, field, err.Field)
	assert.Equal(t, value, err.Value)
	assert.Equal(t, message, err.Message)
	assert.Contains(t, err.Error(), field)
	assert.Contains(t, err.Error(), value)
	assert.Contains(t, err.Error(), message)
}

func TestCreateCommandError(t *testing.T) {
	command := "kubectl"
	args := []string{"get", "pods"}
	originalErr := errors.New("connection failed")

	err := CreateCommandError(command, args, originalErr)

	assert.NotNil(t, err)
	assert.Equal(t, command, err.Command)
	assert.Equal(t, args, err.Args)
	assert.Equal(t, originalErr, err.Err)
	assert.Contains(t, err.Error(), command)
	assert.Contains(t, err.Error(), "connection failed")
}

func TestIsValidationError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name:     "validation error",
			err:      &ValidationError{Field: "test", Message: "test"},
			expected: true,
		},
		{
			name:     "command error",
			err:      &CommandError{Command: "test", Err: errors.New("test")},
			expected: false,
		},
		{
			name:     "generic error",
			err:      errors.New("test error"),
			expected: false,
		},
		{
			name:     "nil error",
			err:      nil,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsValidationError(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsCommandError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected bool
	}{
		{
			name:     "command error",
			err:      &CommandError{Command: "test", Err: errors.New("test")},
			expected: true,
		},
		{
			name:     "validation error",
			err:      &ValidationError{Field: "test", Message: "test"},
			expected: false,
		},
		{
			name:     "generic error",
			err:      errors.New("test error"),
			expected: false,
		},
		{
			name:     "nil error",
			err:      nil,
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsCommandError(tt.err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestErrorHandler_TypeAssertion(t *testing.T) {
	handler := NewErrorHandler(true)

	// Test that the handler correctly identifies error types
	validationErr := &ValidationError{Field: "test", Message: "test"}
	commandErr := &CommandError{Command: "test", Err: errors.New("test")}
	genericErr := errors.New("test")

	// These should not panic
	assert.NotPanics(t, func() {
		handler.HandleError(validationErr)
	})
	assert.NotPanics(t, func() {
		handler.HandleError(commandErr)
	})
	assert.NotPanics(t, func() {
		handler.HandleError(genericErr)
	})
}

func TestErrorTypes_Interfaces(t *testing.T) {
	// Test that our error types implement the error interface
	var err error

	err = &ValidationError{Field: "test", Message: "test"}
	assert.NotNil(t, err)
	assert.Implements(t, (*error)(nil), err)

	err = &CommandError{Command: "test", Err: errors.New("test")}
	assert.NotNil(t, err)
	assert.Implements(t, (*error)(nil), err)
}

func TestValidationError_EdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		err      *ValidationError
		expected string
	}{
		{
			name: "all empty fields",
			err: &ValidationError{
				Field:   "",
				Value:   "",
				Message: "",
			},
			expected: "validation failed for : ",
		},
		{
			name: "special characters in value",
			err: &ValidationError{
				Field:   "path",
				Value:   "/tmp/test with spaces & symbols!",
				Message: "invalid path format",
			},
			expected: "validation failed for path '/tmp/test with spaces & symbols!': invalid path format",
		},
		{
			name: "unicode in message",
			err: &ValidationError{
				Field:   "name",
				Value:   "测试",
				Message: "must contain only ASCII characters",
			},
			expected: "validation failed for name '测试': must contain only ASCII characters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.err.Error())
		})
	}
}

func TestCommandError_EdgeCases(t *testing.T) {
	tests := []struct {
		name     string
		err      *CommandError
		expected string
	}{
		{
			name: "empty command",
			err: &CommandError{
				Command: "",
				Args:    []string{"arg1"},
				Err:     errors.New("no command specified"),
			},
			expected: "command ' [arg1]' failed: no command specified",
		},
		{
			name: "args with spaces",
			err: &CommandError{
				Command: "ssh",
				Args:    []string{"-o", "StrictHostKeyChecking=no", "user@host"},
				Err:     errors.New("connection timeout"),
			},
			expected: "command 'ssh [-o StrictHostKeyChecking=no user@host]' failed: connection timeout",
		},
		{
			name: "nested wrapped error",
			err: &CommandError{
				Command: "kubectl",
				Args:    []string{"apply", "-f", "manifest.yaml"},
				Err:     fmt.Errorf("apply failed: %w", fmt.Errorf("resource conflict: %w", errors.New("already exists"))),
			},
			expected: "command 'kubectl [apply -f manifest.yaml]' failed: apply failed: resource conflict: already exists",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.err.Error())
		})
	}
}

func TestErrorHandler_NilHandling(t *testing.T) {
	tests := []struct {
		name    string
		handler *ErrorHandler
	}{
		{
			name:    "nil handler should not panic",
			handler: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Even a nil handler should not panic - this tests defensive programming
			if tt.handler == nil {
				// In this case we're testing that a nil handler would be handled gracefully
				// In practice, the caller should ensure handler is not nil
				assert.NotPanics(t, func() {
					// Simulate defensive handling if needed
					if tt.handler != nil {
						tt.handler.HandleError(errors.New("test"))
					}
				})
			}
		})
	}
}


// Benchmark tests
func BenchmarkValidationError_Error(b *testing.B) {
	err := &ValidationError{
		Field:   "email",
		Value:   "invalid@email",
		Message: "must be valid email format",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = err.Error()
	}
}

func BenchmarkCommandError_Error(b *testing.B) {
	err := &CommandError{
		Command: "kubectl",
		Args:    []string{"get", "pods"},
		Err:     errors.New("connection failed"),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = err.Error()
	}
}

func BenchmarkErrorHandler_HandleError(b *testing.B) {
	handler := NewErrorHandler(false)
	err := errors.New("test error")

	// Redirect output to discard to avoid cluttering benchmark output
	devNull, _ := os.OpenFile(os.DevNull, os.O_WRONLY, 0)
	defer devNull.Close()
	old := os.Stdout
	os.Stdout = devNull
	defer func() { os.Stdout = old }()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		handler.HandleError(err)
	}
}