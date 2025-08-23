package ui

import (
	"fmt"
	"path/filepath"
	"strings"

	"github.com/flamingo/openframe/internal/chart/types"
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
)

// ConfigurationWizard handles the chart configuration workflow
type ConfigurationWizard struct {
	modifier *templates.HelmValuesModifier
}

// NewConfigurationWizard creates a new configuration wizard
func NewConfigurationWizard() *ConfigurationWizard {
	return &ConfigurationWizard{
		modifier: templates.NewHelmValuesModifier(),
	}
}

// ConfigureHelmValues reads existing Helm values and prompts user for configuration changes
func (w *ConfigurationWizard) ConfigureHelmValues(manifestsDir string) (*types.ChartConfiguration, error) {
	// Show configuration mode selection
	modeChoice, err := w.showConfigurationModeSelection()
	if err != nil {
		return nil, err
	}
	
	if modeChoice == "default" {
		return w.configureWithDefaults(manifestsDir)
	}
	
	return w.configureInteractive(manifestsDir)
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
func (w *ConfigurationWizard) configureWithDefaults(manifestsDir string) (*types.ChartConfiguration, error) {
	pterm.Info.Println("Using default configuration for chart installation")

	// Load base values from manifests directory or create default
	config, err := w.loadBaseValues(manifestsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to load base values: %w", err)
	}

	// Create temporary file with default configuration (no modifications)
	if err := w.createTemporaryValuesFile(config, manifestsDir); err != nil {
		return nil, fmt.Errorf("failed to create temporary values file: %w", err)
	}

	return config, nil
}

// configureInteractive runs the interactive configuration wizard
func (w *ConfigurationWizard) configureInteractive(manifestsDir string) (*types.ChartConfiguration, error) {
	pterm.Info.Println("Configuring Helm values for chart installation")

	// Load base values from manifests directory or create default
	config, err := w.loadBaseValues(manifestsDir)
	if err != nil {
		return nil, fmt.Errorf("failed to load base values: %w", err)
	}

	// Configure each section
	if err := w.configureBranch(config); err != nil {
		return nil, fmt.Errorf("branch configuration failed: %w", err)
	}

	if err := w.configureDockerRegistry(config); err != nil {
		return nil, fmt.Errorf("docker registry configuration failed: %w", err)
	}

	// Create temporary file with final configuration
	if err := w.createTemporaryValuesFile(config, manifestsDir); err != nil {
		return nil, fmt.Errorf("failed to create temporary values file: %w", err)
	}

	return config, nil
}

// loadBaseValues loads base values from manifests directory or creates default
func (w *ConfigurationWizard) loadBaseValues(manifestsDir string) (*types.ChartConfiguration, error) {
	values, err := w.modifier.LoadOrCreateBaseValues(manifestsDir)
	if err != nil {
		return nil, err
	}

	baseFilePath := filepath.Join(manifestsDir, "helm-values.yaml")
	
	return &types.ChartConfiguration{
		BaseHelmValuesPath: baseFilePath,
		TempHelmValuesPath: "", // Will be set when temporary file is created
		ExistingValues:     values,
		ModifiedSections:   make([]string, 0),
	}, nil
}

// createTemporaryValuesFile creates the temporary values file for installation
func (w *ConfigurationWizard) createTemporaryValuesFile(config *types.ChartConfiguration, manifestsDir string) error {
	// Apply configuration changes to values
	if err := w.modifier.ApplyConfiguration(config.ExistingValues, config); err != nil {
		return fmt.Errorf("failed to apply configuration changes: %w", err)
	}
	
	// Create temporary file
	tempFilePath, err := w.modifier.CreateTemporaryValuesFile(config.ExistingValues, manifestsDir)
	if err != nil {
		return err
	}
	
	// Update config with temporary file path
	config.TempHelmValuesPath = tempFilePath
	return nil
}

// configureBranch asks user about Git branch configuration
func (w *ConfigurationWizard) configureBranch(config *types.ChartConfiguration) error {
	// Get current branch from existing values
	currentBranch := w.modifier.GetCurrentBranch(config.ExistingValues)
	
	pterm.Info.Printf("Git Branch Configuration (current: %s)", currentBranch)
	
	options := []string{
		fmt.Sprintf("Keep existing branch (%s)", currentBranch),
		"Specify custom branch",
	}
	
	_, choice, err := sharedUI.SelectFromList("Branch configuration", options)
	if err != nil {
		return fmt.Errorf("branch choice failed: %w", err)
	}
	
	if strings.Contains(choice, "custom") {
		branch, err := pterm.DefaultInteractiveTextInput.
			WithDefaultValue(currentBranch).
			WithMultiLine(false).
			Show("Enter Git branch name:")
		
		if err != nil {
			return fmt.Errorf("branch input failed: %w", err)
		}
		
		branch = strings.TrimSpace(branch)
		if branch != currentBranch {
			config.Branch = &branch
			config.ModifiedSections = append(config.ModifiedSections, "branch")
		}
	}
	
	return nil
}

// configureDockerRegistry asks user about Docker registry configuration  
func (w *ConfigurationWizard) configureDockerRegistry(config *types.ChartConfiguration) error {
	// Get current Docker settings from existing values
	currentDocker := w.modifier.GetCurrentDockerSettings(config.ExistingValues)
	
	pterm.Info.Printf("Docker Registry Configuration (current: %s)", currentDocker.Username)
	
	options := []string{
		fmt.Sprintf("Keep existing Docker settings (%s)", currentDocker.Username),
		"Specify custom Docker settings",
	}
	
	_, choice, err := sharedUI.SelectFromList("Docker registry configuration", options)
	if err != nil {
		return fmt.Errorf("docker choice failed: %w", err)
	}
	
	if strings.Contains(choice, "custom") {
		dockerConfig, err := w.promptForDockerSettings(currentDocker)
		if err != nil {
			return err
		}
		
		// Only set if values actually changed
		if dockerConfig.Username != currentDocker.Username || 
		   dockerConfig.Password != currentDocker.Password || 
		   dockerConfig.Email != currentDocker.Email {
			config.DockerRegistry = dockerConfig
			config.ModifiedSections = append(config.ModifiedSections, "docker")
		}
	}
	
	return nil
}

// promptForDockerSettings prompts user for Docker registry settings
func (w *ConfigurationWizard) promptForDockerSettings(current *types.DockerRegistryConfig) (*types.DockerRegistryConfig, error) {
	username, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(current.Username).
		WithMultiLine(false).
		Show("Docker Registry Username:")
	if err != nil {
		return nil, fmt.Errorf("docker username input failed: %w", err)
	}

	password, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(current.Password).
		WithMask("*").
		WithMultiLine(false).
		Show("Docker Registry Password/Token:")
	if err != nil {
		return nil, fmt.Errorf("docker password input failed: %w", err)
	}

	email, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(current.Email).
		WithMultiLine(false).
		Show("Docker Registry Email:")
	if err != nil {
		return nil, fmt.Errorf("docker email input failed: %w", err)
	}

	return &types.DockerRegistryConfig{
		Username: strings.TrimSpace(username),
		Password: strings.TrimSpace(password),
		Email:    strings.TrimSpace(email),
	}, nil
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
		}
	}

	fmt.Println()
}