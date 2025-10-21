package dev

import (
	"context"
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
)

// MockKubernetesClient provides a mock implementation for testing UI components
type MockKubernetesClient struct {
	namespaces           []string
	services             map[string][]intercept.ServiceInfo
	shouldFailNamespaces bool
	shouldFailServices   bool
}

// NewMockKubernetesClient creates a new mock Kubernetes client with sample data
func NewMockKubernetesClient() *MockKubernetesClient {
	return &MockKubernetesClient{
		namespaces: []string{"default", "production", "staging", "development", "kube-system"},
		services: map[string][]intercept.ServiceInfo{
			"default": {
				{
					Name:      "my-api",
					Namespace: "default",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
					},
				},
				{
					Name:      "my-frontend",
					Namespace: "default",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "http", Port: 3000, TargetPort: "3000", Protocol: "TCP"},
					},
				},
			},
			"production": {
				{
					Name:      "api-service",
					Namespace: "production",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "http", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
						{Name: "metrics", Port: 9090, TargetPort: "9090", Protocol: "TCP"},
					},
				},
				{
					Name:      "web-service",
					Namespace: "production",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "http", Port: 80, TargetPort: "3000", Protocol: "TCP"},
					},
				},
			},
			"staging": {
				{
					Name:      "test-service",
					Namespace: "staging",
					Type:      "ClusterIP",
					Ports: []intercept.ServicePort{
						{Name: "", Port: 8080, TargetPort: "8080", Protocol: "TCP"},
					},
				},
			},
		},
	}
}

// GetNamespaces returns available namespaces
func (m *MockKubernetesClient) GetNamespaces(ctx context.Context) ([]string, error) {
	if m.shouldFailNamespaces {
		return nil, fmt.Errorf("mock error: failed to list namespaces")
	}
	return m.namespaces, nil
}

// ValidateNamespace validates if a namespace exists
func (m *MockKubernetesClient) ValidateNamespace(ctx context.Context, namespace string) error {
	for _, ns := range m.namespaces {
		if ns == namespace {
			return nil
		}
	}
	return fmt.Errorf("namespace '%s' not found", namespace)
}

// GetServices returns services in a namespace
func (m *MockKubernetesClient) GetServices(ctx context.Context, namespace string) ([]intercept.ServiceInfo, error) {
	if m.shouldFailServices {
		return nil, fmt.Errorf("mock error: failed to list services")
	}

	services, exists := m.services[namespace]
	if !exists {
		return []intercept.ServiceInfo{}, nil
	}

	return services, nil
}

// GetService returns a specific service
func (m *MockKubernetesClient) GetService(ctx context.Context, namespace, serviceName string) (*intercept.ServiceInfo, error) {
	services, exists := m.services[namespace]
	if !exists {
		return nil, fmt.Errorf("namespace '%s' not found", namespace)
	}

	for _, service := range services {
		if service.Name == serviceName {
			return &service, nil
		}
	}

	return nil, fmt.Errorf("service '%s' not found in namespace '%s'", serviceName, namespace)
}

// ValidateService validates if a service exists
func (m *MockKubernetesClient) ValidateService(ctx context.Context, namespace, serviceName string) error {
	_, err := m.GetService(ctx, namespace, serviceName)
	return err
}

// AddNamespace adds a namespace to the mock (for testing)
func (m *MockKubernetesClient) AddNamespace(namespace string) {
	m.namespaces = append(m.namespaces, namespace)
	if m.services[namespace] == nil {
		m.services[namespace] = []intercept.ServiceInfo{}
	}
}

// AddService adds a service to a namespace (for testing)
func (m *MockKubernetesClient) AddService(namespace string, service intercept.ServiceInfo) {
	if m.services[namespace] == nil {
		m.services[namespace] = []intercept.ServiceInfo{}
	}
	m.services[namespace] = append(m.services[namespace], service)
}

// SetShouldFailNamespaces makes namespace operations fail (for testing)
func (m *MockKubernetesClient) SetShouldFailNamespaces(shouldFail bool) {
	m.shouldFailNamespaces = shouldFail
}

// SetShouldFailServices makes service operations fail (for testing)
func (m *MockKubernetesClient) SetShouldFailServices(shouldFail bool) {
	m.shouldFailServices = shouldFail
}

// Reset resets the mock to initial state
func (m *MockKubernetesClient) Reset() {
	m.shouldFailNamespaces = false
	m.shouldFailServices = false
}

// ClearNamespaces removes all namespaces (for testing empty state)
func (m *MockKubernetesClient) ClearNamespaces() {
	m.namespaces = []string{}
	m.services = map[string][]intercept.ServiceInfo{}
}

// ClearServices removes all services from a namespace (for testing empty state)
func (m *MockKubernetesClient) ClearServices(namespace string) {
	m.services[namespace] = []intercept.ServiceInfo{}
}

// GetServicesByType returns services filtered by type
func (m *MockKubernetesClient) GetServicesByType(ctx context.Context, namespace, serviceType string) ([]intercept.ServiceInfo, error) {
	services, err := m.GetServices(ctx, namespace)
	if err != nil {
		return nil, err
	}

	var filtered []intercept.ServiceInfo
	for _, service := range services {
		if strings.EqualFold(service.Type, serviceType) {
			filtered = append(filtered, service)
		}
	}

	return filtered, nil
}
