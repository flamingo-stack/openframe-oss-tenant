package intercept

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestService_GetCurrentNamespace(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	tests := []struct {
		name              string
		setupMocks        func(*executor.MockCommandExecutor)
		expectedNamespace string
		expectError       bool
	}{
		{
			name: "telepresence status returns valid JSON",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("bash", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "production",
				})
			},
			expectedNamespace: "production",
			expectError:       false,
		},
		{
			name: "telepresence status returns empty namespace",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("bash", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "",
				})
			},
			expectedNamespace: "default",
			expectError:       false,
		},
		{
			name: "telepresence status fails - returns default",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("bash", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   "telepresence not connected",
				})
			},
			expectedNamespace: "default",
			expectError:       false,
		},
		{
			name: "bash command returns namespace",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("bash", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "staging",
				})
			},
			expectedNamespace: "staging",
			expectError:       false,
		},
		{
			name: "bash command returns null",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("bash", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "null",
				})
			},
			expectedNamespace: "default",
			expectError:       false,
		},
		{
			name: "bash command fails",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("bash", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   "command failed",
				})
			},
			expectedNamespace: "default",
			expectError:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock state
			mockExecutor.Reset()

			// Setup test-specific mocks
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			namespace, err := service.getCurrentNamespace(context.Background())

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedNamespace, namespace)
			}
		})
	}
}

func TestService_SwitchNamespace(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	tests := []struct {
		name        string
		current     string
		target      string
		setupMocks  func(*executor.MockCommandExecutor)
		expectError bool
	}{
		{
			name:    "successful namespace switch",
			current: "default",
			target:  "production",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:    "quit fails but connect succeeds",
			current: "default",
			target:  "staging",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				// First call to quit fails
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 1})
				// But connect succeeds
				mock.SetResponse("telepresence connect", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false, // Should not error even if quit fails
		},
		{
			name:    "connect fails",
			current: "default",
			target:  "production",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
				mock.SetShouldFail(true, "connection failed")
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock state
			mockExecutor.Reset()

			// Setup test-specific mocks
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			err := service.switchNamespace(context.Background(), tt.current, tt.target)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "failed to connect to namespace")
			} else {
				assert.NoError(t, err)
			}

			// Verify commands were executed in correct order
			commands := mockExecutor.GetExecutedCommands()
			if len(commands) >= 1 {
				assert.Contains(t, commands[0], "telepresence disconnect")
			}
			if len(commands) >= 2 {
				assert.Contains(t, commands[1], "telepresence connect")
				assert.Contains(t, commands[1], tt.target)
			}
		})
	}
}

func TestTelepresenceStatus_JSONParsing(t *testing.T) {
	tests := []struct {
		name        string
		jsonInput   string
		expectValid bool
		expectedNs  string
	}{
		{
			name:        "valid JSON with namespace",
			jsonInput:   `{"user_daemon":{"namespace":"production"}}`,
			expectValid: true,
			expectedNs:  "production",
		},
		{
			name:        "valid JSON with empty namespace",
			jsonInput:   `{"user_daemon":{"namespace":""}}`,
			expectValid: true,
			expectedNs:  "",
		},
		{
			name:        "valid JSON with missing namespace",
			jsonInput:   `{"user_daemon":{}}`,
			expectValid: true,
			expectedNs:  "",
		},
		{
			name:        "valid JSON with missing user_daemon",
			jsonInput:   `{}`,
			expectValid: true,
			expectedNs:  "",
		},
		{
			name:        "invalid JSON",
			jsonInput:   `invalid json`,
			expectValid: false,
			expectedNs:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var status TelepresenceStatus
			err := json.Unmarshal([]byte(tt.jsonInput), &status)

			if tt.expectValid {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedNs, status.UserDaemon.Namespace)
			} else {
				assert.Error(t, err)
			}
		})
	}
}
