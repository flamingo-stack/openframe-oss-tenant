package scaffold

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	clusterUI "github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	clusterUtils "github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/scaffold"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/providers/chart"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/providers/kubectl"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Service provides Skaffold development workflow functionality
type Service struct {
	executor        executor.CommandExecutor
	kubectlProvider *kubectl.Provider
	verbose         bool
	signalChan      chan os.Signal
	isRunning       bool
}

// NewService creates a new scaffold service
func NewService(executor executor.CommandExecutor, verbose bool) *Service {
	return &Service{
		executor:        executor,
		kubectlProvider: kubectl.NewProvider(executor, verbose),
		verbose:         verbose,
		signalChan:      make(chan os.Signal, 1),
		isRunning:       false,
	}
}

// RunScaffoldWorkflow runs the complete scaffold workflow
func (s *Service) RunScaffoldWorkflow(ctx context.Context, args []string, flags *models.ScaffoldFlags) error {
	// Prerequisites are checked in PersistentPreRunE, so we can proceed directly

	// Step 1: Select skaffold configuration
	selectedService, err := s.ShowSkaffoldConfigInfoAndSelectService()
	if err != nil {
		if errors.Is(err, ui.ErrNoSkaffoldFiles) {
			os.Exit(1) // Exit silently with error code
		}
		return err // Return other errors normally
	}

	pterm.Info.Printf("Using skaffold configuration: %s\n", selectedService.FilePath)

	// Step 2: Get cluster name (from args or interactive selection)
	clusterName, err := s.getClusterName(args)
	if err != nil {
		return err
	}

	// Step 3: Install charts on the cluster and wait for completion
	if !flags.SkipBootstrap {

		// Create context with 2 minutes 30 seconds timeout for chart installation in skaffold workflow
		chartCtx, cancel := context.WithTimeout(ctx, 2*time.Minute+30*time.Second)
		defer cancel()

		// Channel to receive the result of chart installation
		done := make(chan error, 1)

		// Run chart installation in a goroutine with context support
		go func() {
			chartProvider := chart.NewProvider(s.executor, s.verbose)
			// Use the timeout context so chart provider can respect cancellation
			err := chartProvider.InstallChartsWithContext(chartCtx, clusterName, flags.HelmValuesFile)

			// Try to send result, ignore if channel closed
			select {
			case done <- err:
			default:
			}
		}()

		// Wait for either completion or timeout
		select {
		case err := <-done:
			if err != nil {
				// Check if it's a cancellation and handle it silently
				if strings.Contains(err.Error(), "cancelled") {
					return nil // Exit silently for user cancellation
				}
				return fmt.Errorf("chart install failed: %w", err)
			}
			// Small delay to ensure success message is printed before skaffold starts
			time.Sleep(100 * time.Millisecond)
		case <-chartCtx.Done():
			// Timeout occurred, chart provider will exit and proceed to skaffold
			// Small delay to ensure timeout message is printed before skaffold starts
			time.Sleep(100 * time.Millisecond)
		}
	} else {
		pterm.Info.Printf("Skipping chart install for cluster '%s' (--skip-bootstrap flag provided)\n", clusterName)
	}

	// Step 4: Run Skaffold development workflow
	if err := s.runSkaffoldDev(ctx, selectedService, flags); err != nil {
		return fmt.Errorf("skaffold dev failed: %w", err)
	}

	return nil
}

// checkPrerequisites validates that Skaffold is installed
func (s *Service) checkPrerequisites() error {
	installer := scaffold.NewScaffoldInstaller()
	if !installer.IsInstalled() {
		pterm.Warning.Println("Missing Prerequisites: skaffold")

		// Ask user if they want to install automatically
		if s.shouldInstallSkaffold() {
			pterm.Info.Println("Starting installation of 1 tool(s): skaffold")

			// Create and start spinner matching cluster prerequisites pattern
			spinner, _ := pterm.DefaultSpinner.Start("[1/1] Installing skaffold...")

			if err := installer.Install(); err != nil {
				spinner.Fail(fmt.Sprintf("Failed to install skaffold: %v", err))
				return fmt.Errorf("failed to install Skaffold: %w", err)
			}

			spinner.Success("Successfully installed skaffold")
		} else {
			// Show installation instructions in table format like cluster prerequisites
			pterm.Println() // Add blank line for spacing
			pterm.Info.Println("Installation skipped. Here are manual installation instructions:")

			instruction := installer.GetInstallHelp()
			tableData := pterm.TableData{{"Tool", "Installation Instructions"}}
			tableData = append(tableData, []string{pterm.Cyan("skaffold"), instruction})

			pterm.DefaultTable.WithHasHeader().WithData(tableData).Render()

			// Exit gracefully without error when user declines installation
			os.Exit(0)
		}
	}
	// No output when Skaffold is already installed - silent success

	return nil
}

// shouldInstallSkaffold prompts user for Skaffold installation
func (s *Service) shouldInstallSkaffold() bool {
	result, _ := pterm.DefaultInteractiveConfirm.
		WithDefaultText("Do you want to install Skaffold automatically?").
		WithDefaultValue(true).
		Show()
	return result
}

// getClusterName determines cluster name from args or interactive selection
func (s *Service) getClusterName(args []string) (string, error) {
	// If cluster name provided as argument, use it
	if len(args) > 0 {
		return args[0], nil
	}

	// No cluster name provided - use shared cluster selection UI
	clusterService := clusterUtils.GetCommandService()
	clusters, err := clusterService.ListClusters()
	if err != nil {
		if s.verbose {
			pterm.Error.Printf("Failed to list clusters: %v\n", err)
		}
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return "", nil
	}

	if len(clusters) == 0 {
		if s.verbose {
			pterm.Info.Printf("Found 0 clusters\n")
		}
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return "", nil
	}

	if s.verbose {
		pterm.Info.Printf("Found %d clusters\n", len(clusters))
		for _, cluster := range clusters {
			pterm.Info.Printf("  - %s (%s)\n", cluster.Name, cluster.Status)
		}
	}

	// Use shared cluster selector UI
	selector := clusterUI.NewSelector("scaffold")
	return selector.SelectCluster(clusters, []string{})
}

// installCharts installs charts on the specified cluster using the chart provider
func (s *Service) installCharts(clusterName string, flags *models.ScaffoldFlags) error {
	// Use the chart provider to handle chart installation
	chartProvider := chart.NewProvider(s.executor, s.verbose)

	// Create context with 1-minute timeout for chart installation in skaffold workflow
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
	defer cancel()

	// Channel to receive the result of chart installation
	done := make(chan error, 1)

	// Run chart installation in a goroutine
	go func() {
		err := chartProvider.InstallCharts(clusterName, flags.HelmValuesFile)
		done <- err
	}()

	// Wait for either completion or timeout
	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("chart install failed: %w", err)
		}
		pterm.Success.Println("Charts installed successfully")
		return nil
	case <-ctx.Done():
		return nil
	}
}

// runSkaffoldDev runs the Skaffold development workflow with retry logic
func (s *Service) runSkaffoldDev(ctx context.Context, selectedService *ui.ServiceSelection, flags *models.ScaffoldFlags) error {
	// Set up signal handling for graceful shutdown
	s.setupSignalHandler()

	// Determine the namespace
	namespace, err := s.determineNamespace(ctx, selectedService.ServiceName, flags)
	if err != nil {
		return fmt.Errorf("failed to determine namespace: %w", err)
	}

	// Convert relative path to absolute path
	absDir, err := filepath.Abs(selectedService.Directory)
	if err != nil {
		return fmt.Errorf("failed to resolve directory path: %w", err)
	}

	// Run the skaffold commands automatically after chart installation is complete
	pterm.Println() // Add blank line for spacing
	pterm.Info.Printf("Running Skaffold commands (service: %s, namespace: %s)...\n", selectedService.ServiceName, namespace)

	// Mark as running
	s.isRunning = true
	defer func() { s.isRunning = false }()

	// Build the full command to run in a shell
	skaffoldCmd := fmt.Sprintf("cd %s && skaffold dev --cache-artifacts=false -n %s", absDir, namespace)

	// Add verbose flag if enabled
	if s.verbose {
		skaffoldCmd += " --verbosity info"
	}

	// Retry logic: run up to 3 times with 3 second delays
	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if attempt > 1 {
			pterm.Warning.Printf("Skaffold attempt %d/%d (retrying after error)...\n", attempt, maxRetries)
			// Wait 3 seconds between retries
			time.Sleep(3 * time.Second)
		}

		// Execute the command directly and let it inherit stdout/stderr
		cmd := exec.Command("sh", "-c", skaffoldCmd)
		cmd.Stdin = os.Stdin   // Allow interactive input if needed
		cmd.Stdout = os.Stdout // Direct output to terminal
		cmd.Stderr = os.Stderr // Direct errors to terminal

		// Run the command (combines Start and Wait)
		err = cmd.Run()

		if err == nil {
			// Success
			pterm.Warning.Println("If you encounter issues after Skaffold command: delete and rebootstrap the cluster")
			pterm.Info.Println("Skaffold development session completed")
			return nil
		}

		if attempt == maxRetries {
			// Last attempt failed
			pterm.Error.Printf("Skaffold failed after %d attempts: %v\n", maxRetries, err)
			return nil // Return nil to avoid double error reporting
		}

		// Log the error but continue to retry
		pterm.Warning.Printf("Skaffold attempt %d failed: %v\n", attempt, err)
	}

	return nil
}

// buildSkaffoldArgs builds the arguments for skaffold dev command
func (s *Service) buildSkaffoldArgs(selectedService *ui.ServiceSelection, namespace string, flags *models.ScaffoldFlags) []string {
	args := []string{"dev"}

	// Disable cache artifacts for development
	args = append(args, "--cache-artifacts=false")

	// Use the detected namespace or the one from flags
	targetNamespace := namespace
	if flags.Namespace != "" {
		targetNamespace = flags.Namespace
	}

	// Default to "default" if no namespace is provided
	if targetNamespace == "" {
		targetNamespace = "default"
	}

	args = append(args, "-n", targetNamespace)

	// Add verbose flag if enabled
	if s.verbose {
		args = append(args, "--verbosity", "info")
	}

	return args
}

// setupSignalHandler sets up graceful shutdown on SIGINT/SIGTERM
func (s *Service) setupSignalHandler() {
	signal.Notify(s.signalChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-s.signalChan
		if s.isRunning {
			pterm.Info.Println("Received interrupt signal, stopping Skaffold...")
			s.isRunning = false
		}
	}()
}

// IsRunning returns whether Skaffold is currently running
func (s *Service) IsRunning() bool {
	return s.isRunning
}

// Stop manually stops the Skaffold development session
func (s *Service) Stop() error {
	if !s.isRunning {
		return fmt.Errorf("no active Skaffold session")
	}

	pterm.Info.Println("Stopping Skaffold development session...")
	s.isRunning = false
	return nil
}

// ShowSkaffoldConfigInfoAndSelectService displays skaffold files and prompts user to select one
func (s *Service) ShowSkaffoldConfigInfoAndSelectService() (*ui.ServiceSelection, error) {
	skaffoldUI := ui.NewSkaffoldUI(s.verbose)
	return skaffoldUI.DiscoverAndSelectService()
}

// determineNamespace determines the appropriate namespace using kubectl provider
func (s *Service) determineNamespace(ctx context.Context, serviceName string, flags *models.ScaffoldFlags) (string, error) {
	// If namespace is explicitly provided in flags, use it
	if flags.Namespace != "" {
		return flags.Namespace, nil
	}

	// Use kubectl provider to find the namespace by searching for existing resources
	namespace, err := s.kubectlProvider.FindResourceNamespace(ctx, serviceName)
	if err != nil {
		return "", err
	}

	return namespace, nil
}
