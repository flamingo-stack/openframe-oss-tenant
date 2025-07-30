package cmd

import (
	"context"
	"fmt"
	"io"

	"github.com/flamingo/openframe-cli/internal/cluster"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	uiCommon "github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
)

func getCreateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "create [NAME]",
		Short: "Create a new Kubernetes cluster",
		Long: `Create a new Kubernetes cluster with default OpenFrame configuration.

This command creates a local Kubernetes cluster suitable for OpenFrame development.
If a cluster with the same name already exists, it will be deleted and recreated.
The cluster is created with sensible defaults and does not install OpenFrame components.
Use the bootstrap command to create a cluster and install OpenFrame components.

Examples:
  # Create cluster with default name (openframe-dev)
  openframe cluster create

  # Create cluster with custom name
  openframe cluster create my-cluster

  # Create with specific options
  openframe cluster create my-cluster --type k3d --nodes 3

  # Create minimal cluster
  openframe cluster create --nodes 1`,
		Args: cobra.MaximumNArgs(1),
		RunE: runCreateCluster,
	}
}

func runCreateCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	var config *uiCluster.ClusterConfiguration
	var err error

	if skipWizard {
		// Use provided flags to create configuration
		config = &uiCluster.ClusterConfiguration{
			Name:              getClusterName(args),
			Type:              parseClusterType(clusterType),
			KubernetesVersion: k8sVersion,
			NodeCount:         getNodeCount(nodeCount),
		}
	} else {
		// Run interactive wizard
		fmt.Println("Welcome to OpenFrame Cluster Creation Wizard")
		fmt.Println("This wizard will guide you through creating a Kubernetes cluster.")
		fmt.Println()

		config, err = uiCluster.ClusterWizard()
		if err != nil {
			return fmt.Errorf("wizard failed: %w", err)
		}
	}

	// Validate configuration
	if err := validateConfig(config); err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	// Show configuration summary
	if err := showConfigSummary(config, dryRun, skipWizard, cmd.OutOrStdout()); err != nil {
		return err
	}

	// Create cluster manager and get provider
	manager := createDefaultManager()
	provider, err := manager.GetProvider(config.Type)
	if err != nil {
		return err
	}

	// Check if provider is available (skip in dry-run mode)
	if !dryRun {
		if err := provider.IsAvailable(); err != nil {
			return fmt.Errorf("cluster provider not available: %w", err)
		}
	}

	// Create cluster configuration
	clusterConfig := &cluster.ClusterConfig{
		Name:              config.Name,
		Type:              config.Type,
		KubernetesVersion: config.KubernetesVersion,
		NodeCount:         config.NodeCount,
	}

	// Create the cluster
	if !dryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Creating %s cluster '%s'...\n", config.Type, config.Name)
	}
	if err := provider.Create(ctx, clusterConfig); err != nil {
		return fmt.Errorf("failed to create cluster: %w", err)
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

func getClusterName(args []string) string {
	if len(args) > 0 {
		return args[0]
	}
	return "openframe-dev"
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
	if nodeCount == 0 {
		return 3 // Default to 3 nodes
	}
	return nodeCount
}

func validateConfig(config *uiCluster.ClusterConfiguration) error {
	if config.Name == "" {
		return fmt.Errorf("cluster name cannot be empty")
	}
	if config.NodeCount < 1 {
		config.NodeCount = 3 // Default to 3 nodes
	}
	return nil
}

func showConfigSummary(config *uiCluster.ClusterConfiguration, dryRun bool, skipWizard bool, out io.Writer) error {
	fmt.Fprintf(out, "\nConfiguration Summary:\n")
	fmt.Fprintf(out, "  Cluster Name: %s\n", config.Name)
	fmt.Fprintf(out, "  Cluster Type: %s\n", config.Type)
	fmt.Fprintf(out, "  Kubernetes Version: %s\n", config.KubernetesVersion)
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

	confirmed, err := uiCommon.ConfirmAction("Proceed with cluster creation?")
	if err != nil {
		return err
	}
	if !confirmed {
		return fmt.Errorf("cluster creation cancelled")
	}
	return nil
}