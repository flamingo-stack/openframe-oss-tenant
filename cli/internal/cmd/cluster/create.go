package cluster

import (
	"context"
	"fmt"
	"io"

	"github.com/flamingo/openframe-cli/internal/cluster"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/internal/factory"
)

func getCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create [NAME]",
		Short: "Create a new Kubernetes cluster",
		Long: `Create a new Kubernetes cluster with default OpenFrame configuration.

Creates a local cluster for OpenFrame development. Existing clusters
with the same name will be recreated. Use bootstrap command to install
OpenFrame components after creation.

Examples:
  openframe cluster create
  openframe cluster create my-cluster
  openframe cluster create --nodes 3 --type k3d`,
		Args: cobra.MaximumNArgs(1),
		RunE: runCreateCluster,
	}

	// Add flags to the create command
	cmd.Flags().StringVarP(&clusterType, "type", "t", "", "Cluster type (k3d, gke, eks)")
	cmd.Flags().IntVarP(&nodeCount, "nodes", "n", 3, "Number of worker nodes (default 3)")
	cmd.Flags().StringVarP(&k8sVersion, "version", "v", "", "Kubernetes version")
	cmd.Flags().BoolVar(&skipWizard, "skip-wizard", false, "Skip interactive wizard")
	cmd.Flags().BoolVar(&dryRun, "dry-run", false, "Dry run mode")

	return cmd
}

func runCreateCluster(cmd *cobra.Command, args []string) error {
	common.ShowLogo()
	ctx := context.Background()

	var config cluster.ClusterConfig
	var err error

	if skipWizard {
		// Use provided flags to create configuration
		config = cluster.ClusterConfig{
			Name:       uiCluster.GetClusterNameOrDefault(args, "openframe-dev"),
			Type:       parseClusterType(clusterType),
			K8sVersion: k8sVersion,
			NodeCount:  getNodeCount(nodeCount),
		}
	} else {
		// Run interactive wizard
		wizard := uiCluster.NewConfigWizard()
		config, err = wizard.Run()
		if err != nil {
			return fmt.Errorf("wizard failed: %w", err)
		}
	}

	// Validate configuration
	if err := validateConfig(&config); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	// Show configuration summary
	if err := showConfigSummary(&config, dryRun, skipWizard, cmd.OutOrStdout()); err != nil {
		return err
	}

	// Create cluster manager
	manager := factory.CreateDefaultClusterManager()

	// Create the cluster
	if !dryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Creating %s cluster '%s'...\n", config.Type, config.Name)
		if err := manager.CreateCluster(ctx, config); err != nil {
			return fmt.Errorf("failed to create cluster: %w", err)
		}
	}

	if !dryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Cluster '%s' created successfully!\n", config.Name)
		fmt.Fprintf(cmd.OutOrStdout(), "\nNext steps:\n")
		fmt.Fprintf(cmd.OutOrStdout(), "  • Use 'openframe bootstrap' to install OpenFrame components\n")
		fmt.Fprintf(cmd.OutOrStdout(), "  • Check cluster status: openframe cluster status\n")
		fmt.Fprintf(cmd.OutOrStdout(), "  • Access cluster: kubectl get nodes\n")
	}

	return nil
}

func parseClusterType(typeStr string) cluster.ClusterType {
	switch typeStr {
	case "k3d":
		return cluster.ClusterTypeK3d
	// case "gke":
	// 	return cluster.ClusterTypeGKE
	default:
		return cluster.ClusterTypeK3d // Default
	}
}

func getNodeCount(nodeCount int) int {
	if nodeCount <= 0 {
		return 3 // Default to 3 nodes
	}
	return nodeCount
}

func validateConfig(config *cluster.ClusterConfig) error {
	if config.Name == "" {
		return fmt.Errorf("cluster name cannot be empty")
	}
	if config.NodeCount < 1 {
		config.NodeCount = 3 // Default to 3 nodes
	}
	return nil
}

func showConfigSummary(config *cluster.ClusterConfig, dryRun bool, skipWizard bool, out io.Writer) error {
	fmt.Fprintf(out, "\nConfiguration Summary:\n")
	fmt.Fprintf(out, "  Cluster Name: %s\n", config.Name)
	fmt.Fprintf(out, "  Cluster Type: %s\n", config.Type)
	fmt.Fprintf(out, "  Kubernetes Version: %s\n", config.K8sVersion)
	fmt.Fprintf(out, "  Node Count: %d\n", config.NodeCount)

	// Skip confirmation in dry-run mode or when wizard is skipped
	if dryRun {
		fmt.Fprintf(out, "\nDRY RUN MODE - No actual changes will be made\n")
		return nil
	}

	if skipWizard {
		fmt.Fprintf(out, "\nProceeding with cluster creation...\n")
		return nil
	}

	return nil
}