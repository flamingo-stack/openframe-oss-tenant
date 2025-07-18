package cmd

import (
	"context"
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

var (
	devPortForward bool
	devTail        bool
	devCleanup     bool
	devVerbose     bool
	devTimeout     string
)

var devCmd = &cobra.Command{
	Use:   "dev [service]",
	Short: "Run a service in development mode",
	Long: `Run a service in development mode using Skaffold.

This command starts a service in development mode with hot reloading,
port forwarding, and log tailing capabilities.

Examples:
  openframe dev openframe-api          # Start API service in dev mode
  openframe dev openframe-ui --tail   # Start UI with log tailing
  openframe dev openframe-gateway --port-forward  # Start with port forwarding
  openframe dev openframe-api --timeout 30m       # Set custom timeout`,
	Args: func(cmd *cobra.Command, args []string) error {
		if err := cobra.ExactArgs(1)(cmd, args); err != nil {
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

		// Set verbose mode if requested
		if devVerbose {
			cli.SetVerbose(true)
		}

		// Pass command flags to the developer module
		cli.SetDevFlags(devPortForward, devTail, devCleanup, devTimeout)

		return withGracefulShutdown(context.Background(), func(ctx context.Context) error {
			return cli.Dev(ctx, service)
		})
	},
}

func init() {
	devCmd.Flags().BoolVar(&devPortForward, "port-forward", true, "Enable port forwarding")
	devCmd.Flags().BoolVar(&devTail, "tail", true, "Tail logs")
	devCmd.Flags().BoolVar(&devCleanup, "cleanup", true, "Clean up resources on exit")
	devCmd.Flags().BoolVarP(&devVerbose, "verbose", "v", false, "Enable verbose output")
	devCmd.Flags().StringVar(&devTimeout, "timeout", "0", "Timeout for the development session (e.g., 30m, 1h)")

	rootCmd.AddCommand(devCmd)
}
