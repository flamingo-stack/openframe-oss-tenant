package cluster

import (
	"fmt"
	"io"

	"github.com/flamingo/openframe-cli/internal/cluster"
	clusterUtils "github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/flamingo/openframe-cli/internal/common"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	uiCommon "github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
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

	// Add flags to the create command using centralized management
	clusterUtils.AddCreateFlags(cmd, &createFlags)

	return cmd
}

func runCreateCluster(cmd *cobra.Command, args []string) error {
	uiCommon.ShowLogo()

	var config cluster.ClusterConfig
	var err error

	if createFlags.SkipWizard {
		// Use provided flags to create configuration
		config = cluster.ClusterConfig{
			Name:       uiCluster.GetClusterNameOrDefault(args, "openframe-dev"),
			Type:       cluster.ParseClusterType(createFlags.ClusterType),
			K8sVersion: createFlags.K8sVersion,
			NodeCount:  cluster.GetNodeCount(createFlags.NodeCount),
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
	if err := cluster.ValidateClusterName(config.Name); err != nil {
		validationErr := common.CreateValidationError("cluster name", config.Name, err.Error())
		return validationErr
	}
	if config.NodeCount < 1 {
		config.NodeCount = 3 // Default to 3 nodes
	}

	// Show configuration summary
	if err := showConfigSummary(&config, createFlags.DryRun, createFlags.SkipWizard, cmd.OutOrStdout()); err != nil {
		return err
	}

	// Create cluster manager
	ctx, manager := createManager()

	// Create the cluster
	if !createFlags.DryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Creating %s cluster '%s'...\n", config.Type, config.Name)
		if err := manager.CreateCluster(ctx, config); err != nil {
			return clusterUtils.CreateClusterError("create", config.Name, config.Type, err)
		}
	}

	if !createFlags.DryRun {
		fmt.Fprintf(cmd.OutOrStdout(), "Cluster '%s' created successfully!\n", config.Name)
		uiCluster.ShowClusterCreationNextSteps(config.Name)
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