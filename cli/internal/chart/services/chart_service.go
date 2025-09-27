package services

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/flamingo/openframe/internal/chart/prerequisites"
	"github.com/flamingo/openframe/internal/chart/providers/git"
	"github.com/flamingo/openframe/internal/chart/providers/helm"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/flamingo/openframe/internal/chart/ui/configuration"
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/flamingo/openframe/internal/chart/utils/errors"
	"github.com/flamingo/openframe/internal/chart/utils/types"
	utilTypes "github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/flamingo/openframe/internal/cluster"
	sharedErrors "github.com/flamingo/openframe/internal/shared/errors"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/flamingo/openframe/internal/shared/files"
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
	return cs.InstallWithContext(context.Background(), req)
}

func (cs *ChartService) InstallWithContext(ctx context.Context, req utilTypes.InstallationRequest) error {
	// Check if context is already cancelled
	select {
	case <-ctx.Done():
		return fmt.Errorf("chart installation cancelled: %w", ctx.Err())
	default:
	}

	// Create installation workflow with direct dependencies
	fileCleanup := files.NewFileCleanup()
	fileCleanup.SetCleanupOnSuccessOnly(true) // Only clean temporary files after successful ArgoCD sync

	workflow := &InstallationWorkflow{
		chartService:   cs,
		clusterService: cs.clusterService,
		fileCleanup:    fileCleanup,
	}

	// Execute workflow with context
	return workflow.ExecuteWithContext(ctx, req)
}

// InstallationWorkflow orchestrates the installation process
type InstallationWorkflow struct {
	chartService   *ChartService
	clusterService utilTypes.ClusterLister
	fileCleanup    *files.FileCleanup
}

// Execute runs the installation workflow
func (w *InstallationWorkflow) Execute(req utilTypes.InstallationRequest) error {
	return w.ExecuteWithContext(context.Background(), req)
}

func (w *InstallationWorkflow) ExecuteWithContext(parentCtx context.Context, req utilTypes.InstallationRequest) error {
	// Set up signal handling for graceful cleanup on interruption
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigChan) // Clean up signal handler

	// Create a context that can be cancelled on signal OR parent context
	ctx, cancel := context.WithCancel(parentCtx)
	defer cancel()

	// Track if we've been interrupted
	interrupted := false

	// Start signal handler goroutine
	go func() {
		<-sigChan
		interrupted = true
		// Signal received - clean cancellation handled by error handler
		cancel()
		// No delay - immediate cancellation
	}()

	// Step 1: Determine configuration mode and run appropriate workflow
	var chartConfig *types.ChartConfiguration
	if req.DryRun {
		// Create minimal configuration for dry-run mode using base values from current directory
		modifier := templates.NewHelmValuesModifier()
		baseValues, err := modifier.LoadOrCreateBaseValues()
		if err != nil {
			return fmt.Errorf("failed to load base values for dry-run: %w", err)
		}

		chartConfig = &types.ChartConfiguration{
			BaseHelmValuesPath: "helm-values.yaml",
			TempHelmValuesPath: "helm-values-tmp.yaml", // Use tmp file in current directory for dry-run
			ExistingValues:     baseValues,
			ModifiedSections:   make([]string, 0),
		}
		pterm.Info.Println("Using existing configuration (dry-run mode)")
	} else if req.NonInteractive {
		// Mode 1: FULLY NON-INTERACTIVE (CI/CD)
		if req.DeploymentMode == "" {
			return fmt.Errorf("--deployment-mode is required when using --non-interactive")
		}
		pterm.Warning.Printf("Running in non-interactive mode with %s deployment\n", req.DeploymentMode)
		var err error
		chartConfig, err = w.loadExistingConfiguration(req.DeploymentMode)
		if err != nil {
			return fmt.Errorf("non-interactive configuration failed: %w", err)
		}
	} else if req.DeploymentMode != "" {
		// Mode 2: PARTIAL NON-INTERACTIVE (Skip deployment selection only)
		pterm.Warning.Printf("Deployment mode pre-selected: %s\n", req.DeploymentMode)
		var err error
		chartConfig, err = w.runPartialConfigurationWizard(req.DeploymentMode)
		if err != nil {
			return fmt.Errorf("configuration wizard failed: %w", err)
		}

		// Register temporary file for cleanup
		if chartConfig.TempHelmValuesPath != "" {
			if backupErr := w.fileCleanup.RegisterTempFile(chartConfig.TempHelmValuesPath); backupErr != nil {
				pterm.Warning.Printf("Failed to register temp file for cleanup: %v\n", backupErr)
			}
		}
	} else {
		// Mode 3: FULLY INTERACTIVE (existing behavior)
		var err error
		chartConfig, err = w.runConfigurationWizard()
		if err != nil {
			return fmt.Errorf("configuration wizard failed: %w", err)
		}

		// Register temporary file for cleanup
		if chartConfig.TempHelmValuesPath != "" {
			if backupErr := w.fileCleanup.RegisterTempFile(chartConfig.TempHelmValuesPath); backupErr != nil {
				pterm.Warning.Printf("Failed to register temp file for cleanup: %v\n", backupErr)
			}
		}
	}

	// Step 2: Select cluster
	clusterName, err := w.selectCluster(req.Args, req.Verbose)
	if err != nil || clusterName == "" {
		return err
	}

	// Step 3: Confirm installation on the selected cluster (skip in non-interactive mode)
	if !req.NonInteractive {
		if !w.confirmInstallationOnCluster(clusterName) {
			pterm.Info.Println("Installation cancelled.")
			return fmt.Errorf("installation cancelled by user")
		}
	}

	// Step 4: Regenerate certificates after configuration and cluster selection
	// Skip certificate regeneration in non-interactive mode
	if !req.NonInteractive {
		if err := w.regenerateCertificates(); err != nil {
			// Non-fatal - continue anyway as logged in the method
		}
	} else {
		pterm.Warning.Println("Skipping certificate regeneration (non-interactive mode)")
	}

	// Step 5: Build configuration
	config, err := w.buildConfiguration(req, clusterName, chartConfig)
	if err != nil {
		chartErr := errors.WrapAsChartError("configuration", "build", err).WithCluster(clusterName)
		return sharedErrors.HandleGlobalError(chartErr, req.Verbose)
	}

	// Step 6: Execute installation with retry support
	err = w.performInstallationWithRetry(ctx, config)

	// Step 7: Clean up generated files based on installation result
	if err != nil {
		// Installation failed - clean up temporary files immediately
		if cleanupErr := w.fileCleanup.RestoreFiles(req.Verbose); cleanupErr != nil {
			pterm.Warning.Printf("Failed to clean up files after error: %v\n", cleanupErr)
		}
		return err
	}

	// Check if cancelled by signal (CTRL-C)
	if interrupted || ctx.Err() != nil {
		// User interrupted - clean up temporary files silently
		w.fileCleanup.RestoreFiles(false) // Always clean up silently on interruption
		return fmt.Errorf("installation cancelled by user")
	}

	// Step 8: ArgoCD sync is already handled by installer.InstallCharts
	// The installer waits for all ArgoCD applications after installing app-of-apps

	// Step 9: Installation successful - clean up temporary files
	if cleanupErr := w.fileCleanup.RestoreFilesOnSuccess(req.Verbose); cleanupErr != nil {
		pterm.Warning.Printf("Failed to clean up files after successful installation: %v\n", cleanupErr)
	}

	return nil
}

// selectCluster handles cluster selection
func (w *InstallationWorkflow) selectCluster(args []string, verbose bool) (string, error) {
	clusterSelector := NewClusterSelector(w.clusterService, w.chartService.operationsUI)
	return clusterSelector.SelectCluster(args, verbose)
}

// confirmInstallationOnCluster prompts for user confirmation with specific cluster name
func (w *InstallationWorkflow) confirmInstallationOnCluster(clusterName string) bool {
	confirmed, err := w.chartService.operationsUI.ConfirmInstallationOnCluster(clusterName)
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
	wizard := configuration.NewConfigurationWizard()

	// Configure Helm values from current directory
	config, err := wizard.ConfigureHelmValues()
	if err != nil {
		return nil, fmt.Errorf("helm values configuration failed: %w", err)
	}

	return config, nil
}

// loadExistingConfiguration loads existing helm-values.yaml for non-interactive mode
func (w *InstallationWorkflow) loadExistingConfiguration(deploymentModeStr string) (*types.ChartConfiguration, error) {
	modifier := templates.NewHelmValuesModifier()

	// Load existing helm-values.yaml
	values, err := modifier.LoadOrCreateBaseValues()
	if err != nil {
		return nil, fmt.Errorf("failed to load helm-values.yaml: %w", err)
	}

	// Convert string to DeploymentMode
	var deploymentMode types.DeploymentMode
	switch deploymentModeStr {
	case "oss-tenant":
		deploymentMode = types.DeploymentModeOSS
	case "saas-tenant":
		deploymentMode = types.DeploymentModeSaaS
	case "saas-shared":
		deploymentMode = types.DeploymentModeSaaSShared
	default:
		return nil, fmt.Errorf("invalid deployment mode: %s", deploymentModeStr)
	}

	// Auto-configure the specified deployment mode using existing HelmValuesModifier
	// Only set the deployment mode - let existing logic handle branches and passwords
	if err := modifier.ApplyConfiguration(values, &types.ChartConfiguration{
		DeploymentMode: &deploymentMode,
	}); err != nil {
		return nil, fmt.Errorf("failed to auto-configure deployment mode: %w", err)
	}

	// Create temporary file with modified values (same as interactive mode)
	tempFilePath, err := modifier.CreateTemporaryValuesFile(values)
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary values file: %w", err)
	}

	result := &types.ChartConfiguration{
		BaseHelmValuesPath: "helm-values.yaml",
		TempHelmValuesPath: tempFilePath, // Use temporary file like interactive mode
		ExistingValues:     values,
		DeploymentMode:     &deploymentMode,
		ModifiedSections:   []string{},
	}

	// Validate required configuration exists (after auto-configuration)
	validator := NewConfigurationValidator()
	if err := validator.ValidateConfiguration(result); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return result, nil
}

// runPartialConfigurationWizard runs wizard with pre-selected deployment mode
func (w *InstallationWorkflow) runPartialConfigurationWizard(deploymentModeStr string) (*types.ChartConfiguration, error) {
	// Convert string to DeploymentMode
	var deploymentMode types.DeploymentMode
	switch deploymentModeStr {
	case "oss-tenant":
		deploymentMode = types.DeploymentModeOSS
	case "saas-tenant":
		deploymentMode = types.DeploymentModeSaaS
	case "saas-shared":
		deploymentMode = types.DeploymentModeSaaSShared
	default:
		return nil, fmt.Errorf("invalid deployment mode: %s", deploymentModeStr)
	}

	wizard := configuration.NewConfigurationWizard()
	return wizard.ConfigureHelmValuesWithMode(deploymentMode)
}


// waitForArgoCDSync waits for ArgoCD applications to be synced
func (w *InstallationWorkflow) waitForArgoCDSync(ctx context.Context, config config.ChartInstallConfig) error {
	if !config.HasAppOfApps() {
		// No ArgoCD apps to wait for
		return nil
	}

	// pterm.Info.Println("🔄 Waiting for ArgoCD applications to sync...")

	// Create ArgoCD service to wait for applications
	pathResolver := w.chartService.configService.GetPathResolver()
	argoCDService := NewArgoCD(w.chartService.helmManager, pathResolver, w.chartService.executor)

	// Wait for applications to be synced with context for cancellation
	if err := argoCDService.WaitForApplications(ctx, config); err != nil {
		// Check if it was cancelled by user
		if ctx.Err() == context.Canceled {
			pterm.Info.Println("ArgoCD sync cancelled by user")
			return fmt.Errorf("ArgoCD sync cancelled by user")
		}
		return fmt.Errorf("ArgoCD applications sync failed: %w", err)
	}

	// pterm.Success.Println("✅ All ArgoCD applications synced successfully")
	return nil
}

// buildConfiguration constructs the installation configuration
func (w *InstallationWorkflow) buildConfiguration(req utilTypes.InstallationRequest, clusterName string, chartConfig *types.ChartConfiguration) (config.ChartInstallConfig, error) {
	configBuilder := config.NewBuilder(w.chartService.operationsUI)

	// Determine repository URL based on deployment mode
	githubRepo := req.GitHubRepo
	if chartConfig.DeploymentMode != nil {
		// Always use deployment mode to determine repository URL if deployment mode is specified
		// This ensures that SaaS Shared mode gets the correct repository
		githubRepo = types.GetRepositoryURL(*chartConfig.DeploymentMode)
	}

	// Convert deployment mode to string for builder
	var deploymentModeStr string
	if chartConfig.DeploymentMode != nil {
		deploymentModeStr = string(*chartConfig.DeploymentMode)
	}

	return configBuilder.BuildInstallConfigWithCustomHelmPath(
		req.Force, req.DryRun, req.Verbose, req.NonInteractive, clusterName,
		githubRepo, req.GitHubBranch, req.CertDir,
		chartConfig.TempHelmValuesPath,
		deploymentModeStr,
	)
}

// performInstallation executes the actual installation
func (w *InstallationWorkflow) performInstallation(ctx context.Context, config config.ChartInstallConfig) error {
	// Create installer directly without factory
	pathResolver := w.chartService.configService.GetPathResolver()
	argoCDService := NewArgoCD(w.chartService.helmManager, pathResolver, w.chartService.executor)
	appOfAppsService := NewAppOfApps(w.chartService.helmManager, w.chartService.gitRepository, pathResolver)

	installer := &Installer{
		argoCDService:    argoCDService,
		appOfAppsService: appOfAppsService,
	}

	err := installer.InstallChartsWithContext(ctx, config)
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
func (w *InstallationWorkflow) performInstallationWithRetry(parentCtx context.Context, config config.ChartInstallConfig) error {
	retryPolicy := sharedErrors.InstallationRetryPolicy()
	retryExecutor := sharedErrors.NewRetryExecutor(retryPolicy)
	// No retry callback - let the spinner handle progress indication

	// Combine parent context (for CTRL-C) with timeout
	ctx, cancel := context.WithTimeout(parentCtx, 60*time.Minute)
	defer cancel()

	return retryExecutor.Execute(ctx, func() error {
		// Check if cancelled before attempting installation
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		return w.performInstallation(ctx, config)
	})
}

// InstallChartsWithPrerequisites installs charts after checking prerequisites
// This is a wrapper function for bootstrap and other automated flows
func InstallChartsWithPrerequisites(clusterName string, verbose bool) error {
	return InstallChartsWithDefaults([]string{clusterName}, false, false, verbose)
}

// InstallChartsWithDefaults installs charts with default GitHub configuration
// This is the common logic used by both chart install command and bootstrap
func InstallChartsWithDefaults(args []string, force, dryRun, verbose bool) error {
	return InstallChartsWithDefaultsContext(context.Background(), args, force, dryRun, verbose)
}

// InstallChartsWithDefaultsContext installs charts with default GitHub configuration and context support
func InstallChartsWithDefaultsContext(ctx context.Context, args []string, force, dryRun, verbose bool) error {
	return InstallChartsWithConfigContext(ctx, utilTypes.InstallationRequest{
		Args:         args,
		Force:        force,
		DryRun:       dryRun,
		Verbose:      verbose,
		GitHubRepo:   "https://github.com/flamingo-stack/openframe-oss-tenant", // Default repository
		GitHubBranch: "main",                                                   // Default branch
		CertDir:      "",                                                       // Auto-detected
	})
}

// InstallChartsWithConfig installs charts with the given configuration
// This is the common installation logic used by all flows
func InstallChartsWithConfig(req utilTypes.InstallationRequest) error {
	return InstallChartsWithConfigContext(context.Background(), req)
}

// InstallChartsWithConfigContext installs charts with the given configuration and context support
func InstallChartsWithConfigContext(ctx context.Context, req utilTypes.InstallationRequest) error {
	// Check if context is already cancelled
	select {
	case <-ctx.Done():
		return fmt.Errorf("chart installation cancelled: %w", ctx.Err())
	default:
	}

	// Check prerequisites first
	installer := prerequisites.NewInstaller()
	if err := installer.CheckAndInstallNonInteractive(req.NonInteractive); err != nil {
		return err
	}

	// Check context again after prerequisites
	select {
	case <-ctx.Done():
		return fmt.Errorf("chart installation cancelled: %w", ctx.Err())
	default:
	}

	// Create a chart service and perform the installation with context
	chartService := NewChartService(req.DryRun, req.Verbose)

	return chartService.InstallWithContext(ctx, req)
}
