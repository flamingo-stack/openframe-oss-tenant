package services

import (
	"context"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/providers/argocd"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/providers/helm"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/errors"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// ArgoCD handles ArgoCD installation logic
type ArgoCD struct {
	helmManager   *helm.HelmManager
	pathResolver  *config.PathResolver
	argoCDManager *argocd.Manager
}

// NewArgoCD creates a new ArgoCD service
func NewArgoCD(helmManager *helm.HelmManager, pathResolver *config.PathResolver, exec executor.CommandExecutor) *ArgoCD {
	// Create a non-verbose executor for ArgoCD operations to reduce command spam
	// We'll handle verbose logging at a higher level in the ArgoCD manager
	argoCDExecutor := executor.NewRealCommandExecutor(false, false) // Never verbose for internal operations

	return &ArgoCD{
		helmManager:   helmManager,
		pathResolver:  pathResolver,
		argoCDManager: argocd.NewManager(argoCDExecutor),
	}
}

// Install installs ArgoCD using Helm
func (a *ArgoCD) Install(ctx context.Context, config config.ChartInstallConfig) error {
	// Always install/upgrade ArgoCD

	// Install ArgoCD with progress indication
	err := a.helmManager.InstallArgoCDWithProgress(ctx, config)
	if err != nil {
		return errors.WrapAsChartError("installation", "ArgoCD", err).WithCluster(config.ClusterName)
	}

	pterm.Success.Println("ArgoCD installed")
	return nil
}

// WaitForApplications waits for all ArgoCD applications to be ready
func (a *ArgoCD) WaitForApplications(ctx context.Context, config config.ChartInstallConfig) error {
	// Silent waiting - show message only in verbose mode
	if config.Verbose {
		pterm.Info.Println("Waiting for ArgoCD applications...")
	}

	err := a.argoCDManager.WaitForApplications(ctx, config)
	if err != nil {
		// Error details handled by caller - no duplicate error message needed
		return errors.NewRecoverableChartError("waiting", "ArgoCD applications", err, 60*time.Second).WithCluster(config.ClusterName)
	}

	// Success message removed - handled by calling service
	return nil
}

// IsInstalled checks if ArgoCD is installed
func (a *ArgoCD) IsInstalled(ctx context.Context) (bool, error) {
	return a.helmManager.IsChartInstalled(ctx, "argo-cd", "argocd")
}

// GetStatus returns the status of ArgoCD installation
func (a *ArgoCD) GetStatus(ctx context.Context) (models.ChartInfo, error) {
	return a.helmManager.GetChartStatus(ctx, "argo-cd", "argocd")
}
