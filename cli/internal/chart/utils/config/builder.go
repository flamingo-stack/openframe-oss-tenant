package config

import (
	"os"

	"github.com/flamingo/openframe/internal/chart/models"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/pterm/pterm"
	"gopkg.in/yaml.v3"
)

// Builder handles construction of installation configurations
type Builder struct {
	configService *Service
	operationsUI  *chartUI.OperationsUI
}

// NewBuilder creates a new configuration builder
func NewBuilder(operationsUI *chartUI.OperationsUI) *Builder {
	return &Builder{
		configService: NewService(),
		operationsUI:  operationsUI,
	}
}

// HelmValues represents the structure of the Helm values file
type HelmValues struct {
	Deployment struct {
		OSS struct {
			Enabled bool `yaml:"enabled"`
			Repository struct {
				Branch string `yaml:"branch"`
			} `yaml:"repository"`
		} `yaml:"oss"`
		SaaS struct {
			Enabled bool `yaml:"enabled"`
			Repository struct {
				Branch string `yaml:"branch"`
			} `yaml:"repository"`
		} `yaml:"saas"`
	} `yaml:"deployment"`
}

// getBranchForDeploymentMode reads the Helm values and returns the appropriate branch based on deployment mode
func (b *Builder) getBranchForDeploymentMode(helmValuesPath string, deploymentMode string) string {
	if helmValuesPath == "" {
		pathResolver := NewPathResolver()
		helmValuesPath = pathResolver.GetHelmValuesFile()
	}

	// Read the YAML file
	data, err := os.ReadFile(helmValuesPath)
	if err != nil {
		return ""
	}

	var values HelmValues
	err = yaml.Unmarshal(data, &values)
	if err != nil {
		return ""
	}

	// Branch selection based on deployment mode:
	// - SaaS Shared: use deployment.saas.repository.branch (app-of-apps from saas-shared repo)
	// - SaaS Tenant: use deployment.oss.repository.branch (app-of-apps from oss-tenant repo)
	// - OSS Tenant: use deployment.oss.repository.branch (app-of-apps from oss-tenant repo)
	if deploymentMode == "saas-shared" {
		// SaaS Shared uses the saas branch
		if values.Deployment.SaaS.Repository.Branch != "" {
			return values.Deployment.SaaS.Repository.Branch
		}
	} else {
		// OSS and SaaS Tenant both use the OSS branch
		if values.Deployment.OSS.Repository.Branch != "" {
			return values.Deployment.OSS.Repository.Branch
		}
	}

	return "" // Return empty string if no branch found
}

// getBranchFromHelmValues reads the Helm values file and extracts branch from deployment structure or legacy global structure
func (b *Builder) getBranchFromHelmValues() string {
	return b.getBranchFromHelmValuesPath("")
}

// getBranchFromHelmValuesPath reads a specific Helm values file and extracts branch from deployment structure or legacy global structure
func (b *Builder) getBranchFromHelmValuesPath(helmValuesPath string) string {
	if helmValuesPath == "" {
		pathResolver := NewPathResolver()
		helmValuesPath = pathResolver.GetHelmValuesFile()
	}

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

	// Check which deployment mode is enabled and use the appropriate branch
	if values.Deployment.SaaS.Enabled && values.Deployment.SaaS.Repository.Branch != "" {
		// For SaaS and SaaS Shared modes, use the SaaS branch
		return values.Deployment.SaaS.Repository.Branch
	} else if values.Deployment.OSS.Repository.Branch != "" {
		// For OSS mode, use the OSS branch
		return values.Deployment.OSS.Repository.Branch
	}

	return "" // Return empty string if no branch found
}

// BuildInstallConfig constructs the installation configuration
func (b *Builder) BuildInstallConfig(
	force, dryRun, verbose bool,
	clusterName, githubRepo, githubBranch, certDir string,
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

		// Repository is public, no credentials needed

		// After credentials are provided, check for branch override from Helm values
		helmBranch := b.getBranchFromHelmValues()
		if helmBranch != "" {
			if verbose {
				pterm.Info.Printf("📥 Using branch '%s' from Helm values\n", helmBranch)
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

// BuildInstallConfigWithCustomHelmPath constructs the installation configuration using a custom helm values file
func (b *Builder) BuildInstallConfigWithCustomHelmPath(
	force, dryRun, verbose, nonInteractive bool,
	clusterName, githubRepo, githubBranch, certDir, helmValuesPath string,
	deploymentMode string,
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

		// Repository is public, no credentials needed

		// Set the custom helm values file path if provided
		if helmValuesPath != "" {
			appOfAppsConfig.ValuesFile = helmValuesPath
		}

		// After credentials are provided, check for branch override from custom Helm values path
		// Branch selection logic based on deployment mode:
		// - OSS Tenant: use deployment.oss.repository.branch
		// - SaaS Tenant: use deployment.oss.repository.branch (app-of-apps is in OSS repo)
		// - SaaS Shared: use deployment.saas.repository.branch (app-of-apps is in saas-shared repo)
		helmBranch := b.getBranchForDeploymentMode(helmValuesPath, deploymentMode)
		if helmBranch != "" {
			if verbose {
				pterm.Info.Printf("📥 Using branch '%s' from Helm values\n", helmBranch)
			}
			appOfAppsConfig.GitHubBranch = helmBranch
		} else if verbose {
			pterm.Info.Printf("📥 Using default branch '%s'\n", appOfAppsConfig.GitHubBranch)
		}
	}

	config := b.configService.BuildInstallConfig(
		force, dryRun, verbose,
		clusterName,
		appOfAppsConfig,
	)

	// Set Silent flag based on NonInteractive mode
	config.Silent = nonInteractive
	config.NonInteractive = nonInteractive

	return config, nil
}
