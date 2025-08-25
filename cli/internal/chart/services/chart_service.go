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
	sharedConfig "github.com/flamingo/openframe/internal/shared/config"
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
	// Create installation workflow with direct dependencies
	fileCleanup := files.NewFileCleanup()
	fileCleanup.SetCleanupOnSuccessOnly(true) // Only clean temporary files after successful ArgoCD sync

	workflow := &InstallationWorkflow{
		chartService:   cs,
		clusterService: cs.clusterService,
		fileCleanup:    fileCleanup,
	}

	// Execute workflow
	return workflow.Execute(req)
}

// InstallationWorkflow orchestrates the installation process
type InstallationWorkflow struct {
	chartService   *ChartService
	clusterService utilTypes.ClusterLister
	fileCleanup    *files.FileCleanup
}

// Execute runs the installation workflow
func (w *InstallationWorkflow) Execute(req utilTypes.InstallationRequest) error {
	// Set up signal handling for graceful cleanup on interruption
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigChan) // Clean up signal handler

	// Create a context that can be cancelled on signal
	ctx, cancel := context.WithCancel(context.Background())
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

	// Step 1: Run configuration wizard first (skip in dry-run mode for tests)
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
	} else {
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

	// Step 3: Collect GitHub credentials if needed (before confirmation)
	err = w.collectGitHubCredentials(&req)
	if err != nil {
		return fmt.Errorf("GitHub credentials collection failed: %w", err)
	}

	// Step 4: Confirm installation on the selected cluster
	if !w.confirmInstallationOnCluster(clusterName) {
		pterm.Info.Println("Installation cancelled.")
		return nil
	}

	// Step 5: Regenerate certificates after configuration and cluster selection
	if err := w.regenerateCertificates(); err != nil {
		// Non-fatal - continue anyway as logged in the method
	}

	// Step 6: Build configuration
	config, err := w.buildConfiguration(req, clusterName, chartConfig.TempHelmValuesPath)
	if err != nil {
		chartErr := errors.WrapAsChartError("configuration", "build", err).WithCluster(clusterName)
		return sharedErrors.HandleGlobalError(chartErr, req.Verbose)
	}

	// Step 7: Execute installation with retry support
	err = w.performInstallationWithRetry(ctx, config)

	// Step 8: Clean up generated files based on installation result
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

	// Step 9: ArgoCD sync is already handled by installer.InstallCharts
	// The installer waits for all ArgoCD applications after installing app-of-apps

	// Step 10: Installation successful - clean up temporary files
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

// collectGitHubCredentials prompts for GitHub credentials if needed before installation confirmation
func (w *InstallationWorkflow) collectGitHubCredentials(req *utilTypes.InstallationRequest) error {
	// Only collect credentials if GitHub repo is provided and credentials are not already complete
	if req.GitHubRepo == "" {
		return nil // No GitHub repo, no credentials needed
	}

	// Create credentials prompter (same as in config builder)
	credentialsPrompter := sharedConfig.NewCredentialsPrompter()

	// Check if credentials are required (same logic as in config builder)
	if !credentialsPrompter.IsCredentialsRequired(req.GitHubUsername, req.GitHubToken) {
		return nil // Both credentials already provided
	}

	// Use the existing shared credentials prompter to get credentials
	credentials, err := credentialsPrompter.PromptForGitHubCredentials(req.GitHubRepo)
	if err != nil {
		return fmt.Errorf("failed to collect GitHub credentials: %w", err)
	}

	// Update the request with the collected credentials
	req.GitHubUsername = credentials.Username
	req.GitHubToken = credentials.Token

	return nil
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
func (w *InstallationWorkflow) buildConfiguration(req utilTypes.InstallationRequest, clusterName string, helmValuesPath string) (config.ChartInstallConfig, error) {
	configBuilder := config.NewBuilder(w.chartService.operationsUI)
	return configBuilder.BuildInstallConfigWithCustomHelmPath(
		req.Force, req.DryRun, req.Verbose, clusterName,
		req.GitHubRepo, req.GitHubBranch, req.GitHubUsername, req.GitHubToken, req.CertDir,
		helmValuesPath,
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
func (w *InstallationWorkflow) performInstallationWithRetry(parentCtx context.Context, config config.ChartInstallConfig) error {
	retryPolicy := sharedErrors.InstallationRetryPolicy()
	retryExecutor := sharedErrors.NewRetryExecutor(retryPolicy)
	// No retry callback - let the spinner handle progress indication

	// Combine parent context (for CTRL-C) with timeout
	ctx, cancel := context.WithTimeout(parentCtx, 30*time.Minute)
	defer cancel()

	return retryExecutor.Execute(ctx, func() error {
		// Check if cancelled before attempting installation
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		return w.performInstallation(config)
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
	return InstallChartsWithConfig(utilTypes.InstallationRequest{
		Args:           args,
		Force:          force,
		DryRun:         dryRun,
		Verbose:        verbose,
		GitHubRepo:     "https://github.com/Flamingo-CX/openframe", // Default repository
		GitHubBranch:   "main",                                     // Default branch
		GitHubUsername: "",                                         // Will be prompted if needed
		GitHubToken:    "",                                         // Will be prompted if needed
		CertDir:        "",                                         // Auto-detected
	})
}

// InstallChartsWithConfig installs charts with the given configuration
// This is the common installation logic used by all flows
func InstallChartsWithConfig(req utilTypes.InstallationRequest) error {
	// Check prerequisites first
	installer := prerequisites.NewInstaller()
	if err := installer.CheckAndInstall(); err != nil {
		return err
	}
	
	// Create a chart service and perform the installation
	chartService := NewChartService(req.DryRun, req.Verbose)
	
	return chartService.Install(req)
}
