package config

import (
	"encoding/json"
	"fmt"
	"openframe/internal/utils"
	"os"
	"path/filepath"
	"strings"
)

// --- Types and Constants from types.go ---

// Service represents a service configuration
type Service struct {
	Name      string            `json:"name"`
	Directory string            `json:"directory"`
	Namespace string            `json:"namespace"`
	Type      ServiceType       `json:"type"`
	Ports     map[string]int    `json:"ports,omitempty"`
	Env       map[string]string `json:"env,omitempty"`
	Health    HealthCheck       `json:"health,omitempty"`
}

// HealthCheck represents service health check configuration
type HealthCheck struct {
	Endpoint string `json:"endpoint,omitempty"`
	Port     int    `json:"port,omitempty"`
	Path     string `json:"path,omitempty"`
}

// ServiceType represents the type of service
type ServiceType string

const (
	ServiceTypeMicroservice ServiceType = "microservice"
	ServiceTypeIntegrated   ServiceType = "integrated"
	ServiceTypeDatasource   ServiceType = "datasource"
	ServiceTypeClientTool   ServiceType = "client-tool"
	ServiceTypePlatform     ServiceType = "platform"
)

// ProjectConfig holds the project configuration
type ProjectConfig struct {
	RootDir  string              `json:"rootDir"`
	Services map[string]*Service `json:"services"`
	Settings Settings            `json:"settings"`
}

// Settings holds global CLI settings
type Settings struct {
	DefaultNamespace string             `json:"defaultNamespace"`
	Telepresence     TelepresenceConfig `json:"telepresence"`
	Skaffold         SkaffoldConfig     `json:"skaffold"`
}

// TelepresenceConfig holds telepresence-specific settings
type TelepresenceConfig struct {
	AutoConnect bool   `json:"autoConnect"`
	Context     string `json:"context,omitempty"`
}

// SkaffoldConfig holds skaffold-specific settings
type SkaffoldConfig struct {
	CacheArtifacts bool `json:"cacheArtifacts"`
	NoPrune        bool `json:"noPrune"`
	PortForward    bool `json:"portForward"`
	Tail           bool `json:"tail"`
}

// ServiceRegistry defines the interface for service discovery
type ServiceRegistry interface {
	GetService(name string) (*Service, error)
	ListServices() []*Service
	ListServicesByType(serviceType ServiceType) []*Service
	GetAvailableServiceNames() []string
	GetAvailableServiceNamesString() string
}

// ConfigManager defines the interface for configuration management
type ConfigManager interface {
	Save() error
	LoadFromFile() error
	GetSettings() Settings
	SetSettings(settings Settings)
}

// --- End of types.go merge ---

// NewProjectConfig creates a new project configuration
func NewProjectConfig() (*ProjectConfig, error) {
	rootDir, err := utils.FindRootDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get root directory: %w", err)
	}

	config := &ProjectConfig{
		RootDir:  rootDir,
		Services: make(map[string]*Service),
		Settings: Settings{
			DefaultNamespace: "microservices",
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

	// Load configuration from file if it exists
	if err := config.loadFromFile(); err != nil {
		// Log warning but continue with defaults
		fmt.Printf("Warning: Could not load config file: %v\n", err)
	}

	// Load services using the service discovery module
	discovery := NewServiceDiscovery(rootDir)
	config.Services = discovery.DiscoverServices()

	return config, nil
}

// GetService returns a service by name
func (pc *ProjectConfig) GetService(name string) (*Service, error) {
	service, exists := pc.Services[name]
	if !exists {
		return nil, fmt.Errorf("service '%s' not found", name)
	}
	return service, nil
}

// ListServices returns all services
func (pc *ProjectConfig) ListServices() []*Service {
	var services []*Service
	for _, service := range pc.Services {
		services = append(services, service)
	}
	return services
}

// ListServicesByType returns services filtered by type
func (pc *ProjectConfig) ListServicesByType(serviceType ServiceType) []*Service {
	var services []*Service
	for _, service := range pc.Services {
		if service.Type == serviceType {
			services = append(services, service)
		}
	}
	return services
}

// GetAvailableServiceNames returns a slice of available service names
func (pc *ProjectConfig) GetAvailableServiceNames() []string {
	var names []string
	for name := range pc.Services {
		names = append(names, name)
	}
	return names
}

// GetAvailableServiceNamesString returns a comma-separated string of available service names
func (pc *ProjectConfig) GetAvailableServiceNamesString() string {
	names := pc.GetAvailableServiceNames()
	return strings.Join(names, ", ")
}

// Save saves the configuration to file
func (pc *ProjectConfig) Save() error {
	configFile := filepath.Join(pc.RootDir, ".openframe", "config.json")

	// Ensure directory exists
	configDir := filepath.Dir(configFile)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := json.MarshalIndent(pc, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configFile, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// loadFromFile loads configuration from file
func (pc *ProjectConfig) loadFromFile() error {
	configFile := filepath.Join(pc.RootDir, ".openframe", "config.json")

	data, err := os.ReadFile(configFile)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // File doesn't exist, use defaults
		}
		return fmt.Errorf("failed to read config file: %w", err)
	}

	var fileConfig ProjectConfig
	if err := json.Unmarshal(data, &fileConfig); err != nil {
		return fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Merge settings from file
	if fileConfig.Settings.DefaultNamespace != "" {
		pc.Settings.DefaultNamespace = fileConfig.Settings.DefaultNamespace
	}
	if fileConfig.Settings.Telepresence.AutoConnect {
		pc.Settings.Telepresence.AutoConnect = fileConfig.Settings.Telepresence.AutoConnect
	}
	if fileConfig.Settings.Telepresence.Context != "" {
		pc.Settings.Telepresence.Context = fileConfig.Settings.Telepresence.Context
	}

	return nil
}
