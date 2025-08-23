package config

import (
	"os"

	"github.com/flamingo/openframe/internal/chart/models"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/flamingo/openframe/internal/shared/config"
	"github.com/pterm/pterm"
	"gopkg.in/yaml.v3"
)

// Builder handles construction of installation configurations
type Builder struct {
	configService       *Service
	operationsUI        *chartUI.OperationsUI
	credentialsPrompter *config.CredentialsPrompter
}

// NewBuilder creates a new configuration builder
func NewBuilder(operationsUI *chartUI.OperationsUI) *Builder {
	return &Builder{
		configService:       NewService(),
		operationsUI:        operationsUI,
		credentialsPrompter: config.NewCredentialsPrompter(),
	}
}

// HelmValues represents the structure of the Helm values file
type HelmValues struct {
	Global struct {
		RepoBranch string `yaml:"repoBranch"`
	} `yaml:"global"`
}

// getBranchFromHelmValues reads the Helm values file and extracts global.repoBranch
func (b *Builder) getBranchFromHelmValues() string {
	pathResolver := NewPathResolver()
	helmValuesPath := pathResolver.GetHelmValuesFile()
	
	// Read the YAML file
	data, err := os.ReadFile(helmValuesPath)
	if err != nil {
		// If we can't read the file, return empty string (will use default)
		return ""
	}
	
	var values HelmValues
	err = yaml.Unmarshal(data, &values)
	if err != nil {
		// If we can't parse the YAML, return empty string (will use default)
		return ""
	}
	
	return values.Global.RepoBranch
}

// BuildInstallConfig constructs the installation configuration
func (b *Builder) BuildInstallConfig(
	force, dryRun, verbose bool,
	clusterName, githubRepo, githubBranch, githubUsername, githubToken, certDir string,
) (ChartInstallConfig, error) {
	// Use config service for certificate directory
	if certDir == "" {
		certDir = b.configService.GetCertificateDirectory()
	}

	// Create app-of-apps configuration if GitHub repo is provided
	var appOfAppsConfig *models.AppOfAppsConfig
	if githubRepo != "" {
		appOfAppsConfig = models.NewAppOfAppsConfig()
		appOfAppsConfig.GitHubRepo = githubRepo
		appOfAppsConfig.GitHubBranch = githubBranch
		appOfAppsConfig.CertDir = certDir

		// Use shared credentials prompter if not both provided via flags
		if b.credentialsPrompter.IsCredentialsRequired(githubUsername, githubToken) {
			credentials, err := b.credentialsPrompter.PromptForGitHubCredentials(githubRepo)
			if err != nil {
				return ChartInstallConfig{}, err
			}
			appOfAppsConfig.GitHubUsername = credentials.Username
			appOfAppsConfig.GitHubToken = credentials.Token
		} else {
			appOfAppsConfig.GitHubUsername = githubUsername
			appOfAppsConfig.GitHubToken = githubToken
		}

		// After credentials are provided, check for branch override from Helm values
		helmBranch := b.getBranchFromHelmValues()
		if helmBranch != "" {
			if verbose {
				pterm.Info.Printf("📥 Using branch '%s' from Helm values (global.repoBranch)\n", helmBranch)
			}
			appOfAppsConfig.GitHubBranch = helmBranch
		} else if verbose {
			pterm.Info.Printf("📥 Using default branch '%s'\n", appOfAppsConfig.GitHubBranch)
		}
	}

	return b.configService.BuildInstallConfig(
		force, dryRun, verbose,
		clusterName,
		appOfAppsConfig,
	), nil
}
