package cmd

import (
	"context"
	"fmt"

	uiCommon "github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
)

func getDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete [NAME]",
		Short: "Delete a Kubernetes cluster",
		Long: `Delete a Kubernetes cluster and clean up all associated resources.

This command will:
  1. Stop any running Telepresence intercepts
  2. Delete the Kubernetes cluster
  3. Clean up Docker networks and containers
  4. Remove cluster-specific configuration

Examples:
  # Delete specific cluster
  openframe cluster delete my-cluster

  # Interactive cluster selection
  openframe cluster delete`,
		Args: cobra.MaximumNArgs(1),
		RunE: runDeleteCluster,
	}
}

func runDeleteCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	manager := createDefaultManager()

	var clusterName string
	if len(args) > 0 {
		clusterName = args[0]
	} else {
		// Interactive cluster selection
		clusters, err := manager.ListAllClusters(ctx)
		if err != nil {
			return fmt.Errorf("failed to list clusters: %w", err)
		}

		if len(clusters) == 0 {
			fmt.Println("No clusters found.")
			return nil
		}

		var clusterNames []string
		for _, cluster := range clusters {
			clusterNames = append(clusterNames, cluster.Name)
		}

		_, selected, err := uiCommon.SelectFromList("Select cluster to delete", clusterNames)
		if err != nil {
			return fmt.Errorf("failed to select cluster: %w", err)
		}
		clusterName = selected
	}

	// Confirm deletion (unless forced)
	if !force {
		confirmed, err := uiCommon.ConfirmAction(fmt.Sprintf("Are you sure you want to delete cluster '%s'? This action cannot be undone", clusterName))
		if err != nil {
			return err
		}
		if !confirmed {
			fmt.Println("Deletion cancelled.")
			return nil
		}
	}

	// Determine cluster type and get provider
	clusterType, err := manager.DetectClusterType(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	provider, err := manager.GetProvider(clusterType)
	if err != nil {
		return err
	}

	// Delete the cluster
	fmt.Fprintf(cmd.OutOrStdout(), "Deleting cluster '%s'...\n", clusterName)
	if err := provider.Delete(ctx, clusterName); err != nil {
		return fmt.Errorf("failed to delete cluster: %w", err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Cluster '%s' deleted successfully!\n", clusterName)
	return nil
}