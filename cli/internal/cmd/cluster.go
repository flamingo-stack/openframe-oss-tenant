package cmd

import (
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
			showLogo()
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

	// Create command flags
	createCmd := getCreateCmd()
	createCmd.Flags().StringVarP(&clusterType, "type", "t", "", "Cluster type (k3d, gke, eks)")
	createCmd.Flags().IntVarP(&nodeCount, "nodes", "n", 3, "Number of worker nodes (default 3)")
	createCmd.Flags().StringVarP(&k8sVersion, "version", "v", "", "Kubernetes version")
	createCmd.Flags().BoolVar(&skipWizard, "skip-wizard", false, "Skip interactive wizard")
	createCmd.Flags().BoolVar(&verbose, "verbose", false, "Verbose output")
	createCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Dry run mode")

	// Delete command flags
	deleteCmd := getDeleteCmd()
	deleteCmd.Flags().BoolVarP(&force, "force", "f", false, "Skip confirmation prompt")

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