package selectors

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/flamingo/openframe/internal/dev/interfaces"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// Re-export types for convenience
type ServiceInfo = interfaces.ServiceInfo
type ServicePort = interfaces.ServicePort

// ServiceSelector handles Kubernetes service selection for dev commands
type ServiceSelector struct {
	kubernetesClient interfaces.ServiceClient
}

// NewServiceSelector creates a new service selector
func NewServiceSelector(client interfaces.ServiceClient) *ServiceSelector {
	return &ServiceSelector{
		kubernetesClient: client,
	}
}

// SelectService handles service selection with support for:
// - Argument-based selection (if service name provided)
// - Interactive selection from available services in namespace
// - Service validation and metadata retrieval
func (ss *ServiceSelector) SelectService(ctx context.Context, namespace string, args []string) (string, *ServiceInfo, error) {
	// If service name provided as argument, validate and use it
	if len(args) > 0 {
		serviceName := strings.TrimSpace(args[0])
		if serviceName == "" {
			return "", nil, fmt.Errorf("service name cannot be empty")
		}

		// Get service info and validate
		serviceInfo, err := ss.kubernetesClient.GetService(ctx, namespace, serviceName)
		if err != nil {
			return "", nil, fmt.Errorf("service '%s' not found in namespace '%s': %w", serviceName, namespace, err)
		}

		return serviceName, serviceInfo, nil
	}

	// Get available services for interactive selection
	services, err := ss.kubernetesClient.GetServices(ctx, namespace)
	if err != nil {
		return "", nil, fmt.Errorf("failed to list services in namespace '%s': %w", namespace, err)
	}

	if len(services) == 0 {
		pterm.Warning.Printf("No services found in namespace '%s'\n", namespace)
		
		// Ask if user wants to enter service name manually
		enterManually, err := sharedUI.ConfirmAction("Enter service name manually?")
		if err != nil {
			return "", nil, fmt.Errorf("confirmation failed: %w", err)
		}
		
		if !enterManually {
			return "", nil, fmt.Errorf("no services available for selection")
		}
		
		return ss.promptForManualService(ctx, namespace)
	}

	// Filter and sort services for better UX
	filteredServices := ss.filterServices(services)
	
	if len(filteredServices) == 0 {
		pterm.Warning.Printf("No suitable services found for intercept in namespace '%s'\n", namespace)
		return ss.promptForManualService(ctx, namespace)
	}

	// Prepare service options with additional info
	serviceOptions := make([]string, len(filteredServices))
	for i, service := range filteredServices {
		serviceOptions[i] = ss.formatServiceOption(service)
	}

	// Interactive selection
	selectedIndex, _, err := sharedUI.SelectFromList(
		"Select service to intercept", 
		serviceOptions,
	)
	if err != nil {
		return "", nil, fmt.Errorf("service selection failed: %w", err)
	}

	selectedService := filteredServices[selectedIndex]
	return selectedService.Name, &selectedService, nil
}

// SelectServicePort helps user select which port to intercept for services with multiple ports
func (ss *ServiceSelector) SelectServicePort(service *ServiceInfo) (*ServicePort, error) {
	if len(service.Ports) == 0 {
		return nil, fmt.Errorf("service '%s' has no ports configured", service.Name)
	}

	// If only one port, use it automatically
	if len(service.Ports) == 1 {
		return &service.Ports[0], nil
	}

	// Multiple ports - let user choose
	portOptions := make([]string, len(service.Ports))
	for i, port := range service.Ports {
		portOptions[i] = ss.formatPortOption(port)
	}

	selectedIndex, _, err := sharedUI.SelectFromList(
		"Select port to intercept", 
		portOptions,
	)
	if err != nil {
		return nil, fmt.Errorf("port selection failed: %w", err)
	}

	return &service.Ports[selectedIndex], nil
}

// ValidateService checks if a service exists and is suitable for intercept
func (ss *ServiceSelector) ValidateService(ctx context.Context, namespace, serviceName string) error {
	return ss.kubernetesClient.ValidateService(ctx, namespace, serviceName)
}

// GetServiceInfo retrieves detailed information about a service
func (ss *ServiceSelector) GetServiceInfo(ctx context.Context, namespace, serviceName string) (*ServiceInfo, error) {
	return ss.kubernetesClient.GetService(ctx, namespace, serviceName)
}

// promptForManualService asks user to enter service name manually
func (ss *ServiceSelector) promptForManualService(ctx context.Context, namespace string) (string, *ServiceInfo, error) {
	serviceName, err := sharedUI.GetInput(
		"Enter service name", 
		"",
		sharedUI.ValidateNonEmpty("service name"),
	)
	if err != nil {
		return "", nil, fmt.Errorf("service name input failed: %w", err)
	}

	// Get service info and validate
	serviceInfo, err := ss.kubernetesClient.GetService(ctx, namespace, serviceName)
	if err != nil {
		return "", nil, fmt.Errorf("service '%s' not found: %w", serviceName, err)
	}

	return serviceName, serviceInfo, nil
}

// filterServices removes services that are not suitable for intercept
func (ss *ServiceSelector) filterServices(services []ServiceInfo) []ServiceInfo {
	var filtered []ServiceInfo
	
	for _, service := range services {
		// Skip services that are typically not suitable for intercept
		if ss.isSuitableForIntercept(service) {
			filtered = append(filtered, service)
		}
	}

	// Sort services by name for consistent display
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Name < filtered[j].Name
	})
	
	return filtered
}

// isSuitableForIntercept checks if a service is suitable for traffic intercept
func (ss *ServiceSelector) isSuitableForIntercept(service ServiceInfo) bool {
	// Skip headless services (ClusterIP = None)
	if service.Type == "ClusterIP" && len(service.Ports) == 0 {
		return false
	}
	
	// Skip LoadBalancer services (typically external)
	if service.Type == "LoadBalancer" {
		return false
	}
	
	// Skip services with no ports
	if len(service.Ports) == 0 {
		return false
	}
	
	// Skip system services (starting with kube-)
	if strings.HasPrefix(service.Name, "kube-") {
		return false
	}
	
	return true
}

// formatServiceOption formats a service for display in selection list
func (ss *ServiceSelector) formatServiceOption(service ServiceInfo) string {
	portInfo := ""
	if len(service.Ports) == 1 {
		port := service.Ports[0]
		portInfo = fmt.Sprintf(":%d", port.Port)
		if port.Name != "" {
			portInfo = fmt.Sprintf(":%s(%d)", port.Name, port.Port)
		}
	} else if len(service.Ports) > 1 {
		portInfo = fmt.Sprintf(" (%d ports)", len(service.Ports))
	}
	
	return fmt.Sprintf("%s%s [%s]", service.Name, portInfo, service.Type)
}

// formatPortOption formats a service port for display in selection list
func (ss *ServiceSelector) formatPortOption(port ServicePort) string {
	name := port.Name
	if name == "" {
		name = "unnamed"
	}
	
	target := port.TargetPort
	if target == "" {
		target = fmt.Sprintf("%d", port.Port)
	}
	
	return fmt.Sprintf("%s: %d -> %s (%s)", name, port.Port, target, port.Protocol)
}

// ShowServiceInfo displays information about the selected service
func (ss *ServiceSelector) ShowServiceInfo(service *ServiceInfo) {
	pterm.Info.Printf("Selected service: %s\n", pterm.Cyan(service.Name))
	pterm.Info.Printf("Service type: %s\n", pterm.Blue(service.Type))
	
	if len(service.Ports) > 0 {
		pterm.Info.Println("Available ports:")
		for _, port := range service.Ports {
			name := port.Name
			if name == "" {
				name = "unnamed"
			}
			pterm.Printf("  • %s: %d (%s)\n", name, port.Port, port.Protocol)
		}
	}
}