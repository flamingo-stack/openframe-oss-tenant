package services

import (
	"context"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/errors"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	sharedErrors "github.com/flamingo-stack/openframe/openframe/internal/shared/errors"
)

// Installer orchestrates the chart installation process
type Installer struct {
	argoCDService    types.ArgoCDService
	appOfAppsService types.AppOfAppsService
}

// InstallCharts handles the complete chart installation process
func (i *Installer) InstallCharts(config config.ChartInstallConfig) error {
	return i.InstallChartsWithContext(context.Background(), config)
}

// InstallChartsWithContext handles the complete chart installation process with context support
func (i *Installer) InstallChartsWithContext(ctx context.Context, config config.ChartInstallConfig) error {
	// Install ArgoCD first
	if err := i.argoCDService.Install(ctx, config); err != nil {
		return errors.WrapAsChartError("installation", "ArgoCD", err).WithCluster(config.ClusterName)
	}

	// Install app-of-apps from GitHub repository if configured
	if config.HasAppOfApps() {
		if err := i.appOfAppsService.Install(ctx, config); err != nil {
			// Check if this is a branch not found error
			if _, ok := err.(*sharedErrors.BranchNotFoundError); ok {
				return err // Return as-is, don't wrap
			}
			return errors.WrapAsChartError("installation", "app-of-apps", err).WithCluster(config.ClusterName)
		}

		// Wait for all ArgoCD applications to be ready after app-of-apps installation
		if err := i.argoCDService.WaitForApplications(ctx, config); err != nil {
			return errors.NewRecoverableChartError("waiting", "ArgoCD applications", err, 30*time.Second).WithCluster(config.ClusterName)
		}
	}

	return nil
}
