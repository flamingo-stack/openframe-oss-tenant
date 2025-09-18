package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/flamingo/openframe/internal/chart/utils/types"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
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

// configureSaaSDefaults configures required SaaS settings with prompts (even in default mode)
func (w *ConfigurationWizard) configureSaaSDefaults(config *types.ChartConfiguration) error {
	pterm.Warning.Println("SaaS deployment requires additional access")
	fmt.Println()

	// Collect repository password
	repoPassword, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("Read Contents token for SaaS repository")
	if err != nil {
		return fmt.Errorf("repository password input failed: %w", err)
	}

	// Configure GitHub container registry credentials (same UI as interactive mode)
	ghcrUsername, ghcrPassword, ghcrEmail, err := w.configureGHCRCredentials(config)
	if err != nil {
		return fmt.Errorf("GHCR credentials configuration failed: %w", err)
	}

	// Use existing branch values from helm-values.yaml without prompting (for default configuration mode)
	saasBranch := w.getSaaSBranchFromValues(config.ExistingValues)
	ossBranch := w.modifier.GetCurrentOSSBranch(config.ExistingValues)

	// Set configurations
	config.SaaSConfig = &types.SaaSConfig{
		RepositoryPassword: strings.TrimSpace(repoPassword),
		SaaSBranch:         strings.TrimSpace(saasBranch),
		OSSBranch:          strings.TrimSpace(ossBranch),
	}

	config.DockerRegistry = &types.DockerRegistryConfig{
		Username: strings.TrimSpace(ghcrUsername),
		Password: strings.TrimSpace(ghcrPassword),
		Email:    strings.TrimSpace(ghcrEmail),
	}

	config.ModifiedSections = append(config.ModifiedSections, "saas", "docker")

	return nil
}

// configureSaaSInteractive configures SaaS settings in interactive mode
func (w *ConfigurationWizard) configureSaaSInteractive(config *types.ChartConfiguration) error {
	pterm.Warning.Println("SaaS deployment requires additional access")
	fmt.Println()

	// Collect repository password
	repoPassword, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("Read Contents token for SaaS repository")
	if err != nil {
		return fmt.Errorf("repository password input failed: %w", err)
	}

	// Configure GitHub container registry credentials
	ghcrUsername, ghcrPassword, ghcrEmail, err := w.configureGHCRCredentials(config)
	if err != nil {
		return fmt.Errorf("GHCR credentials configuration failed: %w", err)
	}

	// Configure SaaS repository branch (only in interactive mode)
	saasBranch, err := w.configureSaaSBranch(config)
	if err != nil {
		return fmt.Errorf("SaaS branch configuration failed: %w", err)
	}

	// Configure OSS repository branch (only in interactive mode)
	ossBranch, err := w.configureOSSBranchForSaaS(config)
	if err != nil {
		return fmt.Errorf("OSS branch configuration failed: %w", err)
	}

	// Set configurations
	config.SaaSConfig = &types.SaaSConfig{
		RepositoryPassword: strings.TrimSpace(repoPassword),
		SaaSBranch:         strings.TrimSpace(saasBranch),
		OSSBranch:          strings.TrimSpace(ossBranch),
	}

	config.DockerRegistry = &types.DockerRegistryConfig{
		Username: strings.TrimSpace(ghcrUsername),
		Password: strings.TrimSpace(ghcrPassword),
		Email:    strings.TrimSpace(ghcrEmail),
	}

	config.ModifiedSections = append(config.ModifiedSections, "saas", "docker")

	return nil
}

// configureSaaSBranch configures the SaaS repository branch with OSS-style options
func (w *ConfigurationWizard) configureSaaSBranch(config *types.ChartConfiguration) (string, error) {
	// Get current SaaS branch from existing values if available
	currentBranch := "main" // default
	if config.ExistingValues != nil {
		if deployment, ok := config.ExistingValues["deployment"].(map[string]interface{}); ok {
			if saas, ok := deployment["saas"].(map[string]interface{}); ok {
				if repository, ok := saas["repository"].(map[string]interface{}); ok {
					if branch, ok := repository["branch"].(string); ok {
						currentBranch = branch
					}
				}
			}
		}
	}

	pterm.Info.Printf("SaaS Repository Branch Configuration (current: %s)", currentBranch)

	options := []string{
		fmt.Sprintf("Keep '%s' branch", currentBranch),
		"Specify custom branch",
	}

	_, choice, err := sharedUI.SelectFromList("SaaS tenant repository branch", options)
	if err != nil {
		return "", fmt.Errorf("SaaS branch choice failed: %w", err)
	}

	if strings.Contains(choice, "custom") {
		branch, err := pterm.DefaultInteractiveTextInput.
			WithDefaultValue(currentBranch).
			WithMultiLine(false).
			Show("Enter SaaS tenant repository branch name")

		if err != nil {
			return "", fmt.Errorf("SaaS branch input failed: %w", err)
		}

		return strings.TrimSpace(branch), nil
	}

	return currentBranch, nil
}

// configureOSSBranchForSaaS configures the OSS repository branch in SaaS context
func (w *ConfigurationWizard) configureOSSBranchForSaaS(config *types.ChartConfiguration) (string, error) {
	// Get current OSS branch from existing values
	currentBranch := w.modifier.GetCurrentOSSBranch(config.ExistingValues)

	pterm.Info.Printf("OSS Repository Branch Configuration (current: %s)", currentBranch)

	options := []string{
		fmt.Sprintf("Keep '%s' branch", currentBranch),
		"Specify custom branch",
	}

	_, choice, err := sharedUI.SelectFromList("OSS tenant repository branch", options)
	if err != nil {
		return "", fmt.Errorf("OSS branch choice failed: %w", err)
	}

	if strings.Contains(choice, "custom") {
		branch, err := pterm.DefaultInteractiveTextInput.
			WithDefaultValue(currentBranch).
			WithMultiLine(false).
			Show("Enter OSS tenant repository branch name")

		if err != nil {
			return "", fmt.Errorf("OSS branch input failed: %w", err)
		}

		return strings.TrimSpace(branch), nil
	}

	return currentBranch, nil
}

// configureGHCRCredentials configures GHCR credentials with selection UI
func (w *ConfigurationWizard) configureGHCRCredentials(config *types.ChartConfiguration) (string, string, string, error) {
	// Get current GHCR credentials from existing values if available
	currentUsername := "default"
	currentEmail := "default@example.com"
	hasExistingCredentials := false

	if config.ExistingValues != nil {
		if registry, ok := config.ExistingValues["registry"].(map[string]interface{}); ok {
			if ghcr, ok := registry["ghcr"].(map[string]interface{}); ok {
				if username, ok := ghcr["username"].(string); ok && username != "" && username != "default" {
					currentUsername = username
					hasExistingCredentials = true
				}
				if email, ok := ghcr["email"].(string); ok && email != "" && email != "default@example.com" {
					currentEmail = email
				}
			}
		}
	}

	pterm.Info.Printf("GHCR Registry Credentials Configuration")

	options := []string{
		"Configure GHCR credentials",
	}

	if hasExistingCredentials {
		options = []string{
			fmt.Sprintf("Keep existing GHCR credentials (%s)", currentUsername),
			"Update GHCR credentials",
		}
	}

	_, choice, err := sharedUI.SelectFromList("GHCR credentials", options)
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR credentials choice failed: %w", err)
	}

	// If user chooses to keep existing credentials and they exist
	if hasExistingCredentials && strings.Contains(choice, "Keep existing") {
		// Still need to collect password as it's not stored in plain text
		password, err := pterm.DefaultInteractiveTextInput.
			WithMask("*").
			WithMultiLine(false).
			Show("GHCR Registry Password/Token (required)")
		if err != nil {
			return "", "", "", fmt.Errorf("GHCR password input failed: %w", err)
		}
		return currentUsername, strings.TrimSpace(password), currentEmail, nil
	}

	// Collect GHCR credentials
	username, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(currentUsername).
		WithMultiLine(false).
		Show("GHCR Registry Username")
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR username input failed: %w", err)
	}

	password, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("GHCR Registry Password/Token")
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR password input failed: %w", err)
	}

	email, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(currentEmail).
		WithMultiLine(false).
		Show("GHCR Registry Email")
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR email input failed: %w", err)
	}

	return strings.TrimSpace(username), strings.TrimSpace(password), strings.TrimSpace(email), nil
}

// getSaaSBranchFromValues extracts the current SaaS repository branch from existing values
func (w *ConfigurationWizard) getSaaSBranchFromValues(values map[string]interface{}) string {
	if values == nil {
		return "main" // default fallback
	}

	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if saas, ok := deployment["saas"].(map[string]interface{}); ok {
			if repository, ok := saas["repository"].(map[string]interface{}); ok {
				if branch, ok := repository["branch"].(string); ok {
					return branch
				}
			}
		}
	}

	return "main" // default fallback
}
