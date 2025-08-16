package cluster

import (
	"context"

	"github.com/flamingo/openframe-cli/internal/cluster"
	clusterUtils "github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/flamingo/openframe-cli/internal/factory"
	"github.com/spf13/cobra"
)

var (
	// Global flags for cluster commands
	globalFlags clusterUtils.GlobalFlags
	
	// Command-specific flags
	createFlags clusterUtils.CreateFlags
	listFlags   clusterUtils.ListFlags
	statusFlags clusterUtils.StatusFlags
	deleteFlags clusterUtils.DeleteFlags
	startFlags  clusterUtils.StartFlags
	cleanupFlags clusterUtils.CleanupFlags
)

// GetClusterCmd returns the cluster command and its subcommands
func GetClusterCmd() *cobra.Command {
	clusterCmd := &cobra.Command{
		Use:     "cluster",
		Aliases: []string{"k"},
		Short:   "Manage Kubernetes clusters",
		Long: `Cluster Management - Create, manage, and clean up Kubernetes clusters

This command group provides cluster lifecycle management functionality:
  • create - Create a new cluster with interactive configuration
  • delete - Remove a cluster and clean up resources  
  • start - Start an existing stopped cluster
  • list - Show all managed clusters
  • status - Display detailed cluster information
  • cleanup - Remove unused images and resources

Supports K3d clusters for local development.

Examples:
  openframe cluster create
  openframe cluster delete  
  openframe cluster start`,
	}

	// Add subcommands
	clusterCmd.AddCommand(
		getCreateCmd(),
		getDeleteCmd(),
		getListCmd(),
		getStatusCmd(),
		getStartCmd(),
		getCleanupCmd(),
	)

	// Add global flags using centralized management
	flagManager := clusterUtils.NewFlagManager(&globalFlags)
	flagManager.AddGlobalFlags(clusterCmd)

	return clusterCmd
}


// ResetGlobalFlags resets global flag variables for testing
func ResetGlobalFlags() {
	globalFlags = clusterUtils.GlobalFlags{}
	createFlags = clusterUtils.CreateFlags{}
	listFlags = clusterUtils.ListFlags{}
	statusFlags = clusterUtils.StatusFlags{}
	deleteFlags = clusterUtils.DeleteFlags{}
	startFlags = clusterUtils.StartFlags{}
	cleanupFlags = clusterUtils.CleanupFlags{}
}

// createManager creates a cluster manager with context - common pattern across all commands
func createManager() (context.Context, *cluster.Manager) {
	ctx := context.Background()
	manager := factory.CreateDefaultClusterManager()
	return ctx, manager
}

// SetVerboseForTesting sets verbose flag for testing
func SetVerboseForTesting(v bool) {
	globalFlags.Verbose = v
}

// ResetTestState resets global state for clean tests
func ResetTestState() {
	ResetGlobalFlags()
}