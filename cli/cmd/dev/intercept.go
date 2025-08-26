package dev

import (
	"context"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/dev/services/intercept"
	"github.com/flamingo/openframe/internal/dev/ui"
	devMocks "github.com/flamingo/openframe/tests/mocks/dev"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/spf13/cobra"
)

// getInterceptCmd returns the intercept command
func getInterceptCmd() *cobra.Command {
	flags := &models.InterceptFlags{}

	cmd := &cobra.Command{
		Use:   "intercept [service-name]",
		Short: "Intercept cluster traffic to local development environment",
		Long: `Intercept Cluster Traffic - Route service traffic to your local machine

This command uses Telepresence to intercept traffic from a Kubernetes service
and redirect it to your local development environment for real-time debugging
and development.

The intercept command manages the full Telepresence lifecycle:
  • Connects to the Kubernetes cluster
  • Sets up traffic interception for the specified service  
  • Routes matching traffic to your local environment
  • Provides cleanup and disconnection capabilities

Examples:
  openframe dev intercept                             # Interactive service selection
  openframe dev intercept my-service --port 8080
  openframe dev intercept my-service --port 8080 --namespace my-namespace
  openframe dev intercept my-service --mount /tmp/volumes --env-file .env`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runIntercept(cmd, args, flags)
		},
	}

	// Add intercept-specific flags
	cmd.Flags().IntVar(&flags.Port, "port", 8080, "Local port to forward traffic to")
	cmd.Flags().StringVar(&flags.Namespace, "namespace", "default", "Kubernetes namespace of the service")
	cmd.Flags().StringVar(&flags.Mount, "mount", "", "Mount remote volumes to local path")
	cmd.Flags().StringVar(&flags.EnvFile, "env-file", "", "Load environment variables from file")
	cmd.Flags().BoolVar(&flags.Global, "global", false, "Intercept all traffic (not just from specific headers)")
	cmd.Flags().StringSliceVar(&flags.Header, "header", nil, "Only intercept traffic with these headers (format: key=value)")
	cmd.Flags().BoolVar(&flags.Replace, "replace", false, "Replace existing intercept if it exists")
	cmd.Flags().StringVar(&flags.RemotePortName, "remote-port", "", "Remote port name for intercept (defaults to port number)")

	return cmd
}

// runIntercept handles both interactive and flag-based intercept modes
func runIntercept(cmd *cobra.Command, args []string, flags *models.InterceptFlags) error {
	// Get flags from command
	verbose, _ := cmd.Flags().GetBool("verbose")
	dryRun, _ := cmd.Flags().GetBool("dry-run")
	ctx := context.Background()

	// If no service name provided, run interactive mode
	if len(args) == 0 {
		return runInteractiveIntercept(ctx, verbose, dryRun)
	}

	// Service name provided - use flag-based mode
	exec := executor.NewRealCommandExecutor(dryRun, verbose)
	service := intercept.NewService(exec, verbose)
	
	return service.StartIntercept(args[0], flags)
}

// runInteractiveIntercept runs the simplified interactive intercept flow
func runInteractiveIntercept(ctx context.Context, verbose, dryRun bool) error {
	// Create mock Kubernetes client for demonstration
	// In a real implementation, this would be a real Kubernetes client
	kubernetesClient := devMocks.NewMockKubernetesClient()
	
	// Create UI service (using the same mock client for both interfaces)
	uiService := ui.NewService(kubernetesClient, kubernetesClient)
	
	// Run interactive setup
	setup, err := uiService.InteractiveInterceptSetup(ctx)
	if err != nil {
		return err
	}

	// Convert to intercept flags
	flags := &models.InterceptFlags{
		Port:      setup.LocalPort,
		Namespace: setup.Namespace,
	}

	// Create executor and service
	exec := executor.NewRealCommandExecutor(dryRun, verbose)
	interceptService := intercept.NewService(exec, verbose)
	
	// Start the intercept
	return interceptService.StartIntercept(setup.ServiceName, flags)
}