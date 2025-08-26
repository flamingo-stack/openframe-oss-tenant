package kubernetes

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockKubernetesClient is a mock implementation of KubernetesClient
type MockKubernetesClient struct {
	mock.Mock
}

func (m *MockKubernetesClient) GetNamespaces(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockKubernetesClient) ValidateNamespace(ctx context.Context, namespace string) error {
	args := m.Called(ctx, namespace)
	return args.Error(0)
}

// MockServiceClient is a mock implementation of ServiceClient
type MockServiceClient struct {
	mock.Mock
}

func (m *MockServiceClient) GetServices(ctx context.Context, namespace string) ([]ServiceInfo, error) {
	args := m.Called(ctx, namespace)
	return args.Get(0).([]ServiceInfo), args.Error(1)
}

func (m *MockServiceClient) GetService(ctx context.Context, namespace, serviceName string) (*ServiceInfo, error) {
	args := m.Called(ctx, namespace, serviceName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*ServiceInfo), args.Error(1)
}

func (m *MockServiceClient) ValidateService(ctx context.Context, namespace, serviceName string) error {
	args := m.Called(ctx, namespace, serviceName)
	return args.Error(0)
}

// Test ServicePort struct
func TestServicePort_Structure(t *testing.T) {
	port := ServicePort{
		Name:       "http",
		Port:       8080,
		TargetPort: "8080",
		Protocol:   "TCP",
	}

	assert.Equal(t, "http", port.Name)
	assert.Equal(t, int32(8080), port.Port)
	assert.Equal(t, "8080", port.TargetPort)
	assert.Equal(t, "TCP", port.Protocol)
}

// Test ServiceInfo struct
func TestServiceInfo_Structure(t *testing.T) {
	serviceInfo := ServiceInfo{
		Name:      "test-service",
		Namespace: "default",
		Type:      "ClusterIP",
		Ports: []ServicePort{
			{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
			{Name: "metrics", Port: 9090, TargetPort: "9090", Protocol: "TCP"},
		},
	}

	assert.Equal(t, "test-service", serviceInfo.Name)
	assert.Equal(t, "default", serviceInfo.Namespace)
	assert.Equal(t, "ClusterIP", serviceInfo.Type)
	assert.Len(t, serviceInfo.Ports, 2)
	
	// Verify first port
	assert.Equal(t, "http", serviceInfo.Ports[0].Name)
	assert.Equal(t, int32(8080), serviceInfo.Ports[0].Port)
	
	// Verify second port
	assert.Equal(t, "metrics", serviceInfo.Ports[1].Name)
	assert.Equal(t, int32(9090), serviceInfo.Ports[1].Port)
}

// Test KubernetesClient interface
func TestKubernetesClient_GetNamespaces(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockKubernetesClient)
	
	expectedNamespaces := []string{"default", "kube-system", "production"}
	mockClient.On("GetNamespaces", ctx).Return(expectedNamespaces, nil)

	namespaces, err := mockClient.GetNamespaces(ctx)
	
	assert.NoError(t, err)
	assert.Equal(t, expectedNamespaces, namespaces)
	mockClient.AssertExpectations(t)
}

func TestKubernetesClient_ValidateNamespace_Success(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockKubernetesClient)
	
	mockClient.On("ValidateNamespace", ctx, "default").Return(nil)

	err := mockClient.ValidateNamespace(ctx, "default")
	
	assert.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestKubernetesClient_ValidateNamespace_NotFound(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockKubernetesClient)
	
	mockClient.On("ValidateNamespace", ctx, "nonexistent").Return(assert.AnError)

	err := mockClient.ValidateNamespace(ctx, "nonexistent")
	
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// Test ServiceClient interface
func TestServiceClient_GetServices(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockServiceClient)
	
	expectedServices := []ServiceInfo{
		{
			Name:      "web-service",
			Namespace: "default",
			Type:      "ClusterIP",
			Ports: []ServicePort{
				{Name: "http", Port: 80, TargetPort: "3000", Protocol: "TCP"},
			},
		},
		{
			Name:      "api-service",
			Namespace: "default",
			Type:      "ClusterIP",
			Ports: []ServicePort{
				{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
			},
		},
	}
	
	mockClient.On("GetServices", ctx, "default").Return(expectedServices, nil)

	services, err := mockClient.GetServices(ctx, "default")
	
	assert.NoError(t, err)
	assert.Len(t, services, 2)
	assert.Equal(t, "web-service", services[0].Name)
	assert.Equal(t, "api-service", services[1].Name)
	mockClient.AssertExpectations(t)
}

func TestServiceClient_GetService_Success(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockServiceClient)
	
	expectedService := &ServiceInfo{
		Name:      "test-service",
		Namespace: "default",
		Type:      "ClusterIP",
		Ports: []ServicePort{
			{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
		},
	}
	
	mockClient.On("GetService", ctx, "default", "test-service").Return(expectedService, nil)

	service, err := mockClient.GetService(ctx, "default", "test-service")
	
	assert.NoError(t, err)
	assert.NotNil(t, service)
	assert.Equal(t, "test-service", service.Name)
	assert.Equal(t, "default", service.Namespace)
	assert.Len(t, service.Ports, 1)
	mockClient.AssertExpectations(t)
}

func TestServiceClient_GetService_NotFound(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockServiceClient)
	
	mockClient.On("GetService", ctx, "default", "nonexistent-service").Return(nil, assert.AnError)

	service, err := mockClient.GetService(ctx, "default", "nonexistent-service")
	
	assert.Error(t, err)
	assert.Nil(t, service)
	mockClient.AssertExpectations(t)
}

func TestServiceClient_ValidateService_Success(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockServiceClient)
	
	mockClient.On("ValidateService", ctx, "default", "test-service").Return(nil)

	err := mockClient.ValidateService(ctx, "default", "test-service")
	
	assert.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestServiceClient_ValidateService_NotFound(t *testing.T) {
	ctx := context.Background()
	mockClient := new(MockServiceClient)
	
	mockClient.On("ValidateService", ctx, "default", "nonexistent-service").Return(assert.AnError)

	err := mockClient.ValidateService(ctx, "default", "nonexistent-service")
	
	assert.Error(t, err)
	mockClient.AssertExpectations(t)
}

// Integration test scenarios
func TestServiceInfo_WithMultiplePorts(t *testing.T) {
	serviceInfo := ServiceInfo{
		Name:      "complex-service",
		Namespace: "production",
		Type:      "LoadBalancer",
		Ports: []ServicePort{
			{Name: "http", Port: 80, TargetPort: "8080", Protocol: "TCP"},
			{Name: "https", Port: 443, TargetPort: "8443", Protocol: "TCP"},
			{Name: "metrics", Port: 9090, TargetPort: "9090", Protocol: "TCP"},
			{Name: "health", Port: 8081, TargetPort: "8081", Protocol: "TCP"},
		},
	}

	assert.Equal(t, "complex-service", serviceInfo.Name)
	assert.Equal(t, "production", serviceInfo.Namespace)
	assert.Equal(t, "LoadBalancer", serviceInfo.Type)
	assert.Len(t, serviceInfo.Ports, 4)
	
	// Verify all ports are correctly structured
	portNames := []string{"http", "https", "metrics", "health"}
	for i, expectedName := range portNames {
		assert.Equal(t, expectedName, serviceInfo.Ports[i].Name)
		assert.Equal(t, "TCP", serviceInfo.Ports[i].Protocol)
	}
}

func TestServiceInfo_WithNoPorts(t *testing.T) {
	serviceInfo := ServiceInfo{
		Name:      "headless-service",
		Namespace: "default",
		Type:      "ClusterIP",
		Ports:     []ServicePort{},
	}

	assert.Equal(t, "headless-service", serviceInfo.Name)
	assert.Equal(t, "default", serviceInfo.Namespace)
	assert.Equal(t, "ClusterIP", serviceInfo.Type)
	assert.Len(t, serviceInfo.Ports, 0)
}

func TestServicePort_WithEmptyName(t *testing.T) {
	port := ServicePort{
		Name:       "", // Sometimes service ports don't have names
		Port:       8080,
		TargetPort: "8080",
		Protocol:   "TCP",
	}

	assert.Equal(t, "", port.Name)
	assert.Equal(t, int32(8080), port.Port)
	assert.Equal(t, "8080", port.TargetPort)
	assert.Equal(t, "TCP", port.Protocol)
}

func TestServicePort_WithNamedTargetPort(t *testing.T) {
	port := ServicePort{
		Name:       "http",
		Port:       80,
		TargetPort: "http-port", // Target port can be a named port
		Protocol:   "TCP",
	}

	assert.Equal(t, "http", port.Name)
	assert.Equal(t, int32(80), port.Port)
	assert.Equal(t, "http-port", port.TargetPort)
	assert.Equal(t, "TCP", port.Protocol)
}

// Test interface compliance
func TestInterfaceCompliance(t *testing.T) {
	// Verify that our mock implementations satisfy the interfaces
	var _ KubernetesClient = (*MockKubernetesClient)(nil)
	var _ ServiceClient = (*MockServiceClient)(nil)
	
	// This test will fail to compile if the interfaces are not properly implemented
	assert.True(t, true, "Interface compliance verified at compile time")
}