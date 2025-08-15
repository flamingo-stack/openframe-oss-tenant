package cluster

import (
	"context"
	"fmt"

	uiCommon "github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/internal/factory"
)

func getDeleteCmd() *cobra.Command {
	cmd := &cobra.Command{
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
		RunE: runDeleteCluster,
	}

	// Add flags to the delete command
	cmd.Flags().BoolVarP(&force, "force", "f", false, "Skip confirmation prompt")

	return cmd
}

func runDeleteCluster(cmd *cobra.Command, args []string) error {
	uiCommon.ShowLogo()
	ctx := context.Background()
	manager := factory.CreateDefaultClusterManager()

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
	if err := provider.Delete(ctx, clusterName, force); err != nil {
		return fmt.Errorf("failed to delete cluster: %w", err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Cluster '%s' deleted successfully!\n", clusterName)
	return nil
}