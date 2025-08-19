package chart

import (
	"github.com/flamingo/openframe/internal/chart/models"
	"github.com/flamingo/openframe/internal/chart/prerequisites"
	"github.com/flamingo/openframe/internal/chart/utils"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/spf13/cobra"
)

// GetChartCmd returns the chart command and its subcommands
func GetChartCmd() *cobra.Command {
	// Initialize global flags
	utils.InitGlobalFlags()
	
	chartCmd := &cobra.Command{
		Use:     "chart",
		Aliases: []string{"c"},
		Short:   "Manage Helm charts",
		Long: `Chart Management - Install, manage, and configure Helm charts

This command group provides chart lifecycle management functionality:
  • install - Install ArgoCD and app-of-apps pattern on a cluster
  • uninstall - Remove charts from a cluster  
  • status - Display chart installation status

Requires an existing cluster created with 'openframe cluster create'.

Examples:
  openframe chart install
  openframe chart status`,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			// Check prerequisites before running any chart command
			installer := prerequisites.NewInstaller()
			return installer.CheckAndInstall()
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			// Show logo when no subcommand is provided
			ui.ShowLogo()
			return cmd.Help()
		},
	}

	// Add subcommands
	chartCmd.AddCommand(
		getInstallCmd(),
	)

	// Add global flags
	models.AddGlobalFlags(chartCmd, utils.GetGlobalFlags().Global)

	return chartCmd
}