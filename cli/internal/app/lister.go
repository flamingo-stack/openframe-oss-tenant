package app

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"openframe/internal/config"
)

// ServiceLister handles service listing operations
type ServiceLister struct {
	app *App
}

// NewServiceLister creates a new service lister
func NewServiceLister(app *App) *ServiceLister {
	return &ServiceLister{app: app}
}

// List shows available services with enhanced formatting
func (sl *ServiceLister) List(detailed bool, serviceType string) {
	services := sl.app.config.ListServices()

	if len(services) == 0 {
		fmt.Printf("No services found for type: %s\n", serviceType)
		return
	}

	fmt.Println("Available services:")

	// Group by type
	microservices := sl.app.config.ListServicesByType(config.ServiceTypeMicroservice)
	integrated := sl.app.config.ListServicesByType(config.ServiceTypeIntegrated)
	datasources := sl.app.config.ListServicesByType(config.ServiceTypeDatasource)
	clientTools := sl.app.config.ListServicesByType(config.ServiceTypeClientTool)
	platform := sl.app.config.ListServicesByType(config.ServiceTypePlatform)

	// Filter if type is specified
	if serviceType != "" {
		if strings.EqualFold(serviceType, "microservice") || strings.EqualFold(serviceType, "microservices") {
			integrated, datasources, clientTools, platform = nil, nil, nil, nil
		} else if strings.EqualFold(serviceType, "integrated") || strings.EqualFold(serviceType, "integrated-tools") {
			microservices, datasources, clientTools, platform = nil, nil, nil, nil
		} else if strings.EqualFold(serviceType, "datasource") || strings.EqualFold(serviceType, "datasources") {
			microservices, integrated, clientTools, platform = nil, nil, nil, nil
		} else if strings.EqualFold(serviceType, "client-tool") || strings.EqualFold(serviceType, "client-tools") {
			microservices, integrated, datasources, platform = nil, nil, nil, nil
		} else if strings.EqualFold(serviceType, "platform") {
			microservices, integrated, datasources, clientTools = nil, nil, nil, nil
		}
	}

	sl.printServiceGroup("📦 Microservices:", microservices, detailed)
	sl.printServiceGroup("🔧 Integrated Tools:", integrated, detailed)
	sl.printServiceGroup("🗄️  Datasources:", datasources, detailed)
	sl.printServiceGroup("🛠️  Client Tools:", clientTools, detailed)
	sl.printServiceGroup("🏗️  Platform Services:", platform, detailed)
}

// ListJSON outputs services in JSON format
func (sl *ServiceLister) ListJSON() error {
	// Group services by type for JSON output
	result := map[string]interface{}{
		"microservices":    sl.app.config.ListServicesByType(config.ServiceTypeMicroservice),
		"integrated_tools": sl.app.config.ListServicesByType(config.ServiceTypeIntegrated),
		"datasources":      sl.app.config.ListServicesByType(config.ServiceTypeDatasource),
		"client_tools":     sl.app.config.ListServicesByType(config.ServiceTypeClientTool),
		"platform":         sl.app.config.ListServicesByType(config.ServiceTypePlatform),
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(result)
}

// printServiceGroup prints a group of services with consistent formatting
func (sl *ServiceLister) printServiceGroup(title string, services []*config.Service, detailed bool) {
	if len(services) > 0 {
		fmt.Println(title)
		for _, s := range services {
			fmt.Printf("  • %s", s.Name)
			if s.Ports != nil {
				if port, exists := s.Ports["http"]; exists {
					fmt.Printf(" (port: %d)", port)
				}
			}
			if detailed {
				fmt.Printf(" - %s", s.Directory)
			}
			fmt.Println()
		}
	}
}
