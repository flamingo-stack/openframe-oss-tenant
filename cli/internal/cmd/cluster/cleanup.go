package cluster

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/factory"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

func getCleanupCmd() *cobra.Command {
	return getCleanupCmdImpl()
}

func GetCleanupCmdForTesting() *cobra.Command {
	return getCleanupCmdImpl()
}

func getCleanupCmdImpl() *cobra.Command {
	return &cobra.Command{
		Use:     "cleanup [NAME]",
		Aliases: []string{"c"},
		Short:   "Clean up unused cluster resources",
		Long: `Remove unused images and resources from cluster nodes.

This command cleans up Docker images and other resources that are no
longer needed, freeing up disk space. This is particularly useful for
development clusters that build many images.

Examples:
  # Cleanup default cluster
  openframe cluster cleanup

  # Cleanup specific cluster
  openframe cluster cleanup my-cluster`,
		Args: cobra.MaximumNArgs(1),
		RunE: runCleanupCluster,
	}
}

func runCleanupCluster(cmd *cobra.Command, args []string) error {
	common.ShowLogo()
	ctx := context.Background()
	manager := factory.CreateDefaultClusterManager()

	clusterName := uiCluster.GetClusterNameOrDefault(args, "openframe-dev")

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
	cmd := exec.CommandContext(ctx, "docker", "ps", "--format", "{{.Names}}", "--filter", fmt.Sprintf("name=k3d-%s", clusterName))
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to list cluster containers: %w", err)
	}

	nodeNames := strings.Split(strings.TrimSpace(string(output)), "\n")
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
		checkCmd := exec.CommandContext(ctx, "docker", "inspect", "--format", "{{.State.Status}}", nodeName)
		if output, err := checkCmd.Output(); err != nil {
			continue // Container doesn't exist, skip
		} else if !strings.Contains(string(output), "running") {
			continue // Container is not running, skip
		}

		pterm.Info.Printf("Cleaning up %s...\n", nodeName)

		cleanupCmd := exec.CommandContext(ctx, "docker", "exec", nodeName, "crictl", "rmi", "--prune")
		if err := cleanupCmd.Run(); err != nil {
			// Only show warning if verbose mode is on
			if verbose {
				pterm.Warning.Printf("Failed to cleanup %s: %v\n", nodeName, err)
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