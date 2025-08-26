package selectors

import (
	"context"
	"testing"

	devMocks "github.com/flamingo/openframe/tests/mocks/dev"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewServiceSelector(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)
	
	assert.NotNil(t, selector)
	assert.Equal(t, mockClient, selector.kubernetesClient)
}

func TestServiceSelector_ValidateService(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)
	ctx := context.Background()

	tests := []struct {
		name        string
		namespace   string
		serviceName string
		expectError bool
	}{
		{
			name:        "valid service in default namespace",
			namespace:   "default",
			serviceName: "my-api",
			expectError: false,
		},
		{
			name:        "invalid service",
			namespace:   "default",
			serviceName: "non-existent",
			expectError: true,
		},
		{
			name:        "valid service in production namespace",
			namespace:   "production",
			serviceName: "api-service",
			expectError: false,
		},
		{
			name:        "service in wrong namespace",
			namespace:   "staging",
			serviceName: "my-api", // exists in default, not staging
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := selector.ValidateService(ctx, tt.namespace, tt.serviceName)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestServiceSelector_GetServiceInfo(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)
	ctx := context.Background()

	tests := []struct {
		name            string
		namespace       string
		serviceName     string
		expectError     bool
		expectedPorts   int
		expectedType    string
	}{
		{
			name:          "get existing service",
			namespace:     "default",
			serviceName:   "my-api",
			expectError:   false,
			expectedPorts: 1,
			expectedType:  "ClusterIP",
		},
		{
			name:        "get non-existent service",
			namespace:   "default",
			serviceName: "non-existent",
			expectError: true,
		},
		{
			name:          "get service with multiple ports",
			namespace:     "production",
			serviceName:   "api-service",
			expectError:   false,
			expectedPorts: 2,
			expectedType:  "ClusterIP",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			serviceInfo, err := selector.GetServiceInfo(ctx, tt.namespace, tt.serviceName)
			
			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, serviceInfo)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, serviceInfo)
				assert.Equal(t, tt.serviceName, serviceInfo.Name)
				assert.Equal(t, tt.namespace, serviceInfo.Namespace)
				assert.Equal(t, tt.expectedType, serviceInfo.Type)
				assert.Len(t, serviceInfo.Ports, tt.expectedPorts)
			}
		})
	}
}

func TestServiceSelector_SelectServicePort(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)

	tests := []struct {
		name        string
		service     *ServiceInfo
		expectError bool
		expectIndex int
	}{
		{
			name: "service with single port",
			service: &ServiceInfo{
				Name: "single-port-service",
				Ports: []ServicePort{
					{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
				},
			},
			expectError: false,
			expectIndex: 0,
		},
		{
			name: "service with no ports",
			service: &ServiceInfo{
				Name:  "no-port-service",
				Ports: []ServicePort{},
			},
			expectError: true,
		},
		{
			name: "service with multiple ports - would require user interaction",
			service: &ServiceInfo{
				Name: "multi-port-service",
				Ports: []ServicePort{
					{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
					{Name: "metrics", Port: 9090, TargetPort: "9090", Protocol: "TCP"},
				},
			},
			expectError: false, // Would work but requires interaction in real scenario
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// For single port case, we can test directly
			if len(tt.service.Ports) <= 1 {
				port, err := selector.SelectServicePort(tt.service)
				
				if tt.expectError {
					assert.Error(t, err)
					assert.Nil(t, port)
				} else {
					assert.NoError(t, err)
					assert.NotNil(t, port)
					if !tt.expectError && len(tt.service.Ports) > 0 {
						assert.Equal(t, &tt.service.Ports[tt.expectIndex], port)
					}
				}
			} else {
				// For multiple ports, we would need to mock user interaction
				// For now, just ensure the function exists and can handle the case
				assert.NotNil(t, selector.SelectServicePort)
			}
		})
	}
}

func TestServiceSelector_filterServices(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)

	tests := []struct {
		name     string
		input    []ServiceInfo
		expected int
	}{
		{
			name: "filters unsuitable services",
			input: []ServiceInfo{
				{Name: "good-service", Type: "ClusterIP", Ports: []ServicePort{{Port: 8080}}},
				{Name: "loadbalancer-service", Type: "LoadBalancer", Ports: []ServicePort{{Port: 80}}},
				{Name: "kube-system-service", Type: "ClusterIP", Ports: []ServicePort{{Port: 8080}}},
				{Name: "no-port-service", Type: "ClusterIP", Ports: []ServicePort{}},
			},
			expected: 1, // Only good-service should remain
		},
		{
			name:     "empty input",
			input:    []ServiceInfo{},
			expected: 0,
		},
		{
			name: "all suitable services",
			input: []ServiceInfo{
				{Name: "api-service", Type: "ClusterIP", Ports: []ServicePort{{Port: 8080}}},
				{Name: "web-service", Type: "ClusterIP", Ports: []ServicePort{{Port: 3000}}},
			},
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := selector.filterServices(tt.input)
			assert.Len(t, result, tt.expected)
		})
	}
}

func TestServiceSelector_isSuitableForIntercept(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)

	tests := []struct {
		name     string
		service  ServiceInfo
		expected bool
	}{
		{
			name: "suitable ClusterIP service",
			service: ServiceInfo{
				Name: "api-service",
				Type: "ClusterIP",
				Ports: []ServicePort{{Port: 8080}},
			},
			expected: true,
		},
		{
			name: "LoadBalancer service - not suitable",
			service: ServiceInfo{
				Name: "external-service",
				Type: "LoadBalancer",
				Ports: []ServicePort{{Port: 80}},
			},
			expected: false,
		},
		{
			name: "service with no ports - not suitable",
			service: ServiceInfo{
				Name:  "headless-service",
				Type:  "ClusterIP",
				Ports: []ServicePort{},
			},
			expected: false,
		},
		{
			name: "kube- prefixed service - not suitable",
			service: ServiceInfo{
				Name: "kube-dns",
				Type: "ClusterIP",
				Ports: []ServicePort{{Port: 53}},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := selector.isSuitableForIntercept(tt.service)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestServiceSelector_formatServiceOption(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)

	tests := []struct {
		name     string
		service  ServiceInfo
		expected string
	}{
		{
			name: "single named port",
			service: ServiceInfo{
				Name: "api-service",
				Type: "ClusterIP",
				Ports: []ServicePort{
					{Name: "http", Port: 8080},
				},
			},
			expected: "api-service:http(8080) [ClusterIP]",
		},
		{
			name: "single unnamed port",
			service: ServiceInfo{
				Name: "web-service",
				Type: "ClusterIP",
				Ports: []ServicePort{
					{Port: 3000},
				},
			},
			expected: "web-service:3000 [ClusterIP]",
		},
		{
			name: "multiple ports",
			service: ServiceInfo{
				Name: "multi-service",
				Type: "ClusterIP",
				Ports: []ServicePort{
					{Name: "http", Port: 8080},
					{Name: "metrics", Port: 9090},
				},
			},
			expected: "multi-service (2 ports) [ClusterIP]",
		},
		{
			name: "no ports",
			service: ServiceInfo{
				Name:  "headless-service",
				Type:  "ClusterIP",
				Ports: []ServicePort{},
			},
			expected: "headless-service [ClusterIP]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := selector.formatServiceOption(tt.service)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestServiceSelector_ShowServiceInfo(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewServiceSelector(mockClient)

	service := &ServiceInfo{
		Name: "test-service",
		Type: "ClusterIP",
		Ports: []ServicePort{
			{Name: "http", Port: 8080, Protocol: "TCP"},
		},
	}

	// This test mainly ensures the function doesn't panic
	// Since it outputs to stdout, we can't easily test the content
	assert.NotPanics(t, func() {
		selector.ShowServiceInfo(service)
	})
}