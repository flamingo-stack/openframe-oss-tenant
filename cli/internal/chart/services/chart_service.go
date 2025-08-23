package services

import (
	"context"
	"time"

	"github.com/flamingo/openframe/internal/chart/providers/git"
	"github.com/flamingo/openframe/internal/chart/providers/helm"
	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/flamingo/openframe/internal/chart/utils/errors"
	"github.com/flamingo/openframe/internal/chart/utils/types"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/flamingo/openframe/internal/cluster"
	sharedErrors "github.com/flamingo/openframe/internal/shared/errors"
	"github.com/flamingo/openframe/internal/shared/executor"
)

// ChartService handles high-level chart operations
type ChartService struct {
	executor       executor.CommandExecutor
	clusterService types.ClusterLister
	configService  *config.Service
	operationsUI   *chartUI.OperationsUI
	displayService *chartUI.DisplayService
	helmManager    *helm.HelmManager
	gitRepository  *git.Repository
}

// NewChartService creates a new chart service
func NewChartService(dryRun, verbose bool) *ChartService {
	// Create executors
	clusterExec := executor.NewRealCommandExecutor(false, verbose)
	chartExec := executor.NewRealCommandExecutor(dryRun, verbose)

	// Initialize configuration service
	configService := config.NewService()
	configService.Initialize()

	return &ChartService{
		executor:       chartExec,
		clusterService: cluster.NewClusterService(clusterExec),
		configService:  configService,
		operationsUI:   chartUI.NewOperationsUI(),
		displayService: chartUI.NewDisplayService(),
		helmManager:    helm.NewHelmManager(chartExec),
		gitRepository:  git.NewRepository(chartExec),
	}
}

// Install performs the complete chart installation process
func (cs *ChartService) Install(req types.InstallationRequest) error {
	// Create installation workflow with direct dependencies
	workflow := &InstallationWorkflow{
		chartService:   cs,
		clusterService: cs.clusterService,
	}
	
	// Execute workflow
	return workflow.Execute(req)
}

// InstallationWorkflow orchestrates the installation process
type InstallationWorkflow struct {
	chartService   *ChartService
	clusterService types.ClusterLister
}

// Execute runs the installation workflow
func (w *InstallationWorkflow) Execute(req types.InstallationRequest) error {
	// Step 1: Select cluster
	clusterName, err := w.selectCluster(req.Args, req.Verbose)
	if err != nil || clusterName == "" {
		return err
	}

	// Step 2: Confirm installation
	if !w.confirmInstallation(clusterName) {
		w.chartService.operationsUI.ShowOperationCancelled("chart installation")
		return nil
	}

	// Step 3: Build configuration
	config, err := w.buildConfiguration(req, clusterName)
	if err != nil {
		chartErr := errors.WrapAsChartError("configuration", "build", err).WithCluster(clusterName)
		return sharedErrors.HandleGlobalError(chartErr, req.Verbose)
	}

	// Step 4: Execute installation with retry support
	return w.performInstallationWithRetry(config)
}

// selectCluster handles cluster selection
func (w *InstallationWorkflow) selectCluster(args []string, verbose bool) (string, error) {
	clusterSelector := NewClusterSelector(w.clusterService, w.chartService.operationsUI)
	return clusterSelector.SelectCluster(args, verbose)
}

// confirmInstallation prompts for user confirmation
func (w *InstallationWorkflow) confirmInstallation(clusterName string) bool {
	confirmed, err := w.chartService.operationsUI.ConfirmInstallation(clusterName)
	if err != nil {
		sharedErrors.HandleConfirmationError(err)
		return false
	}
	return confirmed
}

// buildConfiguration constructs the installation configuration
func (w *InstallationWorkflow) buildConfiguration(req types.InstallationRequest, clusterName string) (config.ChartInstallConfig, error) {
	configBuilder := config.NewBuilder(w.chartService.operationsUI)
	return configBuilder.BuildInstallConfig(
		req.Force, req.DryRun, req.Verbose, clusterName,
		req.GitHubRepo, req.GitHubBranch, req.GitHubUsername, req.GitHubToken, req.CertDir,
	)
}

// performInstallation executes the actual installation
func (w *InstallationWorkflow) performInstallation(config config.ChartInstallConfig) error {
	// Create installer directly without factory
	pathResolver := w.chartService.configService.GetPathResolver()
	argoCDService := NewArgoCD(w.chartService.helmManager, pathResolver, w.chartService.executor)
	appOfAppsService := NewAppOfApps(w.chartService.helmManager, w.chartService.gitRepository, pathResolver)

	installer := &Installer{
		argoCDService:    argoCDService,
		appOfAppsService: appOfAppsService,
	}

	err := installer.InstallCharts(config)
	if err != nil {
		// Check if this is a branch not found error
		if _, ok := err.(*sharedErrors.BranchNotFoundError); ok {
			return err // Return as-is, don't wrap
		}
		return errors.WrapAsChartError("installation", "chart", err).WithCluster(config.ClusterName)
	}
	return nil
}

// performInstallationWithRetry executes installation with retry policy
func (w *InstallationWorkflow) performInstallationWithRetry(config config.ChartInstallConfig) error {
	retryPolicy := sharedErrors.InstallationRetryPolicy()
	retryExecutor := sharedErrors.NewRetryExecutor(retryPolicy)
	retryExecutor.WithRetryCallback(sharedErrors.DefaultRetryCallback("Chart installation"))

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	return retryExecutor.Execute(ctx, func() error {
		return w.performInstallation(config)
	})
}