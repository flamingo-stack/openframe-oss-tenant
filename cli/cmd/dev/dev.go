package dev

import (
	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/spf13/cobra"
)

// GetDevCmd returns the dev command and its subcommands
func GetDevCmd() *cobra.Command {
	devCmd := &cobra.Command{
		Use:     "dev",
		Aliases: []string{"d"},
		Short:   "Development tools for local Kubernetes workflows",
		Long: `Development Tools - Local development workflows with Telepresence and Scaffold

This command group provides development workflow functionality:
  • intercept - Intercept traffic from cluster services to local development
  • scaffold - Deploy development versions of services with live reloading

Supports Telepresence for traffic interception and custom scaffolding workflows.

Examples:
  openframe dev intercept my-service
  openframe dev scaffold my-service`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Show logo when no subcommand is provided
			ui.ShowLogoWithContext(cmd.Context())
			return cmd.Help()
		},
	}

	// Add subcommands
	devCmd.AddCommand(
		getInterceptCmd(),
		// getScaffoldCmd(), // Temporarily disabled - scaffold service not implemented yet
	)

	// Add global flags following cluster pattern
	models.AddGlobalFlags(devCmd)

	return devCmd
}
