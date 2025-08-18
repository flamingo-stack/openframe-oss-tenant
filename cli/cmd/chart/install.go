package chart

import (
	"github.com/flamingo/openframe/internal/chart"
	"github.com/flamingo/openframe/internal/chart/domain"
	"github.com/flamingo/openframe/internal/chart/utils"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/spf13/cobra"
)

// getInstallCmd returns the install subcommand
func getInstallCmd() *cobra.Command {
	installCmd := &cobra.Command{
		Use:   "install [cluster-name]",
		Short: "Install ArgoCD and app-of-apps",
		Long: `Install charts on a Kubernetes cluster

This command installs:
1. ArgoCD (version 8.1.4) with custom values
2. App-of-Apps pattern for OpenFrame applications

The cluster must exist before running this command.

Examples:
  openframe chart install                    # Install on default cluster
  openframe chart install my-cluster        # Install on specific cluster`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runInstallCommand(cmd, args)
		},
	}

	// Add flags specific to install
	flags := installCmd.Flags()
	flags.BoolP("force", "f", false, "Force installation even if charts already exist")
	flags.Bool("dry-run", false, "Show what would be installed without executing")

	return installCmd
}

// runInstallCommand executes the chart install logic
func runInstallCommand(cmd *cobra.Command, args []string) error {
	// Get flags
	globalFlags := utils.GetGlobalFlags()
	
	force, _ := cmd.Flags().GetBool("force")
	dryRun, _ := cmd.Flags().GetBool("dry-run")

	// Determine cluster name
	clusterName := ""
	if len(args) > 0 {
		clusterName = args[0]
	}

	// Create config
	config := domain.ChartInstallConfig{
		ClusterName: clusterName,
		Force:       force,
		DryRun:      dryRun,
		Verbose:     globalFlags.Global.Verbose,
		Silent:      false, // CommonFlags doesn't have Silent field
	}

	// Create service
	exec := executor.NewRealCommandExecutor(config.DryRun, config.Verbose)
	service := chart.NewChartService(exec)

	// Execute install
	return service.InstallCharts(config)
}