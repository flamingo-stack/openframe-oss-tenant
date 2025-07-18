package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var (
	interceptMount   bool
	interceptForce   bool
	interceptVerbose bool
	interceptTimeout string
)

var interceptCmd = &cobra.Command{
	Use:   "intercept [service] [local-port] [remote-port]",
	Short: "Intercept a service with telepresence",
	Long: `Intercept a service with telepresence for local development.

This command creates a telepresence intercept that allows you to run a service
locally while it appears to be running in the cluster.

Examples:
  openframe intercept openframe-api 8080 8080     # Intercept API on port 8080
  openframe intercept openframe-ui 3000 80        # Intercept UI on port 3000
  openframe intercept openframe-gateway 8081 8080 --mount  # Intercept with mount
  openframe intercept openframe-api 8080 8080 --force      # Force intercept creation`,
	Args: func(cmd *cobra.Command, args []string) error {
		if err := cobra.ExactArgs(3)(cmd, args); err != nil {
			return err
		}
		// Validate service name is not empty or whitespace
		if strings.TrimSpace(args[0]) == "" {
			return fmt.Errorf("service name cannot be empty")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		service := args[0]
		localPort := args[1]
		remotePort := args[2]

		// Validate service name
		if strings.TrimSpace(service) == "" {
			return fmt.Errorf("service name cannot be empty")
		}

		// Validate service exists (only if CLI is initialized)
		if cli != nil {
			if err := cli.ValidateService(service); err != nil {
				return fmt.Errorf("service not found: %s", service)
			}
		}

		// If CLI is not initialized (e.g., in tests), just return success
		if cli == nil {
			return nil
		}

		// Validate ports
		if err := cli.ValidatePort(localPort); err != nil {
			return fmt.Errorf("invalid local port: %v", err)
		}
		if err := cli.ValidatePort(remotePort); err != nil {
			return fmt.Errorf("invalid remote port: %v", err)
		}

		// Set verbose mode if requested
		if interceptVerbose {
			cli.SetVerbose(true)
		}

		// Pass command flags to the interceptor module
		cli.SetInterceptFlags(interceptMount, interceptForce, interceptTimeout)

		return withGracefulShutdown(context.Background(), func(ctx context.Context) error {
			return cli.Intercept(ctx, service, localPort, remotePort)
		})
	},
}

func init() {
	interceptCmd.Flags().BoolVar(&interceptMount, "mount", false, "Mount the remote filesystem")
	interceptCmd.Flags().BoolVar(&interceptForce, "force", false, "Force intercept creation (remove existing)")
	interceptCmd.Flags().BoolVarP(&interceptVerbose, "verbose", "v", false, "Enable verbose output")
	interceptCmd.Flags().StringVar(&interceptTimeout, "timeout", "30s", "Timeout for intercept creation")

	rootCmd.AddCommand(interceptCmd)
}
