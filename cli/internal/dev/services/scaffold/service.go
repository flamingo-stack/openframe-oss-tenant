package scaffold

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/flamingo/openframe/internal/bootstrap"
	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/dev/prerequisites/scaffold"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Service provides Skaffold development workflow functionality
type Service struct {
	executor    executor.CommandExecutor
	verbose     bool
	signalChan  chan os.Signal
	isRunning   bool
}

// NewService creates a new scaffold service
func NewService(executor executor.CommandExecutor, verbose bool) *Service {
	return &Service{
		executor:   executor,
		verbose:    verbose,
		signalChan: make(chan os.Signal, 1),
		isRunning:  false,
	}
}

// RunScaffoldWorkflow runs the complete scaffold workflow
func (s *Service) RunScaffoldWorkflow(ctx context.Context, args []string, flags *models.ScaffoldFlags) error {
	// Prerequisites are checked in PersistentPreRunE, so we can proceed directly

	// Step 1: Install charts on the cluster
	clusterName := s.getClusterName(args)
	if !flags.SkipBootstrap {
		if err := s.runChartInstall(clusterName, flags); err != nil {
			return fmt.Errorf("chart install failed: %w", err)
		}
	} else {
		pterm.Info.Printf("Skipping chart install for cluster '%s' (--skip-bootstrap flag provided)\n", clusterName)
	}

	// Step 2: Run Skaffold development workflow
	if err := s.runSkaffoldDev(ctx, flags); err != nil {
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

// getClusterName determines cluster name from args or uses default
func (s *Service) getClusterName(args []string) string {
	if len(args) > 0 {
		return args[0]
	}
	return "openframe-dev" // default cluster name for scaffold
}

// runChartInstall runs chart install on the specified cluster using bootstrap service
func (s *Service) runChartInstall(clusterName string, flags *models.ScaffoldFlags) error {
	pterm.Info.Printf("Installing charts on cluster '%s'...\n", clusterName)

	// Create bootstrap service
	bootstrapService := bootstrap.NewService()

	// Prepare args for bootstrap service
	args := []string{}
	if clusterName != "" {
		args = append(args, clusterName)
	}

	// Run bootstrap (which includes chart install)
	err := bootstrapService.Execute(nil, args)
	if err != nil {
		return fmt.Errorf("chart installation failed: %w", err)
	}

	pterm.Success.Printf("Charts installed successfully on cluster '%s'\n", clusterName)
	return nil
}

// runSkaffoldDev runs the Skaffold development workflow
func (s *Service) runSkaffoldDev(ctx context.Context, flags *models.ScaffoldFlags) error {
	pterm.Info.Println("Starting Skaffold development workflow...")

	// Set up signal handling for graceful shutdown
	s.setupSignalHandler()

	// Build Skaffold command arguments
	args := s.buildSkaffoldArgs(flags)

	if s.verbose {
		pterm.Info.Printf("Running: skaffold %v\n", args)
	}

	// Mark as running
	s.isRunning = true

	// Run skaffold dev command
	_, err := s.executor.Execute(ctx, "skaffold", args...)
	if err != nil {
		s.isRunning = false
		return fmt.Errorf("skaffold dev command failed: %w", err)
	}

	s.isRunning = false
	pterm.Success.Println("Skaffold development session completed")
	return nil
}

// buildSkaffoldArgs builds the arguments for skaffold dev command
func (s *Service) buildSkaffoldArgs(flags *models.ScaffoldFlags) []string {
	args := []string{"dev"}

	// Always enable port forwarding for development
	args = append(args, "--port-forward")

	// Add namespace if specified
	if flags.Namespace != "" {
		args = append(args, "--namespace", flags.Namespace)
	}

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