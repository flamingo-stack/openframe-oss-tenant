package intercept

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestService_CreateIntercept(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	tests := []struct {
		name        string
		serviceName string
		flags       *models.InterceptFlags
		setupMocks  func(*executor.MockCommandExecutor)
		expectError bool
	}{
		{
			name:        "basic intercept",
			serviceName: "my-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:        "intercept with custom remote port name",
			serviceName: "api-service",
			flags: &models.InterceptFlags{
				Port:           9000,
				Namespace:      "production",
				RemotePortName: "http",
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:        "intercept with env file",
			serviceName: "config-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
				EnvFile:   "/tmp/test.env",
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:        "global intercept",
			serviceName: "global-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
				Global:    true,
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:        "intercept with headers",
			serviceName: "header-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
				Header:    []string{"X-Test=value1", "X-User=admin"},
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:        "replace existing intercept",
			serviceName: "replace-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
				Replace:   true,
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})
			},
			expectError: false,
		},
		{
			name:        "intercept command fails",
			serviceName: "fail-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
			},
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "intercept failed")
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

			err := service.createIntercept(context.Background(), tt.serviceName, tt.flags)

			if tt.expectError {
				assert.Error(t, err)
				// Error could be from telepresence connection or intercept creation
				assert.True(t,
					strings.Contains(err.Error(), "failed to create intercept") ||
						strings.Contains(err.Error(), "failed to ensure telepresence connection"),
					"Error should contain either 'failed to create intercept' or 'failed to ensure telepresence connection', got: %s", err.Error())
			} else {
				assert.NoError(t, err)
			}

			// Verify command structure for successful cases
			if !tt.expectError {
				commands := mockExecutor.GetExecutedCommands()
				assert.Len(t, commands, 1) // just intercept command now

				// Find the intercept command
				var interceptCmd string
				for _, cmd := range commands {
					if strings.Contains(cmd, "telepresence intercept") {
						interceptCmd = cmd
						break
					}
				}
				assert.NotEmpty(t, interceptCmd, "intercept command should exist")
				assert.Contains(t, interceptCmd, tt.serviceName)
				assert.Contains(t, interceptCmd, "--mount=false")

				// Check port mapping format
				expectedPortMapping := service.getRemotePortName(tt.flags)
				portArg := fmt.Sprintf("%d:%s", tt.flags.Port, expectedPortMapping)
				assert.Contains(t, interceptCmd, portArg)

				// Check optional flags
				if tt.flags.EnvFile != "" {
					assert.Contains(t, interceptCmd, "--env-file")
					assert.Contains(t, interceptCmd, tt.flags.EnvFile)
				}
				if tt.flags.Global {
					assert.Contains(t, interceptCmd, "--global")
				}
				if tt.flags.Replace {
					assert.Contains(t, interceptCmd, "--replace")
				}
				for _, header := range tt.flags.Header {
					assert.Contains(t, interceptCmd, "--http-header")
					assert.Contains(t, interceptCmd, header)
				}
			}
		})
	}
}

func TestService_GetRemotePortName(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	tests := []struct {
		name         string
		flags        *models.InterceptFlags
		expectedPort string
	}{
		{
			name: "custom remote port name provided",
			flags: &models.InterceptFlags{
				Port:           8080,
				RemotePortName: "http",
			},
			expectedPort: "http",
		},
		{
			name: "no remote port name - use port number",
			flags: &models.InterceptFlags{
				Port:           9000,
				RemotePortName: "",
			},
			expectedPort: "9000",
		},
		{
			name: "different port with custom name",
			flags: &models.InterceptFlags{
				Port:           3000,
				RemotePortName: "web",
			},
			expectedPort: "web",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getRemotePortName(tt.flags)
			assert.Equal(t, tt.expectedPort, result)
		})
	}
}

func TestIntercept_CommandConstruction(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	// Test with all flags enabled to verify command construction
	flags := &models.InterceptFlags{
		Port:           8080,
		Namespace:      "production",
		RemotePortName: "http",
		EnvFile:        "/tmp/test.env",
		Global:         true,
		Header:         []string{"X-Test=value", "X-User=admin"},
		Replace:        true,
	}

	mockExecutor.SetResponse("telepresence intercept", &executor.CommandResult{ExitCode: 0})

	err := service.createIntercept(context.Background(), "test-service", flags)
	assert.NoError(t, err)

	commands := mockExecutor.GetExecutedCommands()
	// Find the intercept command (there will be status check commands too)
	var cmd string
	for _, c := range commands {
		if strings.Contains(c, "telepresence intercept") {
			cmd = c
			break
		}
	}
	assert.NotEmpty(t, cmd, "intercept command should exist")

	// Verify all expected arguments are present
	expectedArgs := []string{
		"telepresence intercept test-service",
		"--port 8080:http",
		"--mount=false",
		"--env-file /tmp/test.env",
		"--global",
		"--http-header X-Test=value",
		"--http-header X-User=admin",
		"--replace",
	}

	for _, expectedArg := range expectedArgs {
		assert.Contains(t, cmd, expectedArg, "Command should contain: %s", expectedArg)
	}
}
