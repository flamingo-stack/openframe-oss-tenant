package dev

import (
	"context"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	scaffoldService "github.com/flamingo-stack/openframe/openframe/internal/dev/services/scaffold"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
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
  openframe dev skaffold                    # Interactive cluster creation and scaffolding
  openframe dev skaffold my-dev-cluster    # Scaffold with specific cluster name
  openframe dev skaffold --port 8080       # Custom local development port`,
		Args: cobra.MaximumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			return runScaffold(cmd, args, flags)
		},
	}

	// Add scaffold-specific flags
	cmd.Flags().IntVar(&flags.Port, "port", 8080, "Local development port")
	cmd.Flags().StringVar(&flags.Namespace, "namespace", "", "Kubernetes namespace to deploy to")
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

	// Create service and run scaffold workflow
	exec := executor.NewRealCommandExecutor(dryRun, verbose)
	service := scaffoldService.NewService(exec, verbose)

	return service.RunScaffoldWorkflow(ctx, args, flags)
}
