package templates

import (
	"fmt"
	"os"

	"github.com/flamingo/openframe/internal/chart/types"
	"gopkg.in/yaml.v3"
)

// HelmValuesModifier handles reading, modifying, and writing Helm values files
type HelmValuesModifier struct{}

// NewHelmValuesModifier creates a new Helm values modifier
func NewHelmValuesModifier() *HelmValuesModifier {
	return &HelmValuesModifier{}
}

// LoadExistingValues loads existing Helm values from file
func (h *HelmValuesModifier) LoadExistingValues(helmValuesPath string) (map[string]interface{}, error) {
	// Check if file exists
	if _, err := os.Stat(helmValuesPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("helm values file not found at %s", helmValuesPath)
	}

	// Read file
	data, err := os.ReadFile(helmValuesPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read helm values file: %w", err)
	}

	// Parse YAML
	var values map[string]interface{}
	if err := yaml.Unmarshal(data, &values); err != nil {
		return nil, fmt.Errorf("failed to parse helm values YAML: %w", err)
	}

	return values, nil
}

// ApplyConfiguration applies configuration changes to Helm values
func (h *HelmValuesModifier) ApplyConfiguration(values map[string]interface{}, config *types.ChartConfiguration) error {
	// Update branch if it was modified
	if config.Branch != nil {
		// Update global.repoBranch
		if global, ok := values["global"].(map[string]interface{}); ok {
			global["repoBranch"] = *config.Branch
		} else {
			// Create global section if it doesn't exist
			values["global"] = map[string]interface{}{
				"repoBranch": *config.Branch,
			}
		}

		// Update apps section branch if it exists
		if apps, ok := values["apps"].(map[string]interface{}); ok {
			for _, appConfig := range apps {
				if appConfigMap, ok := appConfig.(map[string]interface{}); ok {
					if appValues, ok := appConfigMap["values"].(map[string]interface{}); ok {
						if appConfigSection, ok := appValues["config"].(map[string]interface{}); ok {
							appConfigSection["branch"] = *config.Branch
						}
					}
				}
			}
		}
	}

	// Update Docker registry if it was modified
	if config.DockerRegistry != nil {
		registry, ok := values["registry"].(map[string]interface{})
		if !ok {
			registry = make(map[string]interface{})
			values["registry"] = registry
		}
		
		// Update docker registry section
		docker, ok := registry["docker"].(map[string]interface{})
		if !ok {
			docker = make(map[string]interface{})
			registry["docker"] = docker
		}
		
		docker["username"] = config.DockerRegistry.Username
		docker["password"] = config.DockerRegistry.Password
		docker["email"] = config.DockerRegistry.Email
	}

	return nil
}

// WriteValues writes updated values back to the Helm values file
func (h *HelmValuesModifier) WriteValues(values map[string]interface{}, helmValuesPath string) error {
	// Marshal back to YAML
	updatedData, err := yaml.Marshal(values)
	if err != nil {
		return fmt.Errorf("failed to marshal updated helm values: %w", err)
	}

	// Write updated values back to file
	if err := os.WriteFile(helmValuesPath, updatedData, 0644); err != nil {
		return fmt.Errorf("failed to write updated helm values file: %w", err)
	}

	return nil
}

// GetCurrentBranch extracts the current branch from Helm values
func (h *HelmValuesModifier) GetCurrentBranch(values map[string]interface{}) string {
	if global, ok := values["global"].(map[string]interface{}); ok {
		if branch, ok := global["repoBranch"].(string); ok {
			return branch
		}
	}
	return "main" // default fallback
}

// GetCurrentDockerSettings extracts current Docker settings from Helm values
func (h *HelmValuesModifier) GetCurrentDockerSettings(values map[string]interface{}) *types.DockerRegistryConfig {
	config := &types.DockerRegistryConfig{
		Username: "default",
		Password: "****",
		Email:    "default@example.com",
	}
	
	if registry, ok := values["registry"].(map[string]interface{}); ok {
		if docker, ok := registry["docker"].(map[string]interface{}); ok {
			if username, ok := docker["username"].(string); ok {
				config.Username = username
			}
			if password, ok := docker["password"].(string); ok {
				config.Password = password
			}
			if email, ok := docker["email"].(string); ok {
				config.Email = email
			}
		}
	}
	
	return config
}