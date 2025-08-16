package cluster

import (
	"fmt"
	"os/exec"

	clusterUtils "github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/flamingo/openframe-cli/internal/common"
	uiCommon "github.com/flamingo/openframe-cli/internal/ui/common"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

func getStartCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start [NAME]",
		Short: "Start a stopped Kubernetes cluster",
		Long: `Start a previously stopped Kubernetes cluster.

Restarts cluster nodes and restores cluster to running state.
Supports interactive selection and direct cluster specification.

Examples:
  openframe cluster start my-cluster
  openframe cluster start  # interactive selection
  openframe cluster start my-cluster --verbose`,
		Args: cobra.MaximumNArgs(1),
		RunE: runStartCluster,
	}
}

func runStartCluster(cmd *cobra.Command, args []string) error {
	// Show OpenFrame logo
	uiCommon.ShowLogo()

	ctx, manager := createManager()

	clusterName, err := uiCluster.HandleClusterSelection(ctx, manager, args, "Select a cluster to start:")
	if err != nil {
		return fmt.Errorf("failed to select cluster: %w", err)
	}
	if clusterName == "" {
		pterm.Info.Println("No cluster selected. Operation cancelled.")
		return nil
	}

	// Detect cluster type
	clusterType, err := manager.DetectClusterType(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type for '%s': %w", clusterName, err)
	}

	// Start the cluster using k3d directly
	pterm.DefaultSection.Printf("Starting Cluster: %s", clusterName)
	
	spinner, _ := pterm.DefaultSpinner.Start("Starting cluster...")
	
	// Use k3d CLI to start the cluster
	startCmd := exec.CommandContext(ctx, "k3d", "cluster", "start", clusterName)
	if err := startCmd.Run(); err != nil {
		return common.HandleSpinnerError(spinner, "Failed to start cluster", err)
	}

	spinner.Success("Cluster started successfully")

	// Display success message
	message := clusterUtils.FormatClusterSuccessMessage(clusterName, clusterType, "Running")
	uiCluster.ShowSuccessBox("Cluster Started Successfully", message)

	return nil
}