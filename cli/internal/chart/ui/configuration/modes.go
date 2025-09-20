package configuration

import (
	"fmt"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
)

// showDeploymentModeSelection shows the deployment mode selection
func (w *ConfigurationWizard) showDeploymentModeSelection() (types.DeploymentMode, error) {
	pterm.Info.Printf("Select your deployment mode:\n")
	fmt.Println()

	prompt := promptui.Select{
		Label: "Deployment Mode",
		Items: []string{
			"OSS Tenant deployment (Default self-hosted version)",
			"SaaS Tenant deployment",
		},
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
			Selected: "{{ . | green }}",
		},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return "", err
	}

	if idx == 0 {
		return types.DeploymentModeOSS, nil
	}
	return types.DeploymentModeSaaS, nil
}

// showConfigurationModeSelection shows the initial configuration mode selection
func (w *ConfigurationWizard) showConfigurationModeSelection() (string, error) {
	fmt.Println()
	pterm.Info.Printf("How would you like to configure your chart installation?\n")
	fmt.Println()

	prompt := promptui.Select{
		Label: "Configuration Mode",
		Items: []string{
			"Default configuration",
			"Interactive configuration",
		},
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
			Selected: "{{ . | green }}",
		},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return "", err
	}

	if idx == 0 {
		return "default", nil
	}
	return "interactive", nil
}

// configureWithDefaults creates a default configuration without user interaction
func (w *ConfigurationWizard) configureWithDefaults(deploymentMode types.DeploymentMode) (*types.ChartConfiguration, error) {
	pterm.Info.Printf("Using default configuration for %s deployment\n", string(deploymentMode))

	// Load base values from current directory or create default
	config, err := w.loadBaseValues()
	if err != nil {
		return nil, fmt.Errorf("failed to load base values: %w", err)
	}

	// Set deployment mode
	config.DeploymentMode = &deploymentMode
	config.ModifiedSections = append(config.ModifiedSections, "deployment")

	// Configure SaaS-specific settings if in SaaS mode
	if deploymentMode == types.DeploymentModeSaaS {
		if err := w.configureSaaSDefaults(config); err != nil {
			return nil, fmt.Errorf("SaaS configuration failed: %w", err)
		}
	}

	// Create temporary file with default configuration
	if err := w.createTemporaryValuesFile(config); err != nil {
		return nil, fmt.Errorf("failed to create temporary values file: %w", err)
	}

	return config, nil
}

// configureInteractive runs the interactive configuration wizard
func (w *ConfigurationWizard) configureInteractive(deploymentMode types.DeploymentMode) (*types.ChartConfiguration, error) {
	pterm.Info.Printf("Configuring Helm values for %s deployment\n", string(deploymentMode))

	// Load base values from current directory or create default
	config, err := w.loadBaseValues()
	if err != nil {
		return nil, fmt.Errorf("failed to load base values: %w", err)
	}

	// Set deployment mode
	config.DeploymentMode = &deploymentMode
	config.ModifiedSections = append(config.ModifiedSections, "deployment")

	// Configure SaaS-specific settings if in SaaS mode
	if deploymentMode == types.DeploymentModeSaaS {
		if err := w.configureSaaSInteractive(config); err != nil {
			return nil, fmt.Errorf("SaaS configuration failed: %w", err)
		}
	}

	// Configure each section in the correct order
	if err := w.branchConfig.Configure(config); err != nil {
		return nil, fmt.Errorf("branch configuration failed: %w", err)
	}

	if err := w.dockerConfig.Configure(config); err != nil {
		return nil, fmt.Errorf("docker registry configuration failed: %w", err)
	}

	if err := w.ingressConfig.Configure(config); err != nil {
		return nil, fmt.Errorf("ingress configuration failed: %w", err)
	}

	// Create temporary file with final configuration
	if err := w.createTemporaryValuesFile(config); err != nil {
		return nil, fmt.Errorf("failed to create temporary values file: %w", err)
	}

	return config, nil
}