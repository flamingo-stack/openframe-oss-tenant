package dev

import (
	"context"
	"fmt"

	clusterUI "github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	clusterUtils "github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/providers/kubectl"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
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

// runInteractiveIntercept runs the interactive intercept flow with cluster selection
func runInteractiveIntercept(ctx context.Context, verbose, dryRun bool) error {
	// Step 1: Select cluster using existing cluster service
	clusterName, err := selectClusterForIntercept(verbose)
	if err != nil || clusterName == "" {
		return err
	}

	// Step 2: Set kubectl context to the selected cluster
	if err := setKubectlContext(ctx, clusterName, verbose); err != nil {
		return fmt.Errorf("failed to set kubectl context: %w", err)
	}

	// Step 3: Create real kubectl provider
	exec := executor.NewRealCommandExecutor(dryRun, verbose)
	kubectlProvider := kubectl.NewProvider(exec, verbose)

	// Step 4: Check kubectl connection
	if err := kubectlProvider.CheckConnection(ctx); err != nil {
		return fmt.Errorf("kubectl is not connected to cluster: %w", err)
	}

	// Step 5: Create UI service with real kubectl provider
	uiService := ui.NewService(kubectlProvider, kubectlProvider)

	// Step 6: Run interactive setup
	setup, err := uiService.InteractiveInterceptSetup(ctx)
	if err != nil {
		return err
	}

	// Step 7: Convert to intercept flags
	remotePortName := setup.KubernetesPort.Name
	if remotePortName == "" {
		// If the port has no name, use the port number
		remotePortName = fmt.Sprintf("%d", setup.KubernetesPort.Port)
	}

	flags := &models.InterceptFlags{
		Port:           setup.LocalPort,
		Namespace:      setup.Namespace,
		RemotePortName: remotePortName,
	}

	// Step 8: Create intercept service and start
	interceptService := intercept.NewService(exec, verbose)

	// Start the intercept
	return interceptService.StartIntercept(setup.ServiceName, flags)
}

// selectClusterForIntercept handles cluster selection for intercept
func selectClusterForIntercept(verbose bool) (string, error) {
	// Create cluster service using the same pattern as chart install
	clusterService := clusterUtils.GetCommandService()

	// Get list of clusters
	clusters, err := clusterService.ListClusters()
	if err != nil {
		if verbose {
			pterm.Error.Printf("Failed to list clusters: %v\n", err)
		}
		// Show the same error message as chart install
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return "", nil // Return nil error like chart install does
	}

	// Check if we have any clusters
	if len(clusters) == 0 {
		if verbose {
			pterm.Info.Printf("Found 0 clusters\n")
		}
		// Show the same error message as chart install
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return "", nil // Return nil error like chart install does
	}

	if verbose {
		pterm.Info.Printf("Found %d clusters\n", len(clusters))
		for _, cluster := range clusters {
			pterm.Info.Printf("  - %s (%s)\n", cluster.Name, cluster.Status)
		}
	}

	// Use cluster selector UI - same as chart install, cluster delete, cluster status, cluster cleanup
	selector := clusterUI.NewSelector("intercept")
	return selector.SelectCluster(clusters, []string{})
}

// setKubectlContext switches kubectl context to the selected cluster
func setKubectlContext(ctx context.Context, clusterName string, verbose bool) error {
	// K3d cluster context format: k3d-<cluster-name>
	contextName := fmt.Sprintf("k3d-%s", clusterName)

	if verbose {
		pterm.Info.Printf("Setting kubectl context to: %s\n", contextName)
	}

	exec := executor.NewRealCommandExecutor(false, verbose)
	_, err := exec.Execute(ctx, "kubectl", "config", "use-context", contextName)
	if err != nil {
		return fmt.Errorf("failed to switch kubectl context to %s: %w", contextName, err)
	}

	return nil
}
