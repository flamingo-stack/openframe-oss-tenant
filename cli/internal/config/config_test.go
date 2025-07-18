package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewProjectConfig(t *testing.T) {
	// Test creating a new project configuration
	config, err := NewProjectConfig()
	if err != nil {
		t.Fatalf("NewProjectConfig() failed: %v", err)
	}

	if config == nil {
		t.Fatal("NewProjectConfig() returned nil")
	}

	// Test that basic fields are initialized
	if config.RootDir == "" {
		t.Error("RootDir should not be empty")
	}

	if config.Services == nil {
		t.Error("Services should be initialized")
	}

	// Test that settings have default values
	if config.Settings.DefaultNamespace == "" {
		t.Error("DefaultNamespace should have a default value")
	}

	if !config.Settings.Telepresence.AutoConnect {
		t.Error("Telepresence AutoConnect should default to true")
	}
}

func TestGetService(t *testing.T) {
	// Create a test config
	config := &ProjectConfig{
		Services: map[string]*Service{
			"test-service": {
				Name:      "test-service",
				Directory: "/test/dir",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
		},
	}

	// Test getting existing service
	service, err := config.GetService("test-service")
	if err != nil {
		t.Errorf("GetService() should not error for existing service: %v", err)
	}
	if service.Name != "test-service" {
		t.Errorf("GetService() returned wrong service name: %s", service.Name)
	}

	// Test getting non-existing service
	_, err = config.GetService("non-existing-service")
	if err == nil {
		t.Error("GetService() should error for non-existing service")
	}
}

func TestListServices(t *testing.T) {
	// Create a test config
	config := &ProjectConfig{
		Services: map[string]*Service{
			"service1": {
				Name:      "service1",
				Directory: "/test/dir1",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
			"service2": {
				Name:      "service2",
				Directory: "/test/dir2",
				Namespace: "test-namespace",
				Type:      ServiceTypeIntegrated,
			},
		},
	}

	// Test listing all services
	services := config.ListServices()
	if len(services) != 2 {
		t.Errorf("ListServices() should return 2 services, got %d", len(services))
	}
}

func TestListServicesByType(t *testing.T) {
	// Create a test config
	config := &ProjectConfig{
		Services: map[string]*Service{
			"microservice1": {
				Name:      "microservice1",
				Directory: "/test/dir1",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
			"microservice2": {
				Name:      "microservice2",
				Directory: "/test/dir2",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
			"integrated1": {
				Name:      "integrated1",
				Directory: "/test/dir3",
				Namespace: "test-namespace",
				Type:      ServiceTypeIntegrated,
			},
		},
	}

	// Test filtering by microservice type
	microservices := config.ListServicesByType(ServiceTypeMicroservice)
	if len(microservices) != 2 {
		t.Errorf("ListServicesByType(ServiceTypeMicroservice) should return 2 services, got %d", len(microservices))
	}

	// Test filtering by integrated type
	integrated := config.ListServicesByType(ServiceTypeIntegrated)
	if len(integrated) != 1 {
		t.Errorf("ListServicesByType(ServiceTypeIntegrated) should return 1 service, got %d", len(integrated))
	}

	// Test filtering by non-existing type
	empty := config.ListServicesByType(ServiceTypeDatasource)
	if len(empty) != 0 {
		t.Errorf("ListServicesByType(ServiceTypeDatasource) should return 0 services, got %d", len(empty))
	}
}

func TestGetAvailableServiceNames(t *testing.T) {
	// Create a test config
	config := &ProjectConfig{
		Services: map[string]*Service{
			"service1": {
				Name:      "service1",
				Directory: "/test/dir1",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
			"service2": {
				Name:      "service2",
				Directory: "/test/dir2",
				Namespace: "test-namespace",
				Type:      ServiceTypeIntegrated,
			},
		},
	}

	// Test getting service names
	names := config.GetAvailableServiceNames()
	if len(names) != 2 {
		t.Errorf("GetAvailableServiceNames() should return 2 names, got %d", len(names))
	}

	// Check that both service names are present
	found1, found2 := false, false
	for _, name := range names {
		if name == "service1" {
			found1 = true
		}
		if name == "service2" {
			found2 = true
		}
	}
	if !found1 || !found2 {
		t.Error("GetAvailableServiceNames() should return both service names")
	}
}

func TestGetAvailableServiceNamesString(t *testing.T) {
	// Create a test config
	config := &ProjectConfig{
		Services: map[string]*Service{
			"service1": {
				Name:      "service1",
				Directory: "/test/dir1",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
			"service2": {
				Name:      "service2",
				Directory: "/test/dir2",
				Namespace: "test-namespace",
				Type:      ServiceTypeIntegrated,
			},
		},
	}

	// Test getting service names string
	namesString := config.GetAvailableServiceNamesString()
	if namesString == "" {
		t.Error("GetAvailableServiceNamesString() should not return empty string")
	}

	// Check that both service names are present in the string
	if len(namesString) < len("service1,service2") {
		t.Error("GetAvailableServiceNamesString() should contain both service names")
	}
}

func TestSave(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-config")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a test config
	config := &ProjectConfig{
		RootDir: tempDir,
		Services: map[string]*Service{
			"test-service": {
				Name:      "test-service",
				Directory: "/test/dir",
				Namespace: "test-namespace",
				Type:      ServiceTypeMicroservice,
			},
		},
		Settings: Settings{
			DefaultNamespace: "test-namespace",
			Telepresence: TelepresenceConfig{
				AutoConnect: true,
			},
			Skaffold: SkaffoldConfig{
				CacheArtifacts: false,
				NoPrune:        false,
				PortForward:    true,
				Tail:           true,
			},
		},
	}

	// Test saving config
	err = config.Save()
	if err != nil {
		t.Errorf("Save() failed: %v", err)
	}

	// Check that the config file was created
	configFile := filepath.Join(tempDir, ".openframe", "config.json")
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		t.Error("Save() should create config file")
	}
}

func TestLoadFromFile(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-config")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a test config
	config := &ProjectConfig{
		RootDir:  tempDir,
		Services: map[string]*Service{},
		Settings: Settings{
			DefaultNamespace: "original-namespace",
			Telepresence: TelepresenceConfig{
				AutoConnect: false,
			},
		},
	}

	// Test loading from non-existing file (should not error)
	err = config.loadFromFile()
	if err != nil {
		t.Errorf("loadFromFile() should not error for non-existing file: %v", err)
	}

	// Create a config file
	configDir := filepath.Join(tempDir, ".openframe")
	err = os.MkdirAll(configDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create config directory: %v", err)
	}

	configFile := filepath.Join(configDir, "config.json")
	configData := `{
		"settings": {
			"defaultNamespace": "loaded-namespace",
			"telepresence": {
				"autoConnect": true
			}
		}
	}`
	err = os.WriteFile(configFile, []byte(configData), 0644)
	if err != nil {
		t.Fatalf("Failed to write config file: %v", err)
	}

	// Test loading from existing file
	err = config.loadFromFile()
	if err != nil {
		t.Errorf("loadFromFile() failed: %v", err)
	}

	// Check that settings were loaded
	if config.Settings.DefaultNamespace != "loaded-namespace" {
		t.Errorf("loadFromFile() should update DefaultNamespace, got %s", config.Settings.DefaultNamespace)
	}

	if !config.Settings.Telepresence.AutoConnect {
		t.Error("loadFromFile() should update Telepresence AutoConnect")
	}
}

func TestServiceTypes(t *testing.T) {
	// Test that all service types are defined
	types := []ServiceType{
		ServiceTypeMicroservice,
		ServiceTypeIntegrated,
		ServiceTypeDatasource,
		ServiceTypeClientTool,
		ServiceTypePlatform,
	}

	for _, serviceType := range types {
		if serviceType == "" {
			t.Error("Service type should not be empty")
		}
	}
}

func TestServiceStruct(t *testing.T) {
	// Test Service struct
	service := &Service{
		Name:      "test-service",
		Directory: "/test/dir",
		Namespace: "test-namespace",
		Type:      ServiceTypeMicroservice,
		Ports:     map[string]int{"http": 8080},
		Env:       map[string]string{"ENV": "test"},
		Health: HealthCheck{
			Endpoint: "/health",
			Port:     8080,
			Path:     "/health",
		},
	}

	// Test that all fields can be accessed
	if service.Name != "test-service" {
		t.Error("Service Name field should be accessible")
	}
	if service.Directory != "/test/dir" {
		t.Error("Service Directory field should be accessible")
	}
	if service.Namespace != "test-namespace" {
		t.Error("Service Namespace field should be accessible")
	}
	if service.Type != ServiceTypeMicroservice {
		t.Error("Service Type field should be accessible")
	}
	if service.Ports["http"] != 8080 {
		t.Error("Service Ports field should be accessible")
	}
	if service.Env["ENV"] != "test" {
		t.Error("Service Env field should be accessible")
	}
	if service.Health.Endpoint != "/health" {
		t.Error("Service Health field should be accessible")
	}
}
