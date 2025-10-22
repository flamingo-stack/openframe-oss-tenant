package kubectl

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
)

// GetServices returns all services in a namespace
func (p *Provider) GetServices(ctx context.Context, namespace string) ([]intercept.ServiceInfo, error) {
	// Use JSON output for better parsing
	result, err := p.executor.Execute(ctx, "kubectl", "get", "services", "-n", namespace, "-o", "json")
	if err != nil {
		return nil, fmt.Errorf("failed to get services in namespace %s: %w", namespace, err)
	}

	// Parse JSON response
	var serviceList serviceListJSON
	if err := json.Unmarshal([]byte(result.Stdout), &serviceList); err != nil {
		// Fallback to simple parsing if JSON fails
		return p.getServicesSimple(ctx, namespace)
	}

	var services []intercept.ServiceInfo
	for _, item := range serviceList.Items {
		services = append(services, p.convertJSONToServiceInfo(item, namespace))
	}

	return services, nil
}

// GetService returns details about a specific service
func (p *Provider) GetService(ctx context.Context, namespace, serviceName string) (*intercept.ServiceInfo, error) {
	// Use JSON output for single service
	result, err := p.executor.Execute(ctx, "kubectl", "get", "service", serviceName, "-n", namespace, "-o", "json")
	if err != nil {
		return nil, fmt.Errorf("service '%s' not found in namespace '%s': %w", serviceName, namespace, err)
	}

	// Parse JSON response
	var service serviceJSON
	if err := json.Unmarshal([]byte(result.Stdout), &service); err != nil {
		// Fallback to simple parsing
		return p.getServiceSimple(ctx, namespace, serviceName)
	}

	info := p.convertJSONToServiceInfo(service, namespace)
	return &info, nil
}

// ValidateService checks if a service exists in a namespace
func (p *Provider) ValidateService(ctx context.Context, namespace, serviceName string) error {
	_, err := p.executor.Execute(ctx, "kubectl", "get", "service", serviceName, "-n", namespace)
	if err != nil {
		return fmt.Errorf("service '%s' not found in namespace '%s'", serviceName, namespace)
	}
	return nil
}

// getServicesSimple is a fallback method using simpler kubectl commands
func (p *Provider) getServicesSimple(ctx context.Context, namespace string) ([]intercept.ServiceInfo, error) {
	// Get service names
	result, err := p.executor.Execute(ctx, "kubectl", "get", "services", "-n", namespace,
		"-o", "jsonpath={.items[*].metadata.name}")
	if err != nil {
		return nil, fmt.Errorf("failed to get service names: %w", err)
	}

	serviceNames := strings.Fields(result.Stdout)
	var services []intercept.ServiceInfo

	for _, name := range serviceNames {
		service, err := p.GetService(ctx, namespace, name)
		if err != nil {
			if p.verbose {
				fmt.Printf("Warning: Could not get details for service %s: %v\n", name, err)
			}
			continue // Skip services we can't get details for
		}
		services = append(services, *service)
	}

	return services, nil
}

// getServiceSimple is a fallback method using simpler kubectl commands
func (p *Provider) getServiceSimple(ctx context.Context, namespace, serviceName string) (*intercept.ServiceInfo, error) {
	// Get service type
	typeResult, err := p.executor.Execute(ctx, "kubectl", "get", "service", serviceName, "-n", namespace,
		"-o", "jsonpath={.spec.type}")
	if err != nil {
		return nil, fmt.Errorf("failed to get service type: %w", err)
	}

	// Get first port (simplified)
	portResult, err := p.executor.Execute(ctx, "kubectl", "get", "service", serviceName, "-n", namespace,
		"-o", "jsonpath={.spec.ports[0].port}")

	var ports []intercept.ServicePort
	if err == nil && portResult.Stdout != "" {
		port, _ := strconv.ParseInt(strings.TrimSpace(portResult.Stdout), 10, 32)
		if port > 0 {
			ports = append(ports, intercept.ServicePort{
				Name:     fmt.Sprintf("%d", port),
				Port:     int32(port),
				Protocol: "TCP",
			})
		}
	}

	return &intercept.ServiceInfo{
		Name:      serviceName,
		Namespace: namespace,
		Type:      strings.TrimSpace(typeResult.Stdout),
		Ports:     ports,
	}, nil
}

// convertJSONToServiceInfo converts JSON service data to ServiceInfo
func (p *Provider) convertJSONToServiceInfo(service serviceJSON, namespace string) intercept.ServiceInfo {
	var ports []intercept.ServicePort
	for _, port := range service.Spec.Ports {
		targetPort := p.parseTargetPort(port.TargetPort)

		// If port name is empty, use the port number as name
		portName := port.Name
		if portName == "" {
			portName = fmt.Sprintf("%d", port.Port)
		}

		ports = append(ports, intercept.ServicePort{
			Name:       portName,
			Port:       port.Port,
			TargetPort: targetPort,
			Protocol:   port.Protocol,
		})
	}

	return intercept.ServiceInfo{
		Name:      service.Metadata.Name,
		Namespace: namespace,
		Type:      service.Spec.Type,
		Ports:     ports,
	}
}
