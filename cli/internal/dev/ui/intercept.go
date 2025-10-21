package ui

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// InterceptUI handles user interactions for intercept setup
type InterceptUI struct {
	kubernetesClient intercept.KubernetesClient
	serviceClient    intercept.ServiceClient
}

// NewInterceptUI creates a new intercept UI handler
func NewInterceptUI(kubernetesClient intercept.KubernetesClient, serviceClient intercept.ServiceClient) *InterceptUI {
	return &InterceptUI{
		kubernetesClient: kubernetesClient,
		serviceClient:    serviceClient,
	}
}

// ServiceInfo contains service details
type ServiceInfo struct {
	Name      string
	Namespace string
	Ports     []intercept.ServicePort // All available ports
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
		pterm.Error.Printf("Service '%s' not found in the cluster. Make sure the service name is correct and deployed\n", serviceName)
		os.Exit(1) // Exit directly with error code instead of returning error
	}

	pterm.Success.Printf("Service '%s' found in namespace '%s'\n", service.Name, service.Namespace)

	return service, nil
}

// PromptForKubernetesPort asks user to select which Kubernetes port to intercept
func (ui *InterceptUI) PromptForKubernetesPort(servicePorts []intercept.ServicePort) (*intercept.ServicePort, error) {
	if len(servicePorts) == 0 {
		return nil, fmt.Errorf("service has no ports available")
	}

	// If only one port, use it automatically
	if len(servicePorts) == 1 {
		selectedPort := &servicePorts[0]
		portName := fmt.Sprintf("%d", selectedPort.Port)
		if selectedPort.Name != "" {
			portName = fmt.Sprintf("%d (%s)", selectedPort.Port, selectedPort.Name)
		}
		pterm.Info.Printf("Using Kubernetes port: %s\n", portName)
		return selectedPort, nil
	}

	// Multiple ports - let user choose
	var options []string
	for _, port := range servicePorts {
		if port.Name != "" {
			options = append(options, fmt.Sprintf("%d (%s)", port.Port, port.Name))
		} else {
			options = append(options, fmt.Sprintf("%d", port.Port))
		}
	}

	selectedIndex, _, err := sharedUI.SelectFromList(
		"Select Kubernetes port to intercept",
		options,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to select Kubernetes port: %w", err)
	}

	return &servicePorts[selectedIndex], nil
}

// PromptForLocalPort asks user for the local port to use for intercept
func (ui *InterceptUI) PromptForLocalPort(kubernetesPort *intercept.ServicePort) (int, error) {
	// Default to the same port as Kubernetes port
	defaultPort := fmt.Sprintf("%d", kubernetesPort.Port)

	portStr, err := sharedUI.GetInput(
		"Enter local target port to forward traffic",
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

			return &ServiceInfo{
				Name:      serviceName,
				Namespace: namespace,
				Ports:     serviceInfo.Ports,
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
