package services

import (
	"context"
	"fmt"
	"time"

	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/flamingo/openframe/internal/chart/prerequisites"
	"github.com/flamingo/openframe/internal/chart/providers/git"
	"github.com/flamingo/openframe/internal/chart/providers/helm"
	"github.com/flamingo/openframe/internal/chart/types"
	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/flamingo/openframe/internal/chart/utils/errors"
	utilTypes "github.com/flamingo/openframe/internal/chart/utils/types"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/flamingo/openframe/internal/cluster"
	sharedErrors "github.com/flamingo/openframe/internal/shared/errors"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// ChartService handles high-level chart operations
type ChartService struct {
	executor       executor.CommandExecutor
	clusterService utilTypes.ClusterLister
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
func (cs *ChartService) Install(req utilTypes.InstallationRequest) error {
	// Create installation workflow with direct dependencies
	workflow := &InstallationWorkflow{
		chartService:   cs,
		clusterService: cs.clusterService,
		fileCleanup:    templates.NewFileCleanup(),
	}
	
	// Execute workflow
	return workflow.Execute(req)
}

// InstallationWorkflow orchestrates the installation process
type InstallationWorkflow struct {
	chartService   *ChartService
	clusterService utilTypes.ClusterLister
	fileCleanup    *templates.FileCleanup
}

// Execute runs the installation workflow
func (w *InstallationWorkflow) Execute(req utilTypes.InstallationRequest) error {
	// Step 1: Select cluster
	clusterName, err := w.selectCluster(req.Args, req.Verbose)
	if err != nil || clusterName == "" {
		return err
	}

	// Step 2: Confirm installation
	if !w.confirmInstallation(clusterName) {
		pterm.Info.Println("Installation cancelled.")
		return nil
	}

	// Step 3: Run configuration wizard (skip in dry-run mode for tests)
	var chartConfig *types.ChartConfiguration
	if req.DryRun {
		// Create minimal configuration for dry-run mode
		pathResolver := w.chartService.configService.GetPathResolver()
		chartConfig = &types.ChartConfiguration{
			HelmValuesPath:   pathResolver.GetHelmValuesFile(),
			ExistingValues:   make(map[string]interface{}),
			ModifiedSections: make([]string, 0),
		}
		pterm.Info.Println("Using existing configuration (dry-run mode)")
	} else {
		var err error
		chartConfig, err = w.runConfigurationWizard()
		if err != nil {
			return fmt.Errorf("configuration wizard failed: %w", err)
		}

		// Step 4: Generate and save Helm values
		if err := w.generateHelmValues(chartConfig); err != nil {
			return fmt.Errorf("helm values generation failed: %w", err)
		}
	}

	// Step 5: Regenerate certificates after configuration
	if err := w.regenerateCertificates(); err != nil {
		// Non-fatal - continue anyway as logged in the method
	}

	// Step 6: Build configuration
	config, err := w.buildConfiguration(req, clusterName)
	if err != nil {
		chartErr := errors.WrapAsChartError("configuration", "build", err).WithCluster(clusterName)
		return sharedErrors.HandleGlobalError(chartErr, req.Verbose)
	}

	// Step 7: Execute installation with retry support
	err = w.performInstallationWithRetry(config)
	
	// Step 8: Clean up generated files after installation (success or failure)
	defer func() {
		if cleanupErr := w.fileCleanup.RestoreFiles(req.Verbose); cleanupErr != nil {
			pterm.Warning.Printf("Failed to restore files: %v\n", cleanupErr)
		}
	}()
	
	return err
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

// regenerateCertificates refreshes certificates after user confirmation
func (w *InstallationWorkflow) regenerateCertificates() error {
	installer := prerequisites.NewInstaller()
	return installer.RegenerateCertificatesOnly()
}

// runConfigurationWizard runs the configuration wizard to get user preferences
func (w *InstallationWorkflow) runConfigurationWizard() (*types.ChartConfiguration, error) {
	wizard := chartUI.NewConfigurationWizard()
	
	// Get path to Helm values file
	pathResolver := w.chartService.configService.GetPathResolver()
	helmValuesPath := pathResolver.GetHelmValuesFile()
	
	// Configure Helm values based on existing file
	config, err := wizard.ConfigureHelmValues(helmValuesPath)
	if err != nil {
		return nil, fmt.Errorf("helm values configuration failed: %w", err)
	}

	// Show configuration summary
	wizard.ShowConfigurationSummary(config)
	
	return config, nil
}

// generateHelmValues modifies existing Helm values file based on configuration
func (w *InstallationWorkflow) generateHelmValues(config *types.ChartConfiguration) error {
	// If no modifications were made, skip updating the file
	if len(config.ModifiedSections) == 0 {
		pterm.Success.Println("Using existing Helm values")
		return nil
	}

	// Backup existing file before modifying it
	if err := w.fileCleanup.BackupFile(config.HelmValuesPath, true); err != nil {
		return fmt.Errorf("failed to backup helm values file: %w", err)
	}

	// Create modifier to handle the updates
	modifier := templates.NewHelmValuesModifier()

	// Apply configuration changes to existing values
	if err := modifier.ApplyConfiguration(config.ExistingValues, config); err != nil {
		return fmt.Errorf("failed to apply configuration changes: %w", err)
	}

	// Write updated values back to file
	if err := modifier.WriteValues(config.ExistingValues, config.HelmValuesPath); err != nil {
		return fmt.Errorf("failed to write helm values: %w", err)
	}

	pterm.Success.Printf("✅ Updated Helm values: %s\n", config.HelmValuesPath)
	return nil
}

// buildConfiguration constructs the installation configuration
func (w *InstallationWorkflow) buildConfiguration(req utilTypes.InstallationRequest, clusterName string) (config.ChartInstallConfig, error) {
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