package cluster

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/spf13/cobra"
)

func getCreateCmd() *cobra.Command {
	// Ensure global flags are initialized
	utils.InitGlobalFlags()

	createCmd := &cobra.Command{
		Use:   "create [NAME]",
		Short: "Create a new Kubernetes cluster",
		Long: `Create a new Kubernetes cluster with quick defaults or interactive configuration.

By default, shows a selection menu where you can choose:
1. Quick start with defaults (press Enter) - creates cluster with default settings
2. Interactive configuration wizard - step-by-step cluster customization

Creates a local cluster for OpenFrame development. Existing clusters
with the same name will be recreated. Use bootstrap command to install
OpenFrame components after creation.

Examples:
  openframe cluster create                    # Show creation mode selection
  openframe cluster create my-cluster        # Show selection with custom name
  openframe cluster create --skip-wizard     # Direct creation with defaults
  openframe cluster create --nodes 3 --type k3d --skip-wizard`,
		Args: cobra.MaximumNArgs(1),
		PreRunE: func(cmd *cobra.Command, args []string) error {
			utils.SyncGlobalFlags()
			if err := utils.ValidateGlobalFlags(); err != nil {
				return err
			}
			globalFlags := utils.GetGlobalFlags()
			if globalFlags != nil && globalFlags.Create != nil {
				return models.ValidateCreateFlags(globalFlags.Create)
			}
			return nil
		},
		RunE: utils.WrapCommandWithCommonSetup(runCreateCluster),
	}

	// Add create-specific flags
	globalFlags := utils.GetGlobalFlags()
	if globalFlags != nil && globalFlags.Create != nil {
		models.AddCreateFlags(createCmd, globalFlags.Create)
	}

	return createCmd
}

func runCreateCluster(cmd *cobra.Command, args []string) error {
	service := utils.GetCommandService()
	globalFlags := utils.GetGlobalFlags()

	var config models.ClusterConfig

	// Check if we should use interactive mode
	if !globalFlags.Create.SkipWizard {
		// Use UI layer to handle cluster configuration
		configHandler := ui.NewConfigurationHandler()

		// Get cluster name from args if provided
		var clusterName string
		if len(args) > 0 {
			clusterName = strings.TrimSpace(args[0])
			if err := models.ValidateClusterName(clusterName); err != nil {
				return err
			}
		}

		// Let UI handle the entire configuration flow
		var err error
		config, err = configHandler.GetClusterConfig(clusterName)
		if err != nil {
			return err
		}
	} else {
		// Non-interactive mode - build config from flags and args
		clusterName := ""
		if len(args) > 0 {
			clusterName = strings.TrimSpace(args[0])
			// Validate the cluster name
			if err := models.ValidateClusterName(clusterName); err != nil {
				return err
			}
		} else {
			clusterName = "openframe-dev" // default name
		}

		// Handle node count validation - error if user explicitly set 0 or negative
		nodeCount := globalFlags.Create.NodeCount
		if cmd.Flags().Changed("nodes") && nodeCount <= 0 {
			return fmt.Errorf("node count must be at least 1: %d", nodeCount)
		}
		// Auto-correct to default if not explicitly set and invalid
		if nodeCount <= 0 {
			nodeCount = 3
		}

		config = models.ClusterConfig{
			Name:       clusterName,
			Type:       models.ClusterType(globalFlags.Create.ClusterType),
			K8sVersion: globalFlags.Create.K8sVersion,
			NodeCount:  nodeCount,
		}

		// Set defaults if needed
		if config.Type == "" {
			config.Type = models.ClusterTypeK3d
		}
	}

	// Show configuration summary for dry-run or skip-wizard modes
	if globalFlags.Create.DryRun || globalFlags.Create.SkipWizard || globalFlags.Global.Verbose {
		operationsUI := ui.NewOperationsUI()
		operationsUI.ShowConfigurationSummary(config, globalFlags.Create.DryRun, globalFlags.Create.SkipWizard)

		// If dry-run, don't actually create the cluster
		if globalFlags.Create.DryRun {
			return nil
		}
	}

	// Execute cluster creation through service layer
	return service.CreateCluster(config)
}
