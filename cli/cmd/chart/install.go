package chart

import (
	"github.com/flamingo/openframe/internal/chart"
	"github.com/flamingo/openframe/internal/chart/models"
	"github.com/flamingo/openframe/internal/chart/prerequisites"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/flamingo/openframe/internal/chart/utils"
	"github.com/flamingo/openframe/internal/cluster"
	sharedErrors "github.com/flamingo/openframe/internal/shared/errors"
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
		PreRunE: func(cmd *cobra.Command, args []string) error {
			// Regenerate certificates for install command
			installer := prerequisites.NewInstaller()
			return installer.RegenerateCertificatesOnly()
		},
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

	// Create cluster service to get available clusters
	exec := executor.NewRealCommandExecutor(dryRun, globalFlags.Global.Verbose)
	clusterService := cluster.NewClusterService(exec)

	// Create chart operations UI
	operationsUI := chartUI.NewOperationsUI()

	// Get all available clusters
	clusters, err := clusterService.ListClusters()
	if err != nil {
		operationsUI.ShowNoClusterMessage()
		return nil
	}

	if len(clusters) == 0 {
		operationsUI.ShowNoClusterMessage()
		return nil
	}

	// Handle cluster selection with chart UI
	clusterName, err := operationsUI.SelectClusterForInstall(clusters, args)
	if err != nil {
		return sharedErrors.HandleGlobalError(err, globalFlags.Global.Verbose)
	}

	// If no cluster selected (e.g., user cancelled), exit gracefully
	if clusterName == "" {
		return nil
	}

	// Ask for installation confirmation
	confirmed, err := operationsUI.ConfirmInstallation(clusterName)
	if err != nil {
		return sharedErrors.HandleGlobalError(err, globalFlags.Global.Verbose)
	}

	if !confirmed {
		operationsUI.ShowOperationCancelled("chart installation")
		return nil
	}

	// Create config
	config := models.ChartInstallConfig{
		ClusterName: clusterName,
		Force:       force,
		DryRun:      dryRun,
		Verbose:     globalFlags.Global.Verbose,
		Silent:      false, // CommonFlags doesn't have Silent field
	}

	// Create chart service
	service := chart.NewChartService(exec)

	// Execute install
	err = service.InstallCharts(config)
	if err != nil {
		// Use global error handler for consistent error handling
		return sharedErrors.HandleGlobalError(err, globalFlags.Global.Verbose)
	}
	return nil
}

