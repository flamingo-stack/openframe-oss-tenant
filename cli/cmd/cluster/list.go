package cluster

import (
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/spf13/cobra"
)

func getListCmd() *cobra.Command {
	// Ensure global flags are initialized
	utils.InitGlobalFlags()

	listCmd := &cobra.Command{
		Use:   "list",
		Short: "List all Kubernetes clusters",
		Long: `List all Kubernetes clusters managed by OpenFrame CLI.

Displays cluster information including name, type, status, and node count
from all registered providers in a formatted table.

Examples:
  openframe cluster list
  openframe cluster list --verbose
  openframe cluster list --quiet`,
		PreRunE: func(cmd *cobra.Command, args []string) error {
			utils.SyncGlobalFlags()
			if err := utils.ValidateGlobalFlags(); err != nil {
				return err
			}
			globalFlags := utils.GetGlobalFlags()
			if globalFlags != nil && globalFlags.List != nil {
				return models.ValidateListFlags(globalFlags.List)
			}
			return nil
		},
		RunE: utils.WrapCommandWithCommonSetup(runListClusters),
	}

	// Add list-specific flags
	globalFlags := utils.GetGlobalFlags()
	if globalFlags != nil && globalFlags.List != nil {
		models.AddListFlags(listCmd, globalFlags.List)
	}

	return listCmd
}

func runListClusters(cmd *cobra.Command, args []string) error {
	service := utils.GetCommandService()

	// Get all clusters
	clusters, err := service.ListClusters()
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	// Use the service to display the clusters
	globalFlags := utils.GetGlobalFlags()
	return service.DisplayClusterList(clusters, globalFlags.List.Quiet, globalFlags.Global.Verbose)
}
