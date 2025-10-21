package dev

import (
	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/spf13/cobra"
)

// GetDevCmd returns the dev command and its subcommands
func GetDevCmd() *cobra.Command {
	devCmd := &cobra.Command{
		Use:     "dev",
		Aliases: []string{"d"},
		Short:   "Development tools for local Kubernetes workflows",
		Long: `Development Tools - Local development workflows with Telepresence and Skaffold

This command group provides development workflow functionality:
  • intercept - Intercept traffic from cluster services to local development
  • skaffold - Deploy development versions of services with live reloading

Supports Telepresence for traffic interception and custom Skaffold workflows.

Examples:
  openframe dev intercept my-service
  openframe dev skaffold my-service`,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			// Show logo for subcommands, but not for the root dev command
			if cmd.Use != "dev" {
				ui.ShowLogoWithContext(cmd.Context())
			}
			// Check prerequisites for both intercept and skaffold commands
			if cmd.Use == "intercept [service-name]" || cmd.Name() == "intercept" {
				return prerequisites.CheckInterceptPrerequisites()
			}
			if cmd.Use == "skaffold [cluster-name]" || cmd.Name() == "skaffold" {
				return prerequisites.CheckScaffoldPrerequisites()
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			// Show logo when no subcommand is provided
			ui.ShowLogoWithContext(cmd.Context())
			return cmd.Help()
		},
	}

	// Add subcommands
	devCmd.AddCommand(
		getInterceptCmd(),
		getScaffoldCmd(),
	)

	// Add global flags following cluster pattern
	models.AddGlobalFlags(devCmd)

	return devCmd
}
