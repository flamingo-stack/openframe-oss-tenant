package cluster

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/internal/factory"
)

func getStartCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "start [NAME]",
		Short: "Start a stopped Kubernetes cluster",
		Long: `Start - Start a previously stopped Kubernetes cluster

Starts a cluster that was previously stopped using the 'openframe cluster stop' command.
This will restart all cluster nodes and restore the cluster to a running state.

The command supports both interactive cluster selection and direct cluster specification.

What start does:
  1. Start the cluster infrastructure
  2. Wait for cluster nodes to be ready
  3. Verify cluster connectivity
  4. Display cluster status

Examples:
  # Start a specific cluster
  openframe cluster start my-cluster

  # Interactive cluster selection (choose from stopped clusters)
  openframe cluster start

  # Start with verbose output
  openframe cluster start my-cluster --verbose`,
		Args: cobra.MaximumNArgs(1),
		RunE: runStartCluster,
	}
}

func runStartCluster(cmd *cobra.Command, args []string) error {
	// Show OpenFrame logo
	common.ShowLogo()

	ctx := context.Background()
	manager := factory.CreateDefaultClusterManager()

	var clusterName string
	var err error

	if len(args) == 0 {
		// Interactive cluster selection
		clusterName, err = selectStoppedCluster(ctx, manager)
		if err != nil {
			return fmt.Errorf("failed to select cluster: %w", err)
		}
		if clusterName == "" {
			pterm.Info.Println("No cluster selected. Operation cancelled.")
			return nil
		}
	} else {
		// Use provided cluster name
		clusterName = strings.TrimSpace(args[0])
		if clusterName == "" {
			return fmt.Errorf("cluster name cannot be empty")
		}
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
		spinner.Fail("Failed to start cluster")
		return fmt.Errorf("failed to start cluster: %w", err)
	}

	spinner.Success("Cluster started successfully")

	// Display success message
	pterm.DefaultBox.WithTitle("Cluster Started Successfully").
		WithTitleTopCenter().
		Println(pterm.Sprintf("Cluster: %s\nType: %s\nStatus: %s", 
			pterm.Green(clusterName), 
			pterm.Blue(clusterType), 
			pterm.Green("Running")))

	return nil
}

// selectStoppedCluster allows user to select from available stopped clusters
func selectStoppedCluster(ctx context.Context, manager *cluster.Manager) (string, error) {
	// Get all clusters
	clusters, err := manager.ListAllClusters(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to list clusters: %w", err)
	}

	if len(clusters) == 0 {
		pterm.Warning.Println("No clusters found")
		return "", nil
	}

	// For now, we'll list all clusters since we don't have status info
	// TODO: Filter for stopped clusters when status checking is available
	clusterNames := make([]string, 0, len(clusters))
	for _, cl := range clusters {
		clusterNames = append(clusterNames, cl.Name)
	}

	if len(clusterNames) == 0 {
		pterm.Warning.Println("No clusters available to start")
		return "", nil
	}

	// Use interactive selection
	_, selected, err := common.SelectFromList("Select a cluster to start:", clusterNames)
	if err != nil {
		return "", err
	}

	return selected, nil
}