package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewServiceDiscovery(t *testing.T) {
	// Test creating a new service discovery instance
	rootDir := "/test/root"
	discovery := NewServiceDiscovery(rootDir)

	if discovery == nil {
		t.Fatal("NewServiceDiscovery() returned nil")
	}

	if discovery.rootDir != rootDir {
		t.Errorf("NewServiceDiscovery() should set rootDir correctly, got %s", discovery.rootDir)
	}
}

func TestDiscoverServices(t *testing.T) {
	if os.Getenv("CI") != "" {
		t.Skip("Skipping TestDiscoverServices in CI environment")
	}
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-discovery")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create the openframe/services directory structure
	servicesDir := filepath.Join(tempDir, "openframe", "services")
	err = os.MkdirAll(servicesDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create services directory: %v", err)
	}

	// Create some test service directories
	testServices := []string{"openframe-api", "openframe-ui", "external-api"}
	for _, service := range testServices {
		serviceDir := filepath.Join(servicesDir, service)
		err = os.Mkdir(serviceDir, 0755)
		if err != nil {
			t.Fatalf("Failed to create service directory %s: %v", service, err)
		}
	}

	// Create integrated-tools directory
	integratedToolsDir := filepath.Join(tempDir, "integrated-tools")
	err = os.Mkdir(integratedToolsDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create integrated-tools directory: %v", err)
	}

	// Create some test integrated tool directories
	testIntegratedTools := []string{"meshcentral", "tactical-rmm"}
	for _, tool := range testIntegratedTools {
		toolDir := filepath.Join(integratedToolsDir, tool)
		err = os.Mkdir(toolDir, 0755)
		if err != nil {
			t.Fatalf("Failed to create integrated tool directory %s: %v", tool, err)
		}
	}

	// Test service discovery
	discovery := NewServiceDiscovery(tempDir)
	services := discovery.DiscoverServices()

	// Check that services were discovered
	if len(services) == 0 {
		t.Error("DiscoverServices() should discover services")
	}

	// Check that microservices were discovered
	for _, serviceName := range testServices {
		if service, exists := services[serviceName]; !exists {
			t.Errorf("Service %s should be discovered", serviceName)
		} else {
			if service.Type != ServiceTypeMicroservice {
				t.Errorf("Service %s should be of type microservice, got %s", serviceName, service.Type)
			}
			if service.Namespace != "microservices" {
				t.Errorf("Service %s should be in microservices namespace, got %s", serviceName, service.Namespace)
			}
		}
	}

	// Check that integrated tools were discovered
	for _, toolName := range testIntegratedTools {
		if service, exists := services[toolName]; !exists {
			t.Errorf("Integrated tool %s should be discovered", toolName)
		} else {
			if service.Type != ServiceTypeIntegrated {
				t.Errorf("Integrated tool %s should be of type integrated, got %s", toolName, service.Type)
			}
			if service.Namespace != "integrated-tools" {
				t.Errorf("Integrated tool %s should be in integrated-tools namespace, got %s", toolName, service.Namespace)
			}
		}
	}
}

func TestDiscoverServicesLegacyStructure(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-discovery-legacy")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create the legacy services directory structure
	servicesDir := filepath.Join(tempDir, "services")
	err = os.MkdirAll(servicesDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create services directory: %v", err)
	}

	// Create some test service directories
	testServices := []string{"openframe-api", "openframe-ui"}
	for _, service := range testServices {
		serviceDir := filepath.Join(servicesDir, service)
		err = os.Mkdir(serviceDir, 0755)
		if err != nil {
			t.Fatalf("Failed to create service directory %s: %v", service, err)
		}
	}

	// Create integrated-tools directory
	integratedToolsDir := filepath.Join(tempDir, "integrated-tools")
	err = os.Mkdir(integratedToolsDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create integrated-tools directory: %v", err)
	}

	// Create some test integrated tool directories
	testIntegratedTools := []string{"meshcentral", "tactical-rmm"}
	for _, tool := range testIntegratedTools {
		toolDir := filepath.Join(integratedToolsDir, tool)
		err = os.Mkdir(toolDir, 0755)
		if err != nil {
			t.Fatalf("Failed to create integrated tool directory %s: %v", tool, err)
		}
	}

	// Test service discovery with legacy structure
	discovery := NewServiceDiscovery(tempDir)
	services := discovery.DiscoverServices()

	// Check that services were discovered
	if len(services) == 0 {
		t.Error("DiscoverServices() should discover services in legacy structure")
	}

	// Check that microservices were discovered
	for _, serviceName := range testServices {
		if service, exists := services[serviceName]; !exists {
			t.Errorf("Service %s should be discovered in legacy structure", serviceName)
		} else {
			if service.Type != ServiceTypeMicroservice {
				t.Errorf("Service %s should be of type microservice, got %s", serviceName, service.Type)
			}
		}
	}

	// Check that integrated tools were discovered
	for _, toolName := range testIntegratedTools {
		if service, exists := services[toolName]; !exists {
			t.Errorf("Integrated tool %s should be discovered in legacy structure", toolName)
		} else {
			if service.Type != ServiceTypeIntegrated {
				t.Errorf("Integrated tool %s should be of type integrated, got %s", toolName, service.Type)
			}
		}
	}
}

func TestValidateService(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-validation")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create the openframe/services directory structure
	servicesDir := filepath.Join(tempDir, "openframe", "services")
	err = os.MkdirAll(servicesDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create services directory: %v", err)
	}

	// Create a test service directory with a valid service name
	serviceDir := filepath.Join(servicesDir, "openframe-api")
	err = os.Mkdir(serviceDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create service directory: %v", err)
	}

	// Test service validation
	discovery := NewServiceDiscovery(tempDir)

	// Test valid service
	err = discovery.ValidateService("openframe-api")
	if err != nil {
		t.Errorf("ValidateService() should not error for valid service: %v", err)
	}

	// Test invalid service
	err = discovery.ValidateService("invalid-service")
	if err == nil {
		t.Error("ValidateService() should error for invalid service")
	}
}

func TestGetServiceInfo(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-service-info")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create the openframe/services directory structure
	servicesDir := filepath.Join(tempDir, "openframe", "services")
	err = os.MkdirAll(servicesDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create services directory: %v", err)
	}

	// Create a test service directory with a valid service name
	serviceDir := filepath.Join(servicesDir, "openframe-api")
	err = os.Mkdir(serviceDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create service directory: %v", err)
	}

	// Test getting service info
	discovery := NewServiceDiscovery(tempDir)

	// Test valid service
	service, err := discovery.GetServiceInfo("openframe-api")
	if err != nil {
		t.Errorf("GetServiceInfo() should not error for valid service: %v", err)
	}
	if service == nil {
		t.Error("GetServiceInfo() should return service for valid service")
	}
	if service.Name != "openframe-api" {
		t.Errorf("GetServiceInfo() should return correct service name, got %s", service.Name)
	}
	if service.Type != ServiceTypeMicroservice {
		t.Errorf("GetServiceInfo() should return correct service type, got %s", service.Type)
	}

	// Test invalid service
	service, err = discovery.GetServiceInfo("invalid-service")
	if err == nil {
		t.Error("GetServiceInfo() should error for invalid service")
	}
	if service != nil {
		t.Error("GetServiceInfo() should return nil for invalid service")
	}
}

func TestDiscoverServicesEmptyDirectory(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-discovery-empty")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Test service discovery with empty directory
	discovery := NewServiceDiscovery(tempDir)
	services := discovery.DiscoverServices()

	// Should return empty map, not nil
	if services == nil {
		t.Error("DiscoverServices() should return empty map, not nil")
	}
	if len(services) != 0 {
		t.Errorf("DiscoverServices() should return empty map for empty directory, got %d services", len(services))
	}
}

func TestServiceDiscoveryStructFields(t *testing.T) {
	// Test that ServiceDiscovery struct has all expected fields
	rootDir := "/test/root"
	discovery := &ServiceDiscovery{rootDir: rootDir}

	// Test that rootDir field can be accessed
	if discovery.rootDir != rootDir {
		t.Error("rootDir field should be accessible")
	}
}
