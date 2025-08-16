package cluster

import (
	"context"
	"fmt"
	"strings"

	"github.com/flamingo/openframe-cli/internal/cluster"
	clusterUtils "github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

func getCleanupCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "cleanup [NAME]",
		Aliases: []string{"c"},
		Short:   "Clean up unused cluster resources",
		Long: `Remove unused images and resources from cluster nodes.

Cleans up Docker images and resources, freeing disk space.
Useful for development clusters with many builds.

Examples:
  openframe cluster cleanup
  openframe cluster cleanup my-cluster`,
		Args: cobra.MaximumNArgs(1),
		RunE: runCleanupCluster,
	}
}

func runCleanupCluster(cmd *cobra.Command, args []string) error {
	common.ShowLogo()
	ctx, manager := createManager()

	var clusterName string
	if len(args) > 0 {
		clusterName = args[0]
	} else {
		// Interactive cluster selection for cleanup
		selection, err := clusterUtils.HandleClusterSelectionWithType(ctx, manager, args, "Select a cluster to cleanup:")
		if err != nil {
			return err
		}
		if selection.Name == "" {
			clusterUtils.ShowClusterOperationCancelled()
			return nil
		}
		clusterName = selection.Name
	}

	pterm.Info.Printf("Cleaning up cluster '%s' resources...\n", clusterName)

	// Determine cluster type
	clusterType, err := manager.DetectClusterType(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	switch clusterType {
	case cluster.ClusterTypeK3d:
		return cleanupK3dCluster(ctx, clusterName)
	default:
		return fmt.Errorf("cleanup not supported for cluster type: %s", clusterType)
	}
}

func cleanupK3dCluster(ctx context.Context, clusterName string) error {
	// Get actual cluster nodes instead of hardcoded names
	result := cluster.ExecDocker(ctx, "ps", "--format", "{{.Names}}", "--filter", fmt.Sprintf("name=k3d-%s", clusterName))
	if result.Error != nil {
		return fmt.Errorf("failed to detect cluster type: cluster containers not accessible: %w", result.Error)
	}

	nodeNames := strings.Split(result.Output, "\n")
	if len(nodeNames) == 1 && nodeNames[0] == "" {
		pterm.Info.Println("No cluster nodes found to cleanup")
		return nil
	}

	cleanedCount := 0
	for _, nodeName := range nodeNames {
		if nodeName == "" {
			continue
		}

		// Check if container exists and is running
		checkResult := cluster.ExecDocker(ctx, "inspect", "--format", "{{.State.Status}}", nodeName)
		if checkResult.Error != nil {
			continue // Container doesn't exist, skip
		} else if !strings.Contains(checkResult.Output, "running") {
			continue // Container is not running, skip
		}

		pterm.Info.Printf("Cleaning up %s...\n", nodeName)

		cleanupResult := cluster.ExecDocker(ctx, "exec", nodeName, "crictl", "rmi", "--prune")
		if cleanupResult.Error != nil {
			// Only show warning if verbose mode is on
			if globalFlags.Verbose {
				pterm.Warning.Printf("Failed to cleanup %s: %v\n", nodeName, cleanupResult.Error)
			}
		} else {
			cleanedCount++
		}
	}

	if cleanedCount > 0 {
		pterm.Success.Printf("Cleaned up %d cluster nodes\n", cleanedCount)
	} else {
		pterm.Info.Println("No nodes were cleaned up")
	}

	return nil
}

// GetCleanupCmdForTesting returns the cleanup command for testing purposes
func GetCleanupCmdForTesting() *cobra.Command {
	return getCleanupCmd()
}