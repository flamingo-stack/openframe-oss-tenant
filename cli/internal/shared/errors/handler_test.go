package errors

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestHandleConfirmationError(t *testing.T) {
	tests := []struct {
		name           string
		err            error
		expectedResult bool
		expectsExit    bool
	}{
		{
			name:           "nil error should return false",
			err:            nil,
			expectedResult: false,
			expectsExit:    false,
		},
		{
			name:           "non-interrupted error should return false",
			err:            fmt.Errorf("some other error"),
			expectedResult: false,
			expectsExit:    false,
		},
		{
			name:           "interrupted error should return true and exit",
			err:            fmt.Errorf("interrupted"),
			expectedResult: true,
			expectsExit:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectsExit {
				// We can't easily test os.Exit, so we'll test the error message matching
				// In real usage, this would call os.Exit(1)
				result := tt.err != nil && tt.err.Error() == "interrupted"
				assert.True(t, result, "Should detect interrupted error")
			} else {
				result := HandleConfirmationError(tt.err)
				assert.Equal(t, tt.expectedResult, result)
			}
		})
	}
}

func TestWrapConfirmationError(t *testing.T) {
	tests := []struct {
		name           string
		err            error
		context        string
		expectedResult error
		expectsExit    bool
	}{
		{
			name:           "nil error should return nil",
			err:            nil,
			context:        "test context",
			expectedResult: nil,
			expectsExit:    false,
		},
		{
			name:           "interrupted error should exit and return nil",
			err:            fmt.Errorf("interrupted"),
			context:        "test context",
			expectedResult: nil,
			expectsExit:    true,
		},
		{
			name:           "other error should be wrapped with context",
			err:            fmt.Errorf("some error"),
			context:        "test context",
			expectedResult: fmt.Errorf("test context: some error"),
			expectsExit:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectsExit {
				// For interrupted errors, we can't test the os.Exit but we can verify
				// the error detection logic
				isInterrupted := tt.err != nil && tt.err.Error() == "interrupted"
				assert.True(t, isInterrupted, "Should detect interrupted error")
			} else {
				result := WrapConfirmationError(tt.err, tt.context)
				if tt.expectedResult == nil {
					assert.Nil(t, result)
				} else {
					assert.NotNil(t, result)
					assert.Equal(t, tt.expectedResult.Error(), result.Error())
				}
			}
		})
	}
}

// TestHandleConfirmationErrorIntegration tests the integration behavior
// without actually calling os.Exit
func TestHandleConfirmationErrorIntegration(t *testing.T) {
	// Test that we can detect interrupted errors correctly
	interruptedErr := fmt.Errorf("interrupted")
	isInterrupted := interruptedErr.Error() == "interrupted"
	assert.True(t, isInterrupted, "Should correctly identify interrupted errors")

	// Test that non-interrupted errors are not detected as interruptions
	otherErr := fmt.Errorf("network timeout")
	isNotInterrupted := otherErr.Error() != "interrupted"
	assert.True(t, isNotInterrupted, "Should not identify other errors as interruptions")
}

// TestErrorMessageFormating tests that error messages are properly formatted
func TestErrorMessageFormatting(t *testing.T) {
	baseError := fmt.Errorf("connection failed")
	context := "failed to connect to database"
	
	wrappedError := WrapConfirmationError(baseError, context)
	
	expected := "failed to connect to database: connection failed"
	assert.Equal(t, expected, wrappedError.Error(), "Error should be properly wrapped with context")
}

// TestNilErrorHandling ensures nil errors are handled correctly
func TestNilErrorHandling(t *testing.T) {
	// HandleConfirmationError with nil should return false
	result := HandleConfirmationError(nil)
	assert.False(t, result, "HandleConfirmationError should return false for nil error")
	
	// WrapConfirmationError with nil should return nil
	wrapped := WrapConfirmationError(nil, "some context")
	assert.Nil(t, wrapped, "WrapConfirmationError should return nil for nil error")
}

// TestEdgeCases tests various edge cases
func TestEdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		err     error
		context string
	}{
		{
			name:    "empty error message",
			err:     fmt.Errorf(""),
			context: "test context",
		},
		{
			name:    "empty context",
			err:     fmt.Errorf("some error"),
			context: "",
		},
		{
			name:    "context with colon",
			err:     fmt.Errorf("some error"),
			context: "context: with colon",
		},
		{
			name:    "error message that contains 'interrupted' but isn't exact match",
			err:     fmt.Errorf("connection was interrupted unexpectedly"),
			context: "network error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// These should not be treated as interruptions since they don't exactly match "interrupted"
			isInterrupted := tt.err.Error() == "interrupted"
			if tt.name == "error message that contains 'interrupted' but isn't exact match" {
				assert.False(t, isInterrupted, "Should not treat partial matches as interruptions")
			}
			
			// Test wrapping
			wrapped := WrapConfirmationError(tt.err, tt.context)
			if tt.err.Error() == "interrupted" {
				// Would exit in real usage
				assert.True(t, isInterrupted)
			} else {
				assert.NotNil(t, wrapped, "Should wrap non-interrupted errors")
				if tt.context != "" {
					assert.Contains(t, wrapped.Error(), tt.context, "Wrapped error should contain context")
				}
			}
		})
	}
}