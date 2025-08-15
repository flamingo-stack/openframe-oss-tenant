package cluster

import (
	"github.com/spf13/cobra"
)

var (
	// Shared flags used across multiple commands
	clusterType string
	nodeCount   int
	k8sVersion  string
	skipWizard  bool
	verbose     bool
	dryRun      bool
	force       bool
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

	// Global flags
	clusterCmd.PersistentFlags().BoolVar(&verbose, "verbose", false, "Verbose output")

	return clusterCmd
}


// ResetGlobalFlags resets global flag variables for testing
func ResetGlobalFlags() {
	clusterType = ""
	nodeCount = 0
	k8sVersion = ""
	skipWizard = false
	verbose = false
	dryRun = false
	force = false
}

// SetVerboseForTesting sets verbose flag for testing
func SetVerboseForTesting(v bool) {
	verbose = v
}