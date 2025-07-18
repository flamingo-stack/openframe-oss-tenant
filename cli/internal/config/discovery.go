package config

import (
	"fmt"
	"path/filepath"

	"openframe/internal/utils"
)

// ServiceDiscovery handles the discovery and loading of services
type ServiceDiscovery struct {
	rootDir string
}

// NewServiceDiscovery creates a new service discovery instance
func NewServiceDiscovery(rootDir string) *ServiceDiscovery {
	return &ServiceDiscovery{
		rootDir: rootDir,
	}
}

// DiscoverServices discovers all available services in the project
func (sd *ServiceDiscovery) DiscoverServices() map[string]*Service {
	services := make(map[string]*Service)

	// Look for services in the openframe/services directory
	servicesBasePath := filepath.Join(sd.rootDir, "openframe", "services")

	if utils.DirectoryExists(servicesBasePath) {
		sd.discoverServicesFromOpenframe(services, servicesBasePath)
	} else {
		// Fallback to legacy structure if openframe/services doesn't exist
		sd.discoverLegacyServices(services)
	}

	return services
}

// discoverServicesFromOpenframe discovers services from the openframe/services directory
func (sd *ServiceDiscovery) discoverServicesFromOpenframe(services map[string]*Service, servicesBasePath string) {
	// Microservices in openframe/services
	microservices := []string{
		"openframe-api", "openframe-gateway", "openframe-client",
		"openframe-config", "openframe-management", "openframe-stream", "openframe-ui", "external-api",
	}

	for _, name := range microservices {
		dir := filepath.Join(servicesBasePath, name)
		if utils.DirectoryExists(dir) {
			services[name] = &Service{
				Name:      name,
				Directory: dir,
				Namespace: "microservices",
				Type:      ServiceTypeMicroservice,
			}
		}
	}

	// Integrated tools in integrated-tools directory (root level)
	integratedToolsBasePath := filepath.Join(sd.rootDir, "integrated-tools")
	integrated := []string{"meshcentral", "tactical-rmm", "fleetmdm", "authentik"}
	for _, name := range integrated {
		dir := filepath.Join(integratedToolsBasePath, name)
		if utils.DirectoryExists(dir) {
			services[name] = &Service{
				Name:      name,
				Directory: dir,
				Namespace: "integrated-tools",
				Type:      ServiceTypeIntegrated,
			}
		}
	}
}

// discoverLegacyServices discovers services using the legacy directory structure
func (sd *ServiceDiscovery) discoverLegacyServices(services map[string]*Service) {
	servicesBasePath := filepath.Join(sd.rootDir, "services")
	integratedToolsBasePath := filepath.Join(sd.rootDir, "integrated-tools")

	// Microservices
	microservices := []string{
		"openframe-api", "openframe-gateway", "openframe-client",
		"openframe-config", "openframe-management", "openframe-stream", "openframe-ui", "external-api",
	}

	for _, name := range microservices {
		dir := filepath.Join(servicesBasePath, name)
		if utils.DirectoryExists(dir) {
			services[name] = &Service{
				Name:      name,
				Directory: dir,
				Namespace: "microservices",
				Type:      ServiceTypeMicroservice,
			}
		}
	}

	// Integrated tools
	integrated := []string{"meshcentral", "tactical-rmm", "fleetmdm", "authentik"}
	for _, name := range integrated {
		dir := filepath.Join(integratedToolsBasePath, name)
		if utils.DirectoryExists(dir) {
			services[name] = &Service{
				Name:      name,
				Directory: dir,
				Namespace: "integrated-tools",
				Type:      ServiceTypeIntegrated,
			}
		}
	}
}

// ValidateService validates that a service exists and is properly configured
func (sd *ServiceDiscovery) ValidateService(name string) error {
	services := sd.DiscoverServices()
	if _, exists := services[name]; !exists {
		return fmt.Errorf("service '%s' not found", name)
	}
	return nil
}

// GetServiceInfo returns information about a specific service
func (sd *ServiceDiscovery) GetServiceInfo(name string) (*Service, error) {
	services := sd.DiscoverServices()
	service, exists := services[name]
	if !exists {
		return nil, fmt.Errorf("service '%s' not found", name)
	}
	return service, nil
}
