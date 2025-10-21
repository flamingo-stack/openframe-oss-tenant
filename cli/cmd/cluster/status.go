package cluster

import (
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/spf13/cobra"
)

func getStatusCmd() *cobra.Command {
	// Ensure global flags are initialized
	utils.InitGlobalFlags()

	statusCmd := &cobra.Command{
		Use:   "status [NAME]",
		Short: "Show detailed cluster status and information",
		Long: `Show detailed status information for a Kubernetes cluster.

Displays cluster health, node status, installed applications,
resource usage, and connectivity information.

Examples:
  openframe cluster status my-cluster
  openframe cluster status  # interactive selection
  openframe cluster status my-cluster --detailed`,
		Args: cobra.MaximumNArgs(1),
		PreRunE: func(cmd *cobra.Command, args []string) error {
			utils.SyncGlobalFlags()
			if err := utils.ValidateGlobalFlags(); err != nil {
				return err
			}
			return models.ValidateStatusFlags(utils.GetGlobalFlags().Status)
		},
		RunE: utils.WrapCommandWithCommonSetup(runClusterStatus),
	}

	// Add status-specific flags
	models.AddStatusFlags(statusCmd, utils.GetGlobalFlags().Status)

	return statusCmd
}

func runClusterStatus(cmd *cobra.Command, args []string) error {
	service := utils.GetCommandService()
	operationsUI := ui.NewOperationsUI()

	// Get all available clusters
	clusters, err := service.ListClusters()
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	// Handle cluster selection with friendly UI
	clusterName, err := operationsUI.SelectClusterForOperation(clusters, args, "check status")
	if err != nil {
		return err
	}

	// If no cluster selected (e.g., empty list), exit gracefully
	if clusterName == "" {
		return nil
	}

	// Execute cluster status through service layer
	globalFlags := utils.GetGlobalFlags()
	return service.ShowClusterStatus(clusterName, globalFlags.Status.Detailed, globalFlags.Status.NoApps, globalFlags.Global.Verbose)
}
