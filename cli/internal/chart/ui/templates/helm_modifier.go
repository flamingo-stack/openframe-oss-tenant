package templates

import (
	"fmt"
	"os"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
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

	// Handle empty file case - yaml.Unmarshal returns nil for empty content
	if values == nil {
		values = make(map[string]interface{})
	}

	return values, nil
}

// LoadOrCreateBaseValues loads helm values from current directory or creates default if missing
func (h *HelmValuesModifier) LoadOrCreateBaseValues() (map[string]interface{}, error) {
	baseHelmValuesPath := "helm-values.yaml"

	// Try to load existing file from current directory
	if _, err := os.Stat(baseHelmValuesPath); err == nil {
		return h.LoadExistingValues(baseHelmValuesPath)
	}

	// File doesn't exist, create empty values (only configured sections will be added)
	emptyValues := make(map[string]interface{})

	return emptyValues, nil
}

// CreateTemporaryValuesFile creates a temporary helm values file in current directory
func (h *HelmValuesModifier) CreateTemporaryValuesFile(values map[string]interface{}) (string, error) {
	// Create temporary file in current directory
	tempFile := "helm-values-tmp.yaml"

	// Write values to temporary file
	err := h.WriteValues(values, tempFile)
	if err != nil {
		return "", fmt.Errorf("failed to create temporary values file: %w", err)
	}

	return tempFile, nil
}

// ApplyConfiguration applies configuration changes to Helm values
func (h *HelmValuesModifier) ApplyConfiguration(values map[string]interface{}, config *types.ChartConfiguration) error {
	// Update deployment mode if it was modified
	if config.DeploymentMode != nil {
		if err := h.applyDeploymentMode(values, *config.DeploymentMode); err != nil {
			return fmt.Errorf("failed to apply deployment mode: %w", err)
		}
	}

	// Update branch if it was modified - handle deployment-specific branches
	if config.Branch != nil {
		// For OSS deployment, update deployment.oss.repository.branch
		if config.DeploymentMode != nil && *config.DeploymentMode == types.DeploymentModeOSS {
			if err := h.updateOSSBranch(values, *config.Branch); err != nil {
				return fmt.Errorf("failed to update OSS branch: %w", err)
			}
		}
		// For SaaS deployment, branch is handled in applySaaSConfig
	}

	// Update Docker registry if it was modified
	if config.DockerRegistry != nil {
		registry, ok := values["registry"].(map[string]interface{})
		if !ok {
			registry = make(map[string]interface{})
			values["registry"] = registry
		}

		// For SaaS and SaaS Shared modes, update GHCR registry; for OSS, update docker registry
		if config.DeploymentMode != nil && (*config.DeploymentMode == types.DeploymentModeSaaS || *config.DeploymentMode == types.DeploymentModeSaaSShared) {
			// Update GHCR registry section for SaaS and SaaS Shared
			ghcr, ok := registry["ghcr"].(map[string]interface{})
			if !ok {
				ghcr = make(map[string]interface{})
				registry["ghcr"] = ghcr
			}

			ghcr["username"] = config.DockerRegistry.Username
			ghcr["password"] = config.DockerRegistry.Password
			ghcr["email"] = config.DockerRegistry.Email
		} else {
			// Update docker registry section for OSS
			docker, ok := registry["docker"].(map[string]interface{})
			if !ok {
				docker = make(map[string]interface{})
				registry["docker"] = docker
			}

			docker["username"] = config.DockerRegistry.Username
			docker["password"] = config.DockerRegistry.Password
			docker["email"] = config.DockerRegistry.Email
		}
	}

	// Update SaaS-specific configuration if it was modified
	if config.SaaSConfig != nil {
		if err := h.applySaaSConfig(values, *config.SaaSConfig); err != nil {
			return fmt.Errorf("failed to apply SaaS configuration: %w", err)
		}
	}

	return nil
}

// applyDeploymentMode applies deployment mode configuration to Helm values
func (h *HelmValuesModifier) applyDeploymentMode(values map[string]interface{}, mode types.DeploymentMode) error {
	// Ensure deployment section exists
	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	// Configure deployment mode
	switch mode {
	case types.DeploymentModeOSS:
		// Enable OSS, disable SaaS
		h.ensureDeploymentSection(deployment, "oss", true)
		h.ensureDeploymentSection(deployment, "saas", false)
	case types.DeploymentModeSaaS, types.DeploymentModeSaaSShared:
		// Enable SaaS, disable OSS
		// SaaS Shared uses the same Helm configuration as SaaS but with different repository
		h.ensureDeploymentSection(deployment, "oss", false)
		h.ensureDeploymentSection(deployment, "saas", true)
	default:
		return fmt.Errorf("unknown deployment mode: %s", mode)
	}

	return nil
}

// ensureDeploymentSection ensures a deployment section exists with the specified enabled state
func (h *HelmValuesModifier) ensureDeploymentSection(deployment map[string]interface{}, sectionName string, enabled bool) {
	section, ok := deployment[sectionName].(map[string]interface{})
	if !ok {
		section = make(map[string]interface{})
		deployment[sectionName] = section
	}
	section["enabled"] = enabled
}

// applySaaSConfig applies SaaS-specific configuration to Helm values
func (h *HelmValuesModifier) applySaaSConfig(values map[string]interface{}, saasConfig types.SaaSConfig) error {
	// Ensure deployment section exists
	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	// Configure SaaS repository settings
	saas, ok := deployment["saas"].(map[string]interface{})
	if !ok {
		saas = make(map[string]interface{})
		deployment["saas"] = saas
	}

	// Ensure SaaS repository section exists
	saasRepository, ok := saas["repository"].(map[string]interface{})
	if !ok {
		saasRepository = make(map[string]interface{})
		saas["repository"] = saasRepository
	}

	// Set SaaS repository password and branch
	saasRepository["password"] = saasConfig.RepositoryPassword
	saasRepository["branch"] = saasConfig.SaaSBranch

	// Ensure SaaS config section exists
	saasConfigSection, ok := saas["config"].(map[string]interface{})
	if !ok {
		saasConfigSection = make(map[string]interface{})
		saas["config"] = saasConfigSection
	}

	// Set SaaS config repository password
	saasConfigSection["password"] = saasConfig.ConfigRepositoryPassword

	// Configure OSS repository settings
	oss, ok := deployment["oss"].(map[string]interface{})
	if !ok {
		oss = make(map[string]interface{})
		deployment["oss"] = oss
	}

	// Ensure OSS repository section exists
	ossRepository, ok := oss["repository"].(map[string]interface{})
	if !ok {
		ossRepository = make(map[string]interface{})
		oss["repository"] = ossRepository
	}

	// Set OSS repository branch
	ossRepository["branch"] = saasConfig.OSSBranch

	return nil
}

// updateOSSBranch updates the OSS repository branch
func (h *HelmValuesModifier) updateOSSBranch(values map[string]interface{}, branch string) error {
	// Ensure deployment section exists
	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	// Ensure OSS section exists
	oss, ok := deployment["oss"].(map[string]interface{})
	if !ok {
		oss = make(map[string]interface{})
		deployment["oss"] = oss
	}

	// Ensure repository section exists
	repository, ok := oss["repository"].(map[string]interface{})
	if !ok {
		repository = make(map[string]interface{})
		oss["repository"] = repository
	}

	// Set the branch
	repository["branch"] = branch

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

// GetCurrentBranch extracts the current branch from Helm values (legacy method)
func (h *HelmValuesModifier) GetCurrentBranch(values map[string]interface{}) string {
	// First check for deployment-specific branch
	if branch := h.GetCurrentOSSBranch(values); branch != "main" {
		return branch
	}
	// Fall back to legacy global setting
	if global, ok := values["global"].(map[string]interface{}); ok {
		if branch, ok := global["repoBranch"].(string); ok {
			return branch
		}
	}
	return "main" // default fallback
}

// GetCurrentOSSBranch extracts the current OSS repository branch from Helm values
func (h *HelmValuesModifier) GetCurrentOSSBranch(values map[string]interface{}) string {
	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if oss, ok := deployment["oss"].(map[string]interface{}); ok {
			if repository, ok := oss["repository"].(map[string]interface{}); ok {
				if branch, ok := repository["branch"].(string); ok {
					return branch
				}
			}
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

// GetCurrentIngressSettings extracts current ingress settings from Helm values
func (h *HelmValuesModifier) GetCurrentIngressSettings(values map[string]interface{}) string {
	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if oss, ok := deployment["oss"].(map[string]interface{}); ok {
			if ingress, ok := oss["ingress"].(map[string]interface{}); ok {
				// Check if ngrok is enabled
				if ngrok, ok := ingress["ngrok"].(map[string]interface{}); ok {
					if enabled, ok := ngrok["enabled"].(bool); ok && enabled {
						return "ngrok"
					}
				}

				// Check if localhost is enabled
				if localhost, ok := ingress["localhost"].(map[string]interface{}); ok {
					if enabled, ok := localhost["enabled"].(bool); ok && enabled {
						return "localhost"
					}
				}
			}
		}
	}

	return "localhost" // default fallback
}

// GetCurrentDeploymentMode extracts the current deployment mode from Helm values
func (h *HelmValuesModifier) GetCurrentDeploymentMode(values map[string]interface{}) types.DeploymentMode {
	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		// Check if SaaS is enabled
		if saas, ok := deployment["saas"].(map[string]interface{}); ok {
			if enabled, ok := saas["enabled"].(bool); ok && enabled {
				return types.DeploymentModeSaaS
			}
		}

		// Check if OSS is enabled (or default to OSS)
		if oss, ok := deployment["oss"].(map[string]interface{}); ok {
			if enabled, ok := oss["enabled"].(bool); ok && enabled {
				return types.DeploymentModeOSS
			}
		}
	}

	return types.DeploymentModeOSS // default fallback
}
