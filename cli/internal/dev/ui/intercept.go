package ui

import (
	"context"
	"fmt"
	"strconv"

	"github.com/flamingo/openframe/internal/dev/providers/kubernetes"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// InterceptUI handles user interactions for intercept setup
type InterceptUI struct {
	kubernetesClient kubernetes.KubernetesClient
	serviceClient    kubernetes.ServiceClient
}

// NewInterceptUI creates a new intercept UI handler
func NewInterceptUI(kubernetesClient kubernetes.KubernetesClient, serviceClient kubernetes.ServiceClient) *InterceptUI {
	return &InterceptUI{
		kubernetesClient: kubernetesClient,
		serviceClient:    serviceClient,
	}
}

// ServiceInfo contains service details
type ServiceInfo struct {
	Name      string
	Namespace string
	Port      int32
	Found     bool
}

// PromptForService asks user to input a service name and validates it exists
func (ui *InterceptUI) PromptForService(ctx context.Context) (*ServiceInfo, error) {
	serviceName, err := sharedUI.GetInput(
		"Enter service name to intercept",
		"",
		sharedUI.ValidateNonEmpty("service name"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get service name: %w", err)
	}

	// Find the service across all namespaces
	service, err := ui.findServiceInCluster(ctx, serviceName)
	if err != nil {
		return nil, fmt.Errorf("failed to search for service: %w", err)
	}

	if !service.Found {
		pterm.Error.Printf("Service '%s' not found in the cluster\n", serviceName)
		pterm.Info.Println("Make sure the service name is correct and the service is deployed")
		return service, fmt.Errorf("service '%s' not found", serviceName)
	}

	pterm.Success.Printf("Service '%s' found in namespace '%s'\n", service.Name, service.Namespace)
	if service.Port > 0 {
		pterm.Info.Printf("Service port: %d\n", service.Port)
	}

	return service, nil
}

// PromptForLocalPort asks user for the local port to use for intercept
func (ui *InterceptUI) PromptForLocalPort(servicePort int32) (int, error) {
	defaultPort := "8080"
	if servicePort > 0 {
		defaultPort = fmt.Sprintf("%d", servicePort)
	}

	portStr, err := sharedUI.GetInput(
		"Enter local port for intercept",
		defaultPort,
		ui.validatePort,
	)
	if err != nil {
		return 0, fmt.Errorf("failed to get local port: %w", err)
	}

	port, _ := strconv.Atoi(portStr) // Already validated
	return port, nil
}

// findServiceInCluster searches for a service across all namespaces
func (ui *InterceptUI) findServiceInCluster(ctx context.Context, serviceName string) (*ServiceInfo, error) {
	// Get all namespaces
	namespaces, err := ui.kubernetesClient.GetNamespaces(ctx)
	if err != nil {
		return &ServiceInfo{Name: serviceName, Found: false}, err
	}

	// Search in each namespace
	for _, namespace := range namespaces {
		// Try to get the service in this namespace
		if err := ui.serviceClient.ValidateService(ctx, namespace, serviceName); err == nil {
			// Service found! Get its details
			serviceInfo, err := ui.serviceClient.GetService(ctx, namespace, serviceName)
			if err != nil {
				continue // Try next namespace
			}

			port := int32(0)
			if len(serviceInfo.Ports) > 0 {
				port = serviceInfo.Ports[0].Port
			}

			return &ServiceInfo{
				Name:      serviceName,
				Namespace: namespace,
				Port:      port,
				Found:     true,
			}, nil
		}
	}

	// Service not found in any namespace
	return &ServiceInfo{Name: serviceName, Found: false}, nil
}

// validatePort validates that input is a valid port number
func (ui *InterceptUI) validatePort(input string) error {
	if input == "" {
		return fmt.Errorf("port cannot be empty")
	}

	port, err := strconv.Atoi(input)
	if err != nil {
		return fmt.Errorf("port must be a number")
	}

	if port < 1 || port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535")
	}

	return nil
}