package cmd

import (
	"context"
	"fmt"
	"os/exec"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

func getStartCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "start [NAME]",
		Aliases: []string{"s"},
		Short:   "Start a stopped cluster",
		Long: `Start a previously stopped cluster.

This command starts a cluster that was stopped with the stop command.
The cluster data and configuration are preserved.

Examples:
  # Start default cluster
  openframe cluster start

  # Start specific cluster  
  openframe cluster start my-cluster`,
		Args: cobra.MaximumNArgs(1),
		RunE: runStartCluster,
	}
}

func runStartCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	manager := createDefaultManager()

	clusterName := getClusterName(args)

	pterm.Info.Printf("Starting cluster '%s'...\n", clusterName)

	// Determine cluster type
	clusterType, err := manager.DetectClusterType(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	var startCmd *exec.Cmd
	switch clusterType {
	case cluster.ClusterTypeK3d:
		startCmd = exec.CommandContext(ctx, "k3d", "cluster", "start", clusterName)
	default:
		return fmt.Errorf("unsupported cluster type for start operation: %s", clusterType)
	}

	if err := startCmd.Run(); err != nil {
		return fmt.Errorf("failed to start cluster: %w", err)
	}

	pterm.Success.Printf("Cluster '%s' started successfully!\n", clusterName)
	return nil
}