package configuration

import (
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/flamingo/openframe/internal/chart/utils/types"
)

// ConfigurationWizard handles the chart configuration workflow
type ConfigurationWizard struct {
	modifier      *templates.HelmValuesModifier
	branchConfig  *BranchConfigurator
	dockerConfig  *DockerConfigurator
	ingressConfig *IngressConfigurator
}

// NewConfigurationWizard creates a new configuration wizard
func NewConfigurationWizard() *ConfigurationWizard {
	modifier := templates.NewHelmValuesModifier()
	return &ConfigurationWizard{
		modifier:      modifier,
		branchConfig:  NewBranchConfigurator(modifier),
		dockerConfig:  NewDockerConfigurator(modifier),
		ingressConfig: NewIngressConfigurator(modifier),
	}
}

// ConfigureHelmValues reads existing Helm values and prompts user for configuration changes
func (w *ConfigurationWizard) ConfigureHelmValues() (*types.ChartConfiguration, error) {
	// Step 1: Show deployment mode selection
	deploymentMode, err := w.showDeploymentModeSelection()
	if err != nil {
		return nil, err
	}

	// Step 2: Show configuration mode selection
	modeChoice, err := w.showConfigurationModeSelection()
	if err != nil {
		return nil, err
	}

	if modeChoice == "default" {
		return w.configureWithDefaults(deploymentMode)
	}

	return w.configureInteractive(deploymentMode)
}

// ConfigureHelmValuesWithMode configures helm values with pre-selected deployment mode
func (w *ConfigurationWizard) ConfigureHelmValuesWithMode(deploymentMode types.DeploymentMode) (*types.ChartConfiguration, error) {
	// Skip deployment mode selection, use provided mode

	// Step 1: Show configuration mode selection
	modeChoice, err := w.showConfigurationModeSelection()
	if err != nil {
		return nil, err
	}

	if modeChoice == "default" {
		return w.configureWithDefaults(deploymentMode)
	}

	return w.configureInteractive(deploymentMode)
}