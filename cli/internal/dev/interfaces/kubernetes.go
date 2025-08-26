package interfaces

import (
	"context"
)

// ServicePort represents a service port configuration
type ServicePort struct {
	Name       string
	Port       int32
	TargetPort string
	Protocol   string
}

// ServiceInfo represents a Kubernetes service with relevant metadata
type ServiceInfo struct {
	Name      string
	Namespace string
	Type      string
	Ports     []ServicePort
}

// KubernetesClient interface for namespace operations
type KubernetesClient interface {
	GetNamespaces(ctx context.Context) ([]string, error)
	ValidateNamespace(ctx context.Context, namespace string) error
}

// ServiceClient interface for service operations
type ServiceClient interface {
	GetServices(ctx context.Context, namespace string) ([]ServiceInfo, error)
	GetService(ctx context.Context, namespace, serviceName string) (*ServiceInfo, error)
	ValidateService(ctx context.Context, namespace, serviceName string) error
}