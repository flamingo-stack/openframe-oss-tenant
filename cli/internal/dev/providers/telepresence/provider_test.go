package telepresence

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewProvider(t *testing.T) {
	testutil.InitializeTestMode()

	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, true)

	assert.NotNil(t, provider)
	assert.Equal(t, mockExecutor, provider.executor)
	assert.True(t, provider.verbose)
}

func TestProvider_CheckTelepresenceInstallation(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, true)

	tests := []struct {
		name          string
		mockResult    *executor.CommandResult
		shouldFail    bool
		expectError   bool
		errorContains string
	}{
		{
			name: "telepresence installed",
			mockResult: &executor.CommandResult{
				ExitCode: 0,
				Stdout:   "Telepresence 2.19.1",
			},
			expectError: false,
		},
		{
			name:          "telepresence not installed",
			shouldFail:    true,
			expectError:   true,
			errorContains: "Telepresence is not installed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.mockResult != nil {
				mockExecutor.SetResponse("telepresence version", tt.mockResult)
			}
			if tt.shouldFail {
				mockExecutor.SetShouldFail(true, "command not found")
			}

			err := provider.checkTelepresenceInstallation(context.Background())

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}

			// Reset mock state for next test
			mockExecutor.SetShouldFail(false, "")
		})
	}
}

func TestProvider_ConnectToCluster(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name          string
		mockResult    *executor.CommandResult
		shouldFail    bool
		expectError   bool
		errorContains string
	}{
		{
			name: "successful connection",
			mockResult: &executor.CommandResult{
				ExitCode: 0,
				Stdout:   "Connected to cluster",
			},
			expectError: false,
		},
		{
			name:          "connection failed",
			shouldFail:    true,
			expectError:   true,
			errorContains: "failed to connect to Kubernetes cluster",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.mockResult != nil {
				mockExecutor.SetResponse("telepresence connect", tt.mockResult)
			}
			if tt.shouldFail {
				mockExecutor.SetShouldFail(true, "connection failed")
			}

			err := provider.connectToCluster(context.Background())

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}

			// Reset mock state for next test
			mockExecutor.SetShouldFail(false, "")
		})
	}
}

func TestProvider_CreateIntercept(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name        string
		serviceName string
		flags       *models.InterceptFlags
		mockResult  *executor.CommandResult
		shouldFail  bool
		expectError bool
	}{
		{
			name:        "basic intercept",
			serviceName: "my-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
			},
			mockResult: &executor.CommandResult{
				ExitCode: 0,
				Stdout:   "Intercept created",
			},
			expectError: false,
		},
		{
			name:        "intercept with custom namespace",
			serviceName: "api-service",
			flags: &models.InterceptFlags{
				Port:      9000,
				Namespace: "production",
			},
			mockResult: &executor.CommandResult{
				ExitCode: 0,
				Stdout:   "Intercept created",
			},
			expectError: false,
		},
		{
			name:        "intercept command fails",
			serviceName: "fail-service",
			flags: &models.InterceptFlags{
				Port: 8080,
			},
			shouldFail:  true,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.mockResult != nil {
				mockExecutor.SetResponse("telepresence intercept", tt.mockResult)
			}
			if tt.shouldFail {
				mockExecutor.SetShouldFail(true, "intercept failed")
			}

			err := provider.createIntercept(context.Background(), tt.serviceName, tt.flags)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}

			// Reset mock state for next test
			mockExecutor.SetShouldFail(false, "")
		})
	}
}

func TestProvider_CreateInterceptWithEnvFile(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	t.Run("intercept with valid env file", func(t *testing.T) {
		// Create temporary env file
		tmpDir := t.TempDir()
		envFile := filepath.Join(tmpDir, ".env")
		err := os.WriteFile(envFile, []byte("TEST=value"), 0644)
		assert.NoError(t, err)

		flags := &models.InterceptFlags{
			Port:    8080,
			EnvFile: envFile,
		}

		mockExecutor.SetResponse("telepresence intercept", &executor.CommandResult{
			ExitCode: 0,
			Stdout:   "Intercept created",
		})

		err = provider.createIntercept(context.Background(), "test-service", flags)
		assert.NoError(t, err)
	})

	t.Run("intercept with non-existent env file", func(t *testing.T) {
		flags := &models.InterceptFlags{
			Port:    8080,
			EnvFile: "/non/existent/file.env",
		}

		err := provider.createIntercept(context.Background(), "test-service", flags)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "environment file not found")
	})
}

func TestProvider_TeardownIntercept(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name        string
		serviceName string
		namespace   string
		shouldFail  bool
	}{
		{
			name:        "successful teardown",
			serviceName: "my-service",
			namespace:   "default",
		},
		{
			name:        "teardown with error (should not fail)",
			serviceName: "my-service",
			namespace:   "default",
			shouldFail:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.shouldFail {
				mockExecutor.SetShouldFail(true, "unintercept failed")
			} else {
				mockExecutor.SetResponse("telepresence unintercept", &executor.CommandResult{ExitCode: 0})
			}

			err := provider.TeardownIntercept(tt.serviceName, tt.namespace)
			assert.NoError(t, err) // Teardown should never fail the operation

			// Reset mock state
			mockExecutor.SetShouldFail(false, "")
		})
	}
}

func TestProvider_Disconnect(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name          string
		shouldFail    bool
		expectError   bool
		errorContains string
	}{
		{
			name:        "successful disconnect",
			expectError: false,
		},
		{
			name:          "disconnect failed",
			shouldFail:    true,
			expectError:   true,
			errorContains: "failed to disconnect from Telepresence",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.shouldFail {
				mockExecutor.SetShouldFail(true, "quit failed")
			} else {
				mockExecutor.SetResponse("telepresence quit", &executor.CommandResult{ExitCode: 0})
			}

			err := provider.Disconnect()

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}

			// Reset mock state
			mockExecutor.SetShouldFail(false, "")
		})
	}
}

func TestProvider_ShowInterceptStatus(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, true)

	tests := []struct {
		name        string
		serviceName string
		mockResult  *executor.CommandResult
		shouldFail  bool
	}{
		{
			name:        "status retrieved successfully",
			serviceName: "my-service",
			mockResult: &executor.CommandResult{
				ExitCode: 0,
				Stdout:   "my-service: intercepted",
			},
		},
		{
			name:        "status command fails (should not fail operation)",
			serviceName: "my-service",
			shouldFail:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.mockResult != nil {
				mockExecutor.SetResponse("telepresence list", tt.mockResult)
			}
			if tt.shouldFail {
				mockExecutor.SetShouldFail(true, "list failed")
			}

			err := provider.showInterceptStatus(context.Background(), tt.serviceName)
			assert.NoError(t, err) // Status display should never fail the operation

			// Reset mock state
			mockExecutor.SetShouldFail(false, "")
		})
	}
}

func TestProvider_SetupIntercept_Integration(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	// Set up all the mock responses that SetupIntercept needs
	mockExecutor.SetResponse("telepresence version", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "Telepresence 2.19.1",
	})
	mockExecutor.SetResponse("telepresence connect", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "Connected",
	})
	mockExecutor.SetResponse("telepresence intercept", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "Intercept created",
	})
	mockExecutor.SetResponse("telepresence list", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "test-service: intercepted",
	})

	flags := &models.InterceptFlags{
		Port:      8080,
		Namespace: "default",
	}

	err := provider.SetupIntercept("test-service", flags)
	assert.NoError(t, err)
}

func TestProvider_VerboseLogging(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()

	// Test verbose provider
	verboseProvider := NewProvider(mockExecutor, true)
	assert.True(t, verboseProvider.verbose)

	// Test non-verbose provider
	nonVerboseProvider := NewProvider(mockExecutor, false)
	assert.False(t, nonVerboseProvider.verbose)
}
