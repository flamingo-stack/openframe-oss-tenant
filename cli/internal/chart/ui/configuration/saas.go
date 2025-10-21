package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

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

	// Collect config repository password
	configRepoPassword, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("Read Contents token for SaaS Config repository")
	if err != nil {
		return fmt.Errorf("config repository password input failed: %w", err)
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
		RepositoryPassword:       strings.TrimSpace(repoPassword),
		ConfigRepositoryPassword: strings.TrimSpace(configRepoPassword),
		SaaSBranch:               strings.TrimSpace(saasBranch),
		OSSBranch:                strings.TrimSpace(ossBranch),
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

	// Collect config repository password
	configRepoPassword, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("Read Contents token for SaaS Config repository")
	if err != nil {
		return fmt.Errorf("config repository password input failed: %w", err)
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
		RepositoryPassword:       strings.TrimSpace(repoPassword),
		ConfigRepositoryPassword: strings.TrimSpace(configRepoPassword),
		SaaSBranch:               strings.TrimSpace(saasBranch),
		OSSBranch:                strings.TrimSpace(ossBranch),
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
