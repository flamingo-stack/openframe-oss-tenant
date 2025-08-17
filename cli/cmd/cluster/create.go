package cluster

import (
	"fmt"
	"io"
	"strings"

	"github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/cluster/utils"
	"github.com/spf13/cobra"
)

func getCreateCmd() *cobra.Command {
	// Ensure global flags are initialized
	utils.InitGlobalFlags()
	
	createCmd := &cobra.Command{
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
		PreRunE: func(cmd *cobra.Command, args []string) error {
			utils.SyncGlobalFlags()
			if err := utils.ValidateGlobalFlags(); err != nil {
				return err
			}
			globalFlags := utils.GetGlobalFlags()
			if globalFlags != nil && globalFlags.Create != nil {
				return domain.ValidateCreateFlags(globalFlags.Create)
			}
			return nil
		},
		RunE: utils.WrapCommandWithCommonSetup(runCreateCluster),
	}

	// Add create-specific flags
	globalFlags := utils.GetGlobalFlags()
	if globalFlags != nil && globalFlags.Create != nil {
		domain.AddCreateFlags(createCmd, globalFlags.Create)
	}
	
	return createCmd
}

func runCreateCluster(cmd *cobra.Command, args []string) error {
	service := utils.GetCommandService()
	
	// Build cluster config from command parameters
	clusterName := ""
	if len(args) > 0 {
		clusterName = strings.TrimSpace(args[0])
		// Validate the cluster name
		if err := domain.ValidateClusterName(clusterName); err != nil {
			return err
		}
	} else {
		clusterName = "openframe-dev" // default name
	}
	
	globalFlags := utils.GetGlobalFlags()
	
	// Handle node count validation - error if user explicitly set 0 or negative
	nodeCount := globalFlags.Create.NodeCount
	if cmd.Flags().Changed("nodes") && nodeCount <= 0 {
		return fmt.Errorf("node count must be at least 1: %d", nodeCount)
	}
	// Auto-correct to default if not explicitly set and invalid
	if nodeCount <= 0 {
		nodeCount = 3
	}
	
	config := domain.ClusterConfig{
		Name:       clusterName,
		Type:       domain.ClusterType(globalFlags.Create.ClusterType),
		K8sVersion: globalFlags.Create.K8sVersion,
		NodeCount:  nodeCount,
	}
	
	// Set defaults if needed
	if config.Type == "" {
		config.Type = domain.ClusterTypeK3d
	}
	
	// Show configuration summary for dry-run or skip-wizard modes
	if globalFlags.Create.DryRun || globalFlags.Create.SkipWizard || globalFlags.Global.Verbose {
		if err := showConfigurationSummary(config, globalFlags.Create.DryRun, globalFlags.Create.SkipWizard, cmd.OutOrStdout()); err != nil {
			return err
		}
		
		// If dry-run, don't actually create the cluster
		if globalFlags.Create.DryRun {
			return nil
		}
	}
	
	// Execute cluster creation through service layer
	return service.CreateCluster(config)
}

// showConfigurationSummary displays the cluster configuration summary
func showConfigurationSummary(config domain.ClusterConfig, dryRun bool, skipWizard bool, out io.Writer) error {
	fmt.Fprintf(out, "Configuration Summary:\n")
	fmt.Fprintf(out, "  Name: %s\n", config.Name)
	fmt.Fprintf(out, "  Type: %s\n", config.Type)
	fmt.Fprintf(out, "  Node Count: %d\n", config.NodeCount)
	
	if config.K8sVersion != "" {
		fmt.Fprintf(out, "  Kubernetes Version: %s\n", config.K8sVersion)
	}
	
	fmt.Fprintln(out)
	
	if dryRun {
		fmt.Fprintf(out, "DRY RUN MODE - No cluster will be created\n")
	} else if skipWizard {
		fmt.Fprintf(out, "Proceeding with cluster creation...\n")
	}
	
	return nil
}
