package cluster

import (
	"github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/cluster/utils"
	"github.com/spf13/cobra"
)

// GetClusterCmd returns the cluster command and its subcommands
func GetClusterCmd() *cobra.Command {
	// Initialize global flags
	utils.InitGlobalFlags()
	
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

	// Add subcommands - much simpler now
	clusterCmd.AddCommand(
		getCreateCmd(),
		getDeleteCmd(),
		getListCmd(),
		getStatusCmd(),
		getStartCmd(),
		getCleanupCmd(),
	)

	// Add global flags
	domain.AddGlobalFlags(clusterCmd, utils.GetGlobalFlags().Global)

	return clusterCmd
}

