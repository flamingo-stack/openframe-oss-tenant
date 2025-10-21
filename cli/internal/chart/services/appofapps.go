package services

import (
	"context"
	"strings"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/providers/git"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/providers/helm"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/errors"
	sharedErrors "github.com/flamingo-stack/openframe/openframe/internal/shared/errors"
	"github.com/pterm/pterm"
)

// AppOfApps handles app-of-apps installation logic
type AppOfApps struct {
	helmManager  *helm.HelmManager
	gitRepo      *git.Repository
	pathResolver *config.PathResolver
}

// NewAppOfApps creates a new app-of-apps service
func NewAppOfApps(helmManager *helm.HelmManager, gitRepo *git.Repository, pathResolver *config.PathResolver) *AppOfApps {
	return &AppOfApps{
		helmManager:  helmManager,
		gitRepo:      gitRepo,
		pathResolver: pathResolver,
	}
}

// Install installs app-of-apps from GitHub repository using git clone
func (a *AppOfApps) Install(ctx context.Context, config config.ChartInstallConfig) error {
	// Validate configuration
	if config.AppOfApps == nil {
		return errors.NewValidationError("app-of-apps", "nil", "configuration is required")
	}

	appConfig := config.AppOfApps
	if appConfig.GitHubRepo == "" {
		return errors.NewValidationError("GitHubRepo", "empty", "GitHub repository URL is required for app-of-apps installation")
	}
	if appConfig.GitHubBranch == "" {
		appConfig.GitHubBranch = "main" // Default to main branch
	}

	// Always show which branch is being used for cloning with dots to indicate work is happening
	pterm.Info.Printf("Using branch '%s'...\n", appConfig.GitHubBranch)

	// Clone the repository to a temporary directory
	cloneResult, err := a.gitRepo.CloneChartRepository(ctx, appConfig)
	if err != nil {
		// Check if this is a branch not found error
		if strings.Contains(err.Error(), "branch") && strings.Contains(err.Error(), "does not exist") {
			// Return the proper error type
			return sharedErrors.NewBranchNotFoundError(appConfig.GitHubBranch)
		}
		return errors.NewRecoverableChartError("clone", "Git repository", err, 10*time.Second).WithCluster(config.ClusterName)
	}

	// Ensure cleanup happens after installation completes (success or failure)
	defer func() {
		a.gitRepo.Cleanup(cloneResult.TempDir)
	}()

	// Get file paths
	valuesFile := a.pathResolver.GetHelmValuesFile()
	if appConfig.ValuesFile != "" {
		valuesFile = appConfig.ValuesFile
	}

	certFile, keyFile := a.pathResolver.GetCertificateFiles()

	// Create a modified config with the local chart path
	localConfig := config
	localConfig.AppOfApps.ChartPath = cloneResult.ChartPath
	localConfig.AppOfApps.ValuesFile = valuesFile

	// Show details only in verbose mode
	if config.Verbose {
		pterm.Info.Printf("   Chart path: %s\n", cloneResult.ChartPath)
		pterm.Info.Printf("   Values file: %s\n", valuesFile)
	}

	// Use helm manager to install app-of-apps
	err = a.helmManager.InstallAppOfAppsFromLocal(ctx, localConfig, certFile, keyFile)
	if err != nil {
		return errors.WrapAsChartError("installation", "app-of-apps", err).WithCluster(config.ClusterName)
	}

	return nil
}

// IsInstalled checks if app-of-apps is installed
func (a *AppOfApps) IsInstalled(ctx context.Context, namespace string) (bool, error) {
	return a.helmManager.IsChartInstalled(ctx, "app-of-apps", namespace)
}

// GetStatus returns the status of app-of-apps installation
func (a *AppOfApps) GetStatus(ctx context.Context, namespace string) (models.ChartInfo, error) {
	return a.helmManager.GetChartStatus(ctx, "app-of-apps", namespace)
}
