package configuration

import (
	"fmt"

	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
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
	// Show configuration mode selection
	modeChoice, err := w.showConfigurationModeSelection()
	if err != nil {
		return nil, err
	}

	if modeChoice == "default" {
		return w.configureWithDefaults()
	}

	return w.configureInteractive()
}

// showConfigurationModeSelection shows the initial configuration mode selection
func (w *ConfigurationWizard) showConfigurationModeSelection() (string, error) {
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
func (w *ConfigurationWizard) configureWithDefaults() (*types.ChartConfiguration, error) {
	pterm.Info.Println("Using default configuration for chart installation")

	// Load base values from current directory or create default
	config, err := w.loadBaseValues()
	if err != nil {
		return nil, fmt.Errorf("failed to load base values: %w", err)
	}

	// Create temporary file with default configuration (no modifications)
	if err := w.createTemporaryValuesFile(config); err != nil {
		return nil, fmt.Errorf("failed to create temporary values file: %w", err)
	}

	return config, nil
}

// configureInteractive runs the interactive configuration wizard
func (w *ConfigurationWizard) configureInteractive() (*types.ChartConfiguration, error) {
	pterm.Info.Println("Configuring Helm values for chart installation")

	// Load base values from current directory or create default
	config, err := w.loadBaseValues()
	if err != nil {
		return nil, fmt.Errorf("failed to load base values: %w", err)
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
