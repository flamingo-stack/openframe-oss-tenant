package cluster

import (
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/spf13/cobra"
)

func getCleanupCmd() *cobra.Command {
	// Ensure global flags are initialized
	utils.InitGlobalFlags()

	cleanupCmd := &cobra.Command{
		Use:   "cleanup [NAME]",
		Short: "Clean up unused cluster resources",
		Long: `Remove unused images and resources from cluster nodes.

Cleans up Docker images and resources, freeing disk space.
Useful for development clusters with many builds.

Examples:
  openframe cluster cleanup
  openframe cluster cleanup my-cluster
  openframe cluster cleanup my-cluster --force`,
		Args:    cobra.MaximumNArgs(1),
		Aliases: []string{"c"},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			utils.SyncGlobalFlags()
			if err := utils.ValidateGlobalFlags(); err != nil {
				return err
			}
			return models.ValidateCleanupFlags(utils.GetGlobalFlags().Cleanup)
		},
		RunE: utils.WrapCommandWithCommonSetup(runCleanupCluster),
	}

	// Add cleanup-specific flags
	models.AddCleanupFlags(cleanupCmd, utils.GetGlobalFlags().Cleanup)

	return cleanupCmd
}

func runCleanupCluster(cmd *cobra.Command, args []string) error {
	service := utils.GetCommandService()
	operationsUI := ui.NewOperationsUI()

	// Get all available clusters
	clusters, err := service.ListClusters()
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	// Handle cluster selection with friendly UI (including confirmation)
	globalFlags := utils.GetGlobalFlags()
	clusterName, err := operationsUI.SelectClusterForCleanup(clusters, args, globalFlags.Cleanup.Force)
	if err != nil {
		return err
	}

	// If no cluster selected (e.g., empty list or cancelled), exit gracefully
	if clusterName == "" {
		return nil
	}

	// Show friendly start message
	operationsUI.ShowOperationStart("cleanup", clusterName)

	// Detect cluster type
	clusterType, err := service.DetectClusterType(clusterName)
	if err != nil {
		operationsUI.ShowOperationError("cleanup", clusterName, err)
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	// Execute cluster cleanup through service layer
	err = service.CleanupCluster(clusterName, clusterType, utils.GetGlobalFlags().Global.Verbose, utils.GetGlobalFlags().Cleanup.Force)
	if err != nil {
		operationsUI.ShowOperationError("cleanup", clusterName, err)
		return err
	}

	// Show friendly success message
	operationsUI.ShowOperationSuccess("cleanup", clusterName)
	return nil
}

// GetCleanupCmdForTesting returns the cleanup command for testing purposes
func GetCleanupCmdForTesting() *cobra.Command {
	return getCleanupCmd()
}
