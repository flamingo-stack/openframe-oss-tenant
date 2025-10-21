package services

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
)

// ConfigurationValidator validates helm-values.yaml for non-interactive mode
type ConfigurationValidator struct{}

// NewConfigurationValidator creates a new configuration validator
func NewConfigurationValidator() *ConfigurationValidator {
	return &ConfigurationValidator{}
}

// ValidateConfiguration validates configuration for non-interactive mode
func (v *ConfigurationValidator) ValidateConfiguration(config *types.ChartConfiguration) error {
	if config.DeploymentMode == nil {
		return fmt.Errorf("deployment mode is required")
	}

	mode := *config.DeploymentMode
	values := config.ExistingValues

	switch mode {
	case types.DeploymentModeOSS:
		return v.validateOSSConfiguration(values)
	case types.DeploymentModeSaaS:
		return v.validateSaaSConfiguration(values)
	case types.DeploymentModeSaaSShared:
		return v.validateSaaSSharedConfiguration(values)
	default:
		return fmt.Errorf("unknown deployment mode: %s", mode)
	}
}

// validateOSSConfiguration validates OSS deployment configuration
func (v *ConfigurationValidator) validateOSSConfiguration(values map[string]interface{}) error {
	// Check OSS deployment is enabled
	if !v.isDeploymentEnabled(values, "oss") {
		return fmt.Errorf("OSS deployment must be enabled in helm-values.yaml")
	}

	return nil
}

// validateSaaSConfiguration validates SaaS deployment configuration
func (v *ConfigurationValidator) validateSaaSConfiguration(values map[string]interface{}) error {
	// Check SaaS deployment is enabled
	if !v.isDeploymentEnabled(values, "saas") {
		return fmt.Errorf("SaaS deployment must be enabled in helm-values.yaml")
	}

	// Check SaaS repository password
	if !v.hasPassword(values, "saas", "repository") {
		return fmt.Errorf("SaaS repository password must be configured in helm-values.yaml")
	}

	// Check SaaS config password
	if !v.hasPassword(values, "saas", "config") {
		return fmt.Errorf("SaaS config repository password must be configured in helm-values.yaml")
	}

	// Check GHCR credentials
	if !v.hasGHCRCredentials(values) {
		return fmt.Errorf("GHCR registry credentials must be configured in helm-values.yaml")
	}

	return nil
}

// validateSaaSSharedConfiguration validates SaaS Shared deployment configuration
func (v *ConfigurationValidator) validateSaaSSharedConfiguration(values map[string]interface{}) error {
	// Check SaaS deployment is enabled
	if !v.isDeploymentEnabled(values, "saas") {
		return fmt.Errorf("SaaS deployment must be enabled in helm-values.yaml")
	}

	// Check SaaS repository password
	if !v.hasPassword(values, "saas", "repository") {
		return fmt.Errorf("SaaS repository password must be configured in helm-values.yaml")
	}

	// Check GHCR credentials
	if !v.hasGHCRCredentials(values) {
		return fmt.Errorf("GHCR registry credentials must be configured in helm-values.yaml")
	}

	return nil
}

// Helper validation methods

// isDeploymentEnabled checks if a deployment type is enabled
func (v *ConfigurationValidator) isDeploymentEnabled(values map[string]interface{}, deploymentType string) bool {
	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if section, ok := deployment[deploymentType].(map[string]interface{}); ok {
			if enabled, ok := section["enabled"].(bool); ok {
				return enabled
			}
		}
	}
	return false
}

// hasBranch checks if a deployment type has a branch configured
func (v *ConfigurationValidator) hasBranch(values map[string]interface{}, deploymentType string) bool {
	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if section, ok := deployment[deploymentType].(map[string]interface{}); ok {
			if repository, ok := section["repository"].(map[string]interface{}); ok {
				if branch, ok := repository["branch"].(string); ok {
					return strings.TrimSpace(branch) != ""
				}
			}
		}
	}
	return false
}

// hasPassword checks if a deployment type has a password configured
func (v *ConfigurationValidator) hasPassword(values map[string]interface{}, deploymentType, passwordType string) bool {
	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if section, ok := deployment[deploymentType].(map[string]interface{}); ok {
			if passwordSection, ok := section[passwordType].(map[string]interface{}); ok {
				if password, ok := passwordSection["password"].(string); ok {
					return strings.TrimSpace(password) != ""
				}
			}
		}
	}
	return false
}

// hasGHCRCredentials checks if GHCR registry credentials are configured
func (v *ConfigurationValidator) hasGHCRCredentials(values map[string]interface{}) bool {
	if registry, ok := values["registry"].(map[string]interface{}); ok {
		if ghcr, ok := registry["ghcr"].(map[string]interface{}); ok {
			username, hasUsername := ghcr["username"].(string)
			password, hasPassword := ghcr["password"].(string)
			return hasUsername && hasPassword &&
				strings.TrimSpace(username) != "" &&
				strings.TrimSpace(password) != ""
		}
	}
	return false
}
