package intercept

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewService(t *testing.T) {
	testutil.InitializeTestMode()

	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, true)

	assert.NotNil(t, service)
	assert.Equal(t, mockExecutor, service.executor)
	assert.True(t, service.verbose)
	assert.NotNil(t, service.signalChannel)
	assert.False(t, service.isIntercepting)
}

func TestService_ValidateInputs(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	tests := []struct {
		name          string
		serviceName   string
		flags         *models.InterceptFlags
		expectError   bool
		errorContains string
	}{
		{
			name:          "empty service name",
			serviceName:   "",
			flags:         &models.InterceptFlags{Port: 8080},
			expectError:   true,
			errorContains: "service name cannot be empty",
		},
		{
			name:          "nil flags",
			serviceName:   "test-service",
			flags:         nil,
			expectError:   true,
			errorContains: "flags cannot be nil",
		},
		{
			name:          "invalid port - zero",
			serviceName:   "test-service",
			flags:         &models.InterceptFlags{Port: 0},
			expectError:   true,
			errorContains: "invalid port",
		},
		{
			name:          "invalid port - too high",
			serviceName:   "test-service",
			flags:         &models.InterceptFlags{Port: 70000},
			expectError:   true,
			errorContains: "invalid port",
		},
		{
			name:          "invalid header format",
			serviceName:   "test-service",
			flags:         &models.InterceptFlags{Port: 8080, Header: []string{"invalid-header"}},
			expectError:   true,
			errorContains: "invalid header format",
		},
		{
			name:        "valid inputs",
			serviceName: "test-service",
			flags: &models.InterceptFlags{
				Port:      8080,
				Namespace: "default",
				Header:    []string{"X-Test=value"},
			},
			expectError: false,
		},
		{
			name:        "default namespace assignment",
			serviceName: "test-service",
			flags: &models.InterceptFlags{
				Port: 8080,
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := service.validateInputs(tt.serviceName, tt.flags)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
				// Check that default namespace is set
				if tt.flags != nil && tt.flags.Namespace == "" {
					assert.Equal(t, "default", tt.flags.Namespace)
				}
			}
		})
	}
}

func TestService_ShowInterceptInstructions(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	flags := &models.InterceptFlags{
		Port:      8080,
		Namespace: "default",
	}

	// This should not panic or error
	service.showInterceptInstructions("test-service", flags)
}

func TestService_GettersAndSetters(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	// Test initial state
	assert.False(t, service.IsIntercepting())
	assert.Equal(t, "", service.GetCurrentService())
	assert.Equal(t, "", service.GetCurrentNamespace())
	assert.Equal(t, "", service.GetOriginalNamespace())

	// Set some values
	service.isIntercepting = true
	service.currentService = "test-service"
	service.currentNamespace = "production"
	service.originalNamespace = "default"

	assert.True(t, service.IsIntercepting())
	assert.Equal(t, "test-service", service.GetCurrentService())
	assert.Equal(t, "production", service.GetCurrentNamespace())
	assert.Equal(t, "default", service.GetOriginalNamespace())
}

func TestService_StopIntercept(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	service := NewService(mockExecutor, false)

	tests := []struct {
		name           string
		serviceName    string
		isIntercepting bool
		currentService string
		expectError    bool
		errorContains  string
	}{
		{
			name:           "no active intercept",
			serviceName:    "test-service",
			isIntercepting: false,
			expectError:    true,
			errorContains:  "no active intercept",
		},
		{
			name:           "wrong service name",
			serviceName:    "wrong-service",
			isIntercepting: true,
			currentService: "test-service",
			expectError:    true,
			errorContains:  "active intercept is for service",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service.isIntercepting = tt.isIntercepting
			service.currentService = tt.currentService

			err := service.StopIntercept(tt.serviceName)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
