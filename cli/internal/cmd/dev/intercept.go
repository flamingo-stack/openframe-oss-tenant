package dev

import (
	"github.com/spf13/cobra"
)

// getInterceptCmd returns the intercept command
func getInterceptCmd() *cobra.Command {
	interceptCmd := &cobra.Command{
		Use:   "intercept [service-name]",
		Short: "Intercept traffic to a service for local development",
		Long: `Traffic Interception - Route cluster traffic to local development environment

Uses Telepresence to intercept traffic destined for a service in the cluster
and route it to your local development environment instead. This allows you
to test local changes against real cluster dependencies.

Prerequisites:
  - Active cluster (use 'cluster status' to verify)
  - Telepresence installed and configured
  - Target service deployed in cluster

Examples:
  # Intercept all traffic to user-service
  openframe dev intercept user-service

  # Intercept with specific port mapping
  openframe dev intercept user-service --port 8080:3000
`,
		Args: cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			// TODO: Implement intercept logic
			// serviceName := args[0]
			// interceptService(serviceName)
		},
	}

	interceptCmd.Flags().String("port", "", "Local port mapping (local:remote)")
	interceptCmd.Flags().String("namespace", "default", "Kubernetes namespace")
	interceptCmd.Flags().Bool("preview", false, "Create preview URL for sharing")

	return interceptCmd
}