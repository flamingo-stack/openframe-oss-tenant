package dev

import (
	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/dev/services/intercept"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/flamingo/openframe/internal/shared/ui"
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
  openframe dev intercept my-service --port 8080
  openframe dev intercept my-service --port 8080 --namespace my-namespace
  openframe dev intercept my-service --mount /tmp/volumes --env-file .env`,
		Args: cobra.ExactArgs(1),
		PreRunE: func(cmd *cobra.Command, args []string) error {
			ui.ShowLogoWithContext(cmd.Context())
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			// Get flags from command
			verbose, _ := cmd.Flags().GetBool("verbose")
			dryRun, _ := cmd.Flags().GetBool("dry-run")
			
			// Create executor and service
			exec := executor.NewRealCommandExecutor(dryRun, verbose)
			service := intercept.NewService(exec, verbose)
			
			return service.StartIntercept(args[0], flags)
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