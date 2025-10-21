package cluster

import (
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	sharedErrors "github.com/flamingo-stack/openframe/openframe/internal/shared/errors"
	"github.com/spf13/cobra"
)

func getDeleteCmd() *cobra.Command {
	// Ensure global flags are initialized
	utils.InitGlobalFlags()

	deleteCmd := &cobra.Command{
		Use:   "delete [NAME]",
		Short: "Delete a Kubernetes cluster",
		Long: `Delete a Kubernetes cluster and clean up all associated resources.

Stops intercepts, deletes cluster, cleans up Docker resources,
and removes cluster configuration.

Examples:
  openframe cluster delete my-cluster
  openframe cluster delete my-cluster --force
  openframe cluster delete  # interactive selection`,
		Args: cobra.MaximumNArgs(1),
		PreRunE: func(cmd *cobra.Command, args []string) error {
			utils.SyncGlobalFlags()
			if err := utils.ValidateGlobalFlags(); err != nil {
				return err
			}
			globalFlags := utils.GetGlobalFlags()
			if globalFlags != nil && globalFlags.Delete != nil {
				return models.ValidateDeleteFlags(globalFlags.Delete)
			}
			return nil
		},
		RunE: utils.WrapCommandWithCommonSetup(runDeleteCluster),
	}

	// Add delete-specific flags
	globalFlags := utils.GetGlobalFlags()
	if globalFlags != nil && globalFlags.Delete != nil {
		models.AddDeleteFlags(deleteCmd, globalFlags.Delete)
	}

	return deleteCmd
}

func runDeleteCluster(cmd *cobra.Command, args []string) error {
	service := utils.GetCommandService()
	operationsUI := ui.NewOperationsUI()

	// Get all available clusters
	clusters, err := service.ListClusters()
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	// Handle cluster selection with friendly UI (including confirmation)
	globalFlags := utils.GetGlobalFlags()
	clusterName, err := operationsUI.SelectClusterForDelete(clusters, args, globalFlags.Delete.Force)
	if err != nil {
		return sharedErrors.HandleGlobalError(err, globalFlags.Global.Verbose)
	}

	// If no cluster selected (e.g., empty list or cancelled), exit gracefully
	if clusterName == "" {
		return nil
	}

	// Show friendly start message
	operationsUI.ShowOperationStart("delete", clusterName)

	// Detect cluster type
	clusterType, err := service.DetectClusterType(clusterName)
	if err != nil {
		operationsUI.ShowOperationError("delete", clusterName, err)
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	// Execute cluster deletion through service layer
	err = service.DeleteCluster(clusterName, clusterType, globalFlags.Delete.Force)
	if err != nil {
		operationsUI.ShowOperationError("delete", clusterName, err)
		return sharedErrors.HandleGlobalError(err, globalFlags.Global.Verbose)
	}

	// Show friendly success message
	operationsUI.ShowOperationSuccess("delete", clusterName)
	return nil
}
