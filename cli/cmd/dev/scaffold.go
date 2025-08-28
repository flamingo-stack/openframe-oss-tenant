package dev

import (
	"context"

	clusterUI "github.com/flamingo/openframe/internal/cluster/ui"
	clusterUtils "github.com/flamingo/openframe/internal/cluster/utils"
	"github.com/flamingo/openframe/internal/dev/models"
	scaffoldService "github.com/flamingo/openframe/internal/dev/services/scaffold"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

// getScaffoldCmd returns the scaffold command
func getScaffoldCmd() *cobra.Command {
	flags := &models.ScaffoldFlags{}

	cmd := &cobra.Command{
		Use:   "skaffold [cluster-name]",
		Short: "Deploy development versions of services with live reloading",
		Long: `Scaffold Development Environment - Deploy services with hot reloading
		
This command sets up a complete development environment by:
  • Checking Skaffold prerequisites
  • Bootstrapping a cluster with autosync disabled for development
  • Running Skaffold for live code reloading and development

The scaffold command manages the full development lifecycle:
  • Prerequisites validation (Skaffold installation)
  • Cluster bootstrap with development-friendly settings
  • Live reloading and hot deployment capabilities
  • Integration with existing OpenFrame infrastructure

Examples:
  openframe dev scaffold                    # Interactive cluster creation and scaffolding
  openframe dev scaffold my-dev-cluster    # Scaffold with specific cluster name
  openframe dev scaffold --port 8080       # Custom local development port`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runScaffold(cmd, args, flags)
		},
	}

	// Add scaffold-specific flags
	cmd.Flags().IntVar(&flags.Port, "port", 8080, "Local development port")
	cmd.Flags().StringVar(&flags.Namespace, "namespace", "default", "Kubernetes namespace to deploy to")
	cmd.Flags().StringVar(&flags.Image, "image", "", "Docker image to use for the service")
	cmd.Flags().StringVar(&flags.SyncLocal, "sync-local", "", "Local directory to sync to the container")
	cmd.Flags().StringVar(&flags.SyncRemote, "sync-remote", "", "Remote directory to sync files to")
	cmd.Flags().BoolVar(&flags.SkipBootstrap, "skip-bootstrap", false, "Skip bootstrapping cluster")
	cmd.Flags().StringVar(&flags.HelmValuesFile, "helm-values", "", "Custom Helm values file for bootstrap")

	return cmd
}

// runScaffold handles the scaffold command execution
func runScaffold(cmd *cobra.Command, args []string, flags *models.ScaffoldFlags) error {
	verbose, _ := cmd.Flags().GetBool("verbose")
	dryRun, _ := cmd.Flags().GetBool("dry-run")
	ctx := context.Background()

	// If cluster name provided as argument, use direct execution
	if len(args) > 0 {
		exec := executor.NewRealCommandExecutor(dryRun, verbose)
		service := scaffoldService.NewService(exec, verbose)
		return service.RunScaffoldWorkflow(ctx, args, flags)
	}

	// No cluster name provided - run interactive mode with cluster selection
	return runInteractiveScaffold(ctx, verbose, dryRun, flags)
}

// runInteractiveScaffold runs the interactive scaffold flow with cluster selection
func runInteractiveScaffold(ctx context.Context, verbose, dryRun bool, flags *models.ScaffoldFlags) error {
	// Step 1: Select cluster using same pattern as intercept
	clusterName, err := selectClusterForScaffold(verbose)
	if err != nil || clusterName == "" {
		return err
	}

	// Step 2: Create executor and service
	exec := executor.NewRealCommandExecutor(dryRun, verbose)
	service := scaffoldService.NewService(exec, verbose)

	// Step 3: Run scaffold workflow with selected cluster
	args := []string{clusterName}
	return service.RunScaffoldWorkflow(ctx, args, flags)
}

// selectClusterForScaffold handles cluster selection for scaffold using same logic as intercept
func selectClusterForScaffold(verbose bool) (string, error) {
	// Create cluster service using the same pattern as intercept
	clusterService := clusterUtils.GetCommandService()
	
	// Get list of clusters
	clusters, err := clusterService.ListClusters()
	if err != nil {
		if verbose {
			pterm.Error.Printf("Failed to list clusters: %v\n", err)
		}
		// Show the same error message as intercept
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return "", nil // Return nil error like intercept does
	}
	
	// Check if we have any clusters
	if len(clusters) == 0 {
		if verbose {
			pterm.Info.Printf("Found 0 clusters\n")
		}
		// Show the same error message as intercept
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return "", nil // Return nil error like intercept does
	}
	
	if verbose {
		pterm.Info.Printf("Found %d clusters\n", len(clusters))
		for _, cluster := range clusters {
			pterm.Info.Printf("  - %s (%s)\n", cluster.Name, cluster.Status)
		}
	}
	
	// Use cluster selector UI - same as intercept
	selector := clusterUI.NewSelector("scaffold")
	return selector.SelectCluster(clusters, []string{})
}