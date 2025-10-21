package kubectl

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestProvider_GetNamespaces(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name               string
		setupMocks         func(*executor.MockCommandExecutor)
		expectedNamespaces []string
		expectError        bool
	}{
		{
			name: "multiple namespaces",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespaces", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "client-tools default kube-node-lease kube-public kube-system openframe production",
				})
			},
			expectedNamespaces: []string{"client-tools", "default", "kube-node-lease", "kube-public", "kube-system", "openframe", "production"},
			expectError:        false,
		},
		{
			name: "single namespace",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespaces", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "default",
				})
			},
			expectedNamespaces: []string{"default"},
			expectError:        false,
		},
		{
			name: "no namespaces (empty cluster)",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespaces", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "",
				})
			},
			expectedNamespaces: []string{},
			expectError:        false,
		},
		{
			name: "kubectl command fails",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "connection refused")
			},
			expectedNamespaces: nil,
			expectError:        true,
		},
		{
			name: "malformed output",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespaces", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "malformed output without headers",
				})
			},
			expectedNamespaces: []string{"malformed", "output", "without", "headers"},
			expectError:        false,
		},
		{
			name: "namespaces with extra whitespace",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespaces", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "  client-tools   default    kube-system  ",
				})
			},
			expectedNamespaces: []string{"client-tools", "default", "kube-system"},
			expectError:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			namespaces, err := provider.GetNamespaces(context.Background())

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, namespaces)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedNamespaces, namespaces)
			}
		})
	}
}

func TestProvider_ValidateNamespace(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name        string
		namespace   string
		setupMocks  func(*executor.MockCommandExecutor)
		expectError bool
	}{
		{
			name:      "namespace exists",
			namespace: "openframe",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespace", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "NAME        STATUS   AGE\nopenframe   Active   1d5h",
				})
			},
			expectError: false,
		},
		{
			name:      "namespace does not exist",
			namespace: "nonexistent",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespace", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   `Error from server (NotFound): namespaces "nonexistent" not found`,
				})
			},
			expectError: true,
		},
		{
			name:      "kubectl command fails with connection error",
			namespace: "test",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "connection refused")
			},
			expectError: true,
		},
		{
			name:      "default namespace exists",
			namespace: "default",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespace", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "NAME      STATUS   AGE\ndefault   Active   3d2h",
				})
			},
			expectError: false,
		},
		{
			name:      "system namespace exists",
			namespace: "kube-system",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get namespace", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "NAME          STATUS   AGE\nkube-system   Active   3d2h",
				})
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			err := provider.ValidateNamespace(context.Background(), tt.namespace)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				// Verify the correct command was executed
				commands := mockExecutor.GetExecutedCommands()
				assert.Len(t, commands, 1)
				assert.Contains(t, commands[0], "kubectl get namespace")
				assert.Contains(t, commands[0], tt.namespace)
			}
		})
	}
}
