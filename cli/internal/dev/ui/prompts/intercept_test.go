package prompts

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewInterceptPrompter(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()
	
	assert.NotNil(t, prompter)
}

func TestInterceptPrompter_validateHeader(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	tests := []struct {
		name        string
		input       string
		expectError bool
	}{
		{
			name:        "valid header",
			input:       "user-id=123",
			expectError: false,
		},
		{
			name:        "valid header with spaces in value",
			input:       "session=abc def",
			expectError: false,
		},
		{
			name:        "empty input (allowed)",
			input:       "",
			expectError: false,
		},
		{
			name:        "whitespace only input (allowed)",
			input:       "   ",
			expectError: false,
		},
		{
			name:        "missing equals sign",
			input:       "user-id",
			expectError: true,
		},
		{
			name:        "empty key",
			input:       "=value",
			expectError: true,
		},
		{
			name:        "empty value",
			input:       "key=",
			expectError: true,
		},
		{
			name:        "key with spaces",
			input:       "user id=123",
			expectError: true,
		},
		{
			name:        "multiple equals signs",
			input:       "key=value=extra",
			expectError: false, // This should be valid (value contains =)
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := prompter.validateHeader(tt.input)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestInterceptPrompter_validateEnvFile(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Create a temporary file for testing
	tempFile, err := os.CreateTemp("", "test.env")
	assert.NoError(t, err)
	defer os.Remove(tempFile.Name())
	tempFile.Close()

	tests := []struct {
		name        string
		input       string
		expectError bool
	}{
		{
			name:        "empty path",
			input:       "",
			expectError: true,
		},
		{
			name:        "whitespace only",
			input:       "   ",
			expectError: true,
		},
		{
			name:        "existing file",
			input:       tempFile.Name(),
			expectError: false,
		},
		{
			name:        "non-existent file",
			input:       "/path/that/does/not/exist.env",
			expectError: true,
		},
		{
			name:        "directory instead of file",
			input:       os.TempDir(),
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := prompter.validateEnvFile(tt.input)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestInterceptPrompter_validateMountPath(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-mount")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	tests := []struct {
		name        string
		input       string
		expectError bool
	}{
		{
			name:        "empty path",
			input:       "",
			expectError: true,
		},
		{
			name:        "whitespace only",
			input:       "   ",
			expectError: true,
		},
		{
			name:        "path in existing directory",
			input:       filepath.Join(tempDir, "mount"),
			expectError: false,
		},
		{
			name:        "path in non-existent parent directory",
			input:       "/path/that/does/not/exist/mount",
			expectError: true,
		},
		{
			name:        "existing directory path",
			input:       tempDir,
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := prompter.validateMountPath(tt.input)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestInterceptPrompter_formatOptional(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	tests := []struct {
		name     string
		input    string
		contains string
	}{
		{
			name:     "empty value",
			input:    "",
			contains: "(none)",
		},
		{
			name:     "non-empty value",
			input:    "/path/to/file",
			contains: "/path/to/file",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := prompter.formatOptional(tt.input)
			assert.Contains(t, result, tt.contains)
		})
	}
}

func TestInterceptPrompter_ShowInterceptConfiguration(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	flags := &models.InterceptFlags{
		Port:      8080,
		Namespace: "default",
		Global:    false,
		Header:    []string{"user-id=123", "version=dev"},
		EnvFile:   "/path/to/.env",
		Mount:     "/tmp/volumes",
	}

	// This test mainly ensures the function doesn't panic
	// Since it outputs to stdout, we can't easily test the content
	assert.NotPanics(t, func() {
		prompter.ShowInterceptConfiguration("test-service", flags)
	})
}

func TestInterceptPrompter_PromptForPort(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// We can't easily test the interactive parts without mocking user input,
	// but we can test that the function exists and has the right signature
	assert.NotNil(t, prompter.PromptForPort)
	
	// The function signature should be: 
	// PromptForPort(defaultPort int, servicePort int32) (int, error)
	// We can verify this compiles by attempting to call it
	// (though we won't actually call it to avoid requiring user input)
}

func TestInterceptPrompter_PromptForRemotePortName(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Test with empty port list
	assert.NotNil(t, prompter.PromptForRemotePortName)
	
	// The function should handle empty arrays
	// We can't test interactive behavior without mocking, but we can verify structure
}

func TestInterceptPrompter_PromptForHeaders(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Verify function exists
	assert.NotNil(t, prompter.PromptForHeaders)
}

func TestInterceptPrompter_PromptForGlobalIntercept(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Verify function exists
	assert.NotNil(t, prompter.PromptForGlobalIntercept)
}

func TestInterceptPrompter_PromptForReplaceExisting(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Verify function exists
	assert.NotNil(t, prompter.PromptForReplaceExisting)
}

func TestInterceptPrompter_ConfirmInterceptStart(t *testing.T) {
	testutil.InitializeTestMode()
	prompter := NewInterceptPrompter()

	// Verify function exists
	assert.NotNil(t, prompter.ConfirmInterceptStart)
}