package cluster

import (
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/spf13/cobra"
)

var (
	clusterName string
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

This command group provides cluster lifecycle management functionality
that replaces the shell script cluster operations:

  - create - Create a new cluster with interactive configuration
  - delete - Remove a cluster and clean up resources  
  - start - Start an existing stopped cluster
  - list - Show all managed clusters
  - status - Display detailed cluster information
  - cleanup - Remove unused images and resources

Supports multiple cluster types:
  - K3d - Lightweight Kubernetes in Docker (recommended for local development)
  - GKE - Google Kubernetes Engine (not yet available)

Examples:
  # Create cluster interactively (replaces: ./run.sh k)
  openframe cluster create

  # Delete cluster (replaces: ./run.sh d)  
  openframe cluster delete

  # Start cluster (replaces: ./run.sh s)
  openframe cluster start
`,
		Run: func(cmd *cobra.Command, args []string) {
			common.ShowLogo()
			cmd.Help()
		},
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
	clusterName = ""
	clusterType = ""
	nodeCount = 0
	k8sVersion = ""
	skipWizard = false
	verbose = false
	dryRun = false
	force = false
}

// Testing helper functions
func SetVerboseForTesting(v bool) {
	verbose = v
}