package kubectl

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewProvider(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()

	provider := NewProvider(mockExecutor, false)

	assert.NotNil(t, provider)
	assert.Equal(t, mockExecutor, provider.executor)
}

func TestProvider_GetCurrentContext(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name            string
		setupMocks      func(*executor.MockCommandExecutor)
		expectedContext string
		expectError     bool
	}{
		{
			name: "successful context retrieval",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl config current-context", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "k3d-openframe-dev\n",
				})
			},
			expectedContext: "k3d-openframe-dev",
			expectError:     false,
		},
		{
			name: "context with whitespace",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl config current-context", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "  k3d-production  \n",
				})
			},
			expectedContext: "k3d-production",
			expectError:     false,
		},
		{
			name: "no current context",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl config current-context", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   "error: current-context is not set",
				})
			},
			expectedContext: "",
			expectError:     true,
		},
		{
			name: "kubectl command fails",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "kubectl not found")
			},
			expectedContext: "",
			expectError:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			context, err := provider.GetCurrentContext(context.Background())

			if tt.expectError {
				assert.Error(t, err)
				assert.Equal(t, "", context)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedContext, context)
			}
		})
	}
}

func TestProvider_CheckConnection(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name        string
		setupMocks  func(*executor.MockCommandExecutor)
		expectError bool
	}{
		{
			name: "successful connection",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl cluster-info", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "Kubernetes control plane is running at https://127.0.0.1:6443",
				})
			},
			expectError: false,
		},
		{
			name: "connection failed",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl cluster-info", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   "The connection to the server localhost:8080 was refused",
				})
			},
			expectError: true,
		},
		{
			name: "kubectl not available",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "kubectl not found")
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			err := provider.CheckConnection(context.Background())

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestProvider_SetContext(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name        string
		context     string
		setupMocks  func(*executor.MockCommandExecutor)
		expectError bool
	}{
		{
			name:    "successful context switch",
			context: "k3d-openframe-dev",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl config use-context", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "Switched to context \"k3d-openframe-dev\".\n",
				})
			},
			expectError: false,
		},
		{
			name:    "context switch with different cluster",
			context: "k3d-production",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl config use-context", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "Switched to context \"k3d-production\".\n",
				})
			},
			expectError: false,
		},
		{
			name:    "context does not exist",
			context: "nonexistent-cluster",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl config use-context", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   "error: no context exists with the name: \"nonexistent-cluster\"",
				})
			},
			expectError: true,
		},
		{
			name:    "kubectl command fails",
			context: "k3d-test",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "kubectl not available")
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			err := provider.SetContext(context.Background(), tt.context)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the correct command was executed
				commands := mockExecutor.GetExecutedCommands()
				assert.Len(t, commands, 1)
				assert.Contains(t, commands[0], "kubectl config use-context")
				assert.Contains(t, commands[0], tt.context)
			}
		})
	}
}
