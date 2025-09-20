package configuration

import (
	"fmt"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/pterm/pterm"
)

// loadBaseValues loads base values from current directory or creates default
func (w *ConfigurationWizard) loadBaseValues() (*types.ChartConfiguration, error) {
	values, err := w.modifier.LoadOrCreateBaseValues()
	if err != nil {
		return nil, err
	}

	baseFilePath := "helm-values.yaml"

	return &types.ChartConfiguration{
		BaseHelmValuesPath: baseFilePath,
		TempHelmValuesPath: "", // Will be set when temporary file is created
		ExistingValues:     values,
		ModifiedSections:   make([]string, 0),
	}, nil
}

// createTemporaryValuesFile creates the temporary values file for installation
func (w *ConfigurationWizard) createTemporaryValuesFile(config *types.ChartConfiguration) error {
	// Apply configuration changes to values
	if err := w.modifier.ApplyConfiguration(config.ExistingValues, config); err != nil {
		return fmt.Errorf("failed to apply configuration changes: %w", err)
	}

	// Create temporary file in current directory
	tempFilePath, err := w.modifier.CreateTemporaryValuesFile(config.ExistingValues)
	if err != nil {
		return err
	}

	// Update config with temporary file path
	config.TempHelmValuesPath = tempFilePath
	return nil
}

// ShowConfigurationSummary displays the modified configuration sections
func (w *ConfigurationWizard) ShowConfigurationSummary(config *types.ChartConfiguration) {
	if len(config.ModifiedSections) == 0 {
		return // No changes made
	}

	pterm.Info.Println("Configuration Summary:")
	fmt.Println()

	for _, section := range config.ModifiedSections {
		switch section {
		case "deployment":
			if config.DeploymentMode != nil {
				pterm.Success.Printf("✓ Deployment mode: %s\n", string(*config.DeploymentMode))
			}
		case "saas":
			if config.SaaSConfig != nil {
				pterm.Success.Printf("✓ SaaS repository password configured\n")
			}
		case "branch":
			if config.Branch != nil {
				pterm.Success.Printf("✓ Branch updated: %s\n", *config.Branch)
			}
		case "docker":
			if config.DockerRegistry != nil {
				pterm.Success.Printf("✓ Docker registry updated: %s\n", config.DockerRegistry.Username)
			}
		case "ingress":
			if config.IngressConfig != nil {
				pterm.Success.Printf("✓ Ingress type updated: %s\n", config.IngressConfig.Type)
				if config.IngressConfig.Type == types.IngressTypeNgrok && config.IngressConfig.NgrokConfig != nil {
					pterm.Success.Printf("  - Ngrok domain: %s\n", config.IngressConfig.NgrokConfig.Domain)
				}
			}
		}
	}

	fmt.Println()
}