package dev

import (
	"github.com/spf13/cobra"
)

// GetDevCmd returns the dev command and its subcommands
func GetDevCmd() *cobra.Command {
	devCmd := &cobra.Command{
		Use:     "dev",
		Aliases: []string{"d"},
		Short:   "Development tools for working with clusters",
		Long: `Development Tools - Interactive development utilities for cluster workflows

This command group provides development tools that operate within
or against existing Kubernetes clusters:

  - intercept - Telepresence traffic interception for local development
  - scaffold - Code scaffolding and template generation

These tools assume you have an existing cluster (created via 'cluster create')
and help with day-to-day development workflows.

Examples:
  # Start a service intercept for local development
  openframe dev intercept service-name

  # Generate scaffolding for a new microservice
  openframe dev scaffold microservice
`,
		Run: func(cmd *cobra.Command, args []string) {
			cmd.Help()
		},
	}

	// Add subcommands
	devCmd.AddCommand(
		getInterceptCmd(),
		getScaffoldCmd(),
	)

	return devCmd
}