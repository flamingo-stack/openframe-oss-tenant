package kubectl

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestProvider_GetServices(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name             string
		namespace        string
		setupMocks       func(*executor.MockCommandExecutor)
		expectedServices []intercept.ServiceInfo
		expectError      bool
	}{
		{
			name:      "successful JSON response with multiple services",
			namespace: "default",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				jsonResponse := `{
  "items": [
    {
      "metadata": {
        "name": "openframe-api"
      },
      "spec": {
        "type": "ClusterIP",
        "ports": [
          {
            "name": "http",
            "port": 8080,
            "protocol": "TCP",
            "targetPort": "8080"
          }
        ]
      }
    },
    {
      "metadata": {
        "name": "openframe-client"
      },
      "spec": {
        "type": "ClusterIP",
        "ports": [
          {
            "name": "api",
            "port": 8081,
            "protocol": "TCP",
            "targetPort": "8081"
          }
        ]
      }
    }
  ]
}`
				mock.SetResponse("kubectl get services", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   jsonResponse,
				})
			},
			expectedServices: []intercept.ServiceInfo{
				{
					Name:      "openframe-api",
					Namespace: "default",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "http", Port: 8080, Protocol: "TCP", TargetPort: "8080"},
					},
				},
				{
					Name:      "openframe-client",
					Namespace: "default",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "api", Port: 8081, Protocol: "TCP", TargetPort: "8081"},
					},
				},
			},
			expectError: false,
		},
		{
			name:      "no services in namespace",
			namespace: "empty",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get services", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   `{"items": []}`,
				})
			},
			expectedServices: []intercept.ServiceInfo{},
			expectError:      false,
		},
		{
			name:      "kubectl command fails",
			namespace: "test",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "connection refused")
			},
			expectedServices: nil,
			expectError:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			services, err := provider.GetServices(context.Background(), tt.namespace)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, services)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, len(tt.expectedServices), len(services))

				for i, expectedService := range tt.expectedServices {
					if i < len(services) {
						assert.Equal(t, expectedService.Name, services[i].Name)
						assert.Equal(t, expectedService.Namespace, services[i].Namespace)
						assert.Equal(t, expectedService.Type, services[i].Type)
						assert.Equal(t, len(expectedService.Ports), len(services[i].Ports))

						for j, expectedPort := range expectedService.Ports {
							if j < len(services[i].Ports) {
								assert.Equal(t, expectedPort.Name, services[i].Ports[j].Name)
								assert.Equal(t, expectedPort.Port, services[i].Ports[j].Port)
								assert.Equal(t, expectedPort.Protocol, services[i].Ports[j].Protocol)
								assert.Equal(t, expectedPort.TargetPort, services[i].Ports[j].TargetPort)
							}
						}
					}
				}
			}
		})
	}
}

func TestProvider_GetService(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name            string
		namespace       string
		serviceName     string
		setupMocks      func(*executor.MockCommandExecutor)
		expectedService *intercept.ServiceInfo
		expectError     bool
	}{
		{
			name:        "service exists with single port",
			namespace:   "default",
			serviceName: "openframe-api",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				jsonResponse := `{
  "metadata": {
    "name": "openframe-api"
  },
  "spec": {
    "type": "ClusterIP",
    "ports": [
      {
        "name": "http",
        "port": 8080,
        "protocol": "TCP",
        "targetPort": "8080"
      }
    ]
  }
}`
				mock.SetResponse("kubectl get service", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   jsonResponse,
				})
			},
			expectedService: &intercept.ServiceInfo{
				Name:      "openframe-api",
				Namespace: "default",
				Type:      "ClusterIP",
				Ports: []intercept.ServicePort{
					{Name: "http", Port: 8080, Protocol: "TCP", TargetPort: "8080"},
				},
			},
			expectError: false,
		},
		{
			name:        "service with multiple ports",
			namespace:   "production",
			serviceName: "complex-service",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				jsonResponse := `{
  "metadata": {
    "name": "complex-service"
  },
  "spec": {
    "type": "NodePort",
    "ports": [
      {
        "name": "http",
        "port": 8080,
        "protocol": "TCP",
        "targetPort": "8080"
      },
      {
        "name": "https",
        "port": 8443,
        "protocol": "TCP",
        "targetPort": "8443"
      },
      {
        "name": "metrics",
        "port": 9090,
        "protocol": "TCP",
        "targetPort": "9090"
      }
    ]
  }
}`
				mock.SetResponse("kubectl get service", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   jsonResponse,
				})
			},
			expectedService: &intercept.ServiceInfo{
				Name:      "complex-service",
				Namespace: "production",
				Type:      "NodePort",
				Ports: []intercept.ServicePort{
					{Name: "http", Port: 8080, Protocol: "TCP", TargetPort: "8080"},
					{Name: "https", Port: 8443, Protocol: "TCP", TargetPort: "8443"},
					{Name: "metrics", Port: 9090, Protocol: "TCP", TargetPort: "9090"},
				},
			},
			expectError: false,
		},
		{
			name:        "service does not exist",
			namespace:   "default",
			serviceName: "nonexistent",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get service", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   `Error from server (NotFound): services "nonexistent" not found`,
				})
			},
			expectedService: nil,
			expectError:     true,
		},
		{
			name:        "kubectl command fails",
			namespace:   "test",
			serviceName: "test-service",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "connection refused")
			},
			expectedService: nil,
			expectError:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExecutor.Reset()
			if tt.setupMocks != nil {
				tt.setupMocks(mockExecutor)
			}

			service, err := provider.GetService(context.Background(), tt.namespace, tt.serviceName)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, service)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, service)

				assert.Equal(t, tt.expectedService.Name, service.Name)
				assert.Equal(t, tt.expectedService.Namespace, service.Namespace)
				assert.Equal(t, tt.expectedService.Type, service.Type)
				assert.Equal(t, len(tt.expectedService.Ports), len(service.Ports))

				for i, expectedPort := range tt.expectedService.Ports {
					if i < len(service.Ports) {
						assert.Equal(t, expectedPort.Name, service.Ports[i].Name)
						assert.Equal(t, expectedPort.Port, service.Ports[i].Port)
						assert.Equal(t, expectedPort.Protocol, service.Ports[i].Protocol)
						assert.Equal(t, expectedPort.TargetPort, service.Ports[i].TargetPort)
					}
				}
			}
		})
	}
}

func TestProvider_ValidateService(t *testing.T) {
	testutil.InitializeTestMode()
	mockExecutor := testutil.NewTestMockExecutor()
	provider := NewProvider(mockExecutor, false)

	tests := []struct {
		name        string
		namespace   string
		serviceName string
		setupMocks  func(*executor.MockCommandExecutor)
		expectError bool
	}{
		{
			name:        "service exists",
			namespace:   "default",
			serviceName: "existing-service",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get service", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "NAME              TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE\nexisting-service  ClusterIP   10.43.0.100     <none>        8080/TCP   1d",
				})
			},
			expectError: false,
		},
		{
			name:        "service does not exist",
			namespace:   "default",
			serviceName: "nonexistent-service",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetResponse("kubectl get service", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   `Error from server (NotFound): services "nonexistent-service" not found`,
				})
			},
			expectError: true,
		},
		{
			name:        "kubectl command fails with connection error",
			namespace:   "test",
			serviceName: "test-service",
			setupMocks: func(mock *executor.MockCommandExecutor) {
				mock.SetShouldFail(true, "connection refused")
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

			err := provider.ValidateService(context.Background(), tt.namespace, tt.serviceName)

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "not found")
			} else {
				assert.NoError(t, err)

				// Verify the correct command was executed
				commands := mockExecutor.GetExecutedCommands()
				assert.Len(t, commands, 1)
				assert.Contains(t, commands[0], "kubectl get service")
				assert.Contains(t, commands[0], tt.serviceName)
				assert.Contains(t, commands[0], "-n")
				assert.Contains(t, commands[0], tt.namespace)
			}
		})
	}
}
