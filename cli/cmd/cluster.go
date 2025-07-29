package cmd

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/flamingo/openframe-cli/pkg/cluster"
	"github.com/flamingo/openframe-cli/pkg/ui"
	"github.com/pterm/pterm"
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

// clusterCmd represents the cluster command
var clusterCmd = &cobra.Command{
	Use:     "cluster",
	Aliases: []string{"k"},
	Short:   "Manage Kubernetes clusters",
	Long: `Cluster Management - Create, manage, and clean up Kubernetes clusters

This command group provides cluster lifecycle management functionality
that replaces the shell script cluster operations:

  - create/up - Create a new cluster with interactive configuration
  - delete/down - Remove a cluster and clean up resources  
  - start - Start an existing stopped cluster
  - list - Show all managed clusters
  - status - Display detailed cluster information
  - cleanup - Remove unused images and resources

Supports multiple cluster types:
  - K3d - Lightweight Kubernetes in Docker (recommended for local development)
  - GKE - Google Kubernetes Engine (cloud)
  - EKS - Amazon Elastic Kubernetes Service (cloud)

Examples:
  # Create cluster interactively (replaces: ./run.sh k)
  openframe cluster create

  # Delete cluster (replaces: ./run.sh d)  
  openframe cluster delete

  # Start cluster (replaces: ./run.sh s)
  openframe cluster start

`,
}

// createCmd represents the cluster create command
var createCmd = &cobra.Command{
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

// deleteCmd represents the cluster delete command
var deleteCmd = &cobra.Command{
	Use:   "delete [NAME]",
	Short: "Delete a Kubernetes cluster",
	Long: `Delete a Kubernetes cluster and clean up all associated resources.

This command will:
  1. Stop any running Telepresence intercepts
  2. Delete the Kubernetes cluster
  3. Clean up Docker networks and containers
  4. Remove cluster-specific configuration

Examples:
  # Delete specific cluster
  openframe cluster delete my-cluster

  # Interactive cluster selection
  openframe cluster delete`,
	Args: cobra.MaximumNArgs(1),
	RunE: runDeleteCluster,
}

// listCmd represents the cluster list command
var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List all managed clusters",
	Long: `List all Kubernetes clusters managed by OpenFrame CLI.

Displays cluster information including:
  • Cluster name and type
  • Current status
  • Node count and versions
  • Created date`,
	RunE: runListClusters,
}

// statusCmd represents the cluster status command
var statusCmd = &cobra.Command{
	Use:   "status [NAME]",
	Short: "Show cluster status and information",
	Long: `Show detailed status information for a specific cluster.

Displays:
  • Cluster health and node status
  • Installed Helm charts
  • ArgoCD application status
  • Resource usage
  • Connectivity information`,
	Args: cobra.MaximumNArgs(1),
	RunE: runClusterStatus,
}

// startCmd represents the cluster start command
var startCmd = &cobra.Command{
	Use:     "start [NAME]",
	Aliases: []string{"s"},
	Short:   "Start a stopped cluster",
	Long: `Start a previously stopped cluster.

This command starts a cluster that was stopped with the stop command.
The cluster data and configuration are preserved.

Examples:
  # Start default cluster
  openframe cluster start

  # Start specific cluster  
  openframe cluster start my-cluster`,
	Args: cobra.MaximumNArgs(1),
	RunE: runStartCluster,
}

// cleanupCmd represents the cluster cleanup command
var cleanupCmd = &cobra.Command{
	Use:     "cleanup [NAME]",
	Aliases: []string{"c"},
	Short:   "Clean up unused cluster resources",
	Long: `Remove unused images and resources from cluster nodes.

This command cleans up Docker images and other resources that are no
longer needed, freeing up disk space. This is particularly useful for
development clusters that build many images.

Examples:
  # Cleanup default cluster
  openframe cluster cleanup

  # Cleanup specific cluster
  openframe cluster cleanup my-cluster`,
	Args: cobra.MaximumNArgs(1),
	RunE: runCleanupCluster,
}

func init() {
	rootCmd.AddCommand(clusterCmd)
	clusterCmd.AddCommand(createCmd, deleteCmd, listCmd, statusCmd, startCmd, cleanupCmd)

	// Create command flags
	createCmd.Flags().StringVarP(&clusterType, "type", "t", "", "Cluster type (k3d, gke, eks)")
	createCmd.Flags().IntVarP(&nodeCount, "nodes", "n", 3, "Number of worker nodes (default 3)")
	createCmd.Flags().StringVarP(&k8sVersion, "version", "v", "", "Kubernetes version")
	createCmd.Flags().BoolVar(&skipWizard, "skip-wizard", false, "Skip interactive wizard")
	createCmd.Flags().BoolVar(&verbose, "verbose", false, "Verbose output")
	createCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Dry run mode")

	// Delete command flags
	deleteCmd.Flags().BoolVarP(&force, "force", "f", false, "Skip confirmation prompt")

	// Global flags
	clusterCmd.PersistentFlags().BoolVar(&verbose, "verbose", false, "Verbose output")
}

// GetClusterCmd returns the cluster command for testing purposes
func GetClusterCmd() *cobra.Command {
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

func runCreateCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	var config *ui.ClusterConfiguration
	var err error

	if skipWizard {
		// Use provided flags to create configuration
		config = &ui.ClusterConfiguration{
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

		config, err = ui.ClusterWizard()
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

	// Create cluster provider
	provider, err := createClusterProvider(config.Type, verbose || globalVerbose, cmd.OutOrStdout())
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

func runDeleteCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	var clusterName string
	if len(args) > 0 {
		clusterName = args[0]
	} else {
		// Interactive cluster selection
		clusters, err := listAllClusters(ctx)
		if err != nil {
			return fmt.Errorf("failed to list clusters: %w", err)
		}

		if len(clusters) == 0 {
			fmt.Println("No clusters found.")
			return nil
		}

		var clusterNames []string
		for _, cluster := range clusters {
			clusterNames = append(clusterNames, cluster.Name)
		}

		_, selected, err := ui.SelectFromList("Select cluster to delete", clusterNames)
		if err != nil {
			return fmt.Errorf("failed to select cluster: %w", err)
		}
		clusterName = selected
	}

	// Confirm deletion (unless forced)
	if !force {
		confirmed, err := ui.ConfirmAction(fmt.Sprintf("Are you sure you want to delete cluster '%s'? This action cannot be undone", clusterName))
		if err != nil {
			return err
		}
		if !confirmed {
			fmt.Println("Deletion cancelled.")
			return nil
		}
	}

	// Determine cluster type and create provider
	clusterType, err := detectClusterType(clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	provider, err := createClusterProvider(clusterType, false, os.Stdout)
	if err != nil {
		return err
	}

	// Delete the cluster
	fmt.Fprintf(cmd.OutOrStdout(), "Deleting cluster '%s'...\n", clusterName)
	if err := provider.Delete(ctx, clusterName); err != nil {
		return fmt.Errorf("failed to delete cluster: %w", err)
	}

	fmt.Fprintf(cmd.OutOrStdout(), "Cluster '%s' deleted successfully!\n", clusterName)
	return nil
}

func runListClusters(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	clusters, err := listAllClusters(ctx)
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	if len(clusters) == 0 {
		fmt.Println("No clusters found.")
		return nil
	}

	fmt.Printf("%-20s %-10s %-10s %-15s\n", "NAME", "TYPE", "STATUS", "NODES")
	fmt.Println("────────────────────────────────────────────────────────────")

	for _, cluster := range clusters {
		fmt.Printf("%-20s %-10s %-10s %-15d\n",
			cluster.Name,
			cluster.Type,
			cluster.Status,
			len(cluster.Nodes))
	}

	return nil
}

func runStartCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	clusterName := getClusterName(args)

	pterm.Info.Printf("Starting cluster '%s'...\n", clusterName)

	// Determine cluster type
	clusterType, err := detectClusterType(clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	var startCmd *exec.Cmd
	switch clusterType {
	case cluster.ClusterTypeK3d:
		startCmd = exec.CommandContext(ctx, "k3d", "cluster", "start", clusterName)
	default:
		return fmt.Errorf("unsupported cluster type for start operation: %s", clusterType)
	}

	if err := startCmd.Run(); err != nil {
		return fmt.Errorf("failed to start cluster: %w", err)
	}

	pterm.Success.Printf("Cluster '%s' started successfully!\n", clusterName)
	return nil
}

func runCleanupCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	clusterName := getClusterName(args)

	pterm.Info.Printf("Cleaning up cluster '%s' resources...\n", clusterName)

	// Determine cluster type
	clusterType, err := detectClusterType(clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	switch clusterType {
	case cluster.ClusterTypeK3d:
		return cleanupK3dCluster(ctx, clusterName)
	default:
		return fmt.Errorf("cleanup not supported for cluster type: %s", clusterType)
	}
}

func cleanupK3dCluster(ctx context.Context, clusterName string) error {
	// Get actual cluster nodes instead of hardcoded names
	cmd := exec.CommandContext(ctx, "docker", "ps", "--format", "{{.Names}}", "--filter", fmt.Sprintf("name=k3d-%s", clusterName))
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to list cluster containers: %w", err)
	}

	nodeNames := strings.Split(strings.TrimSpace(string(output)), "\n")
	if len(nodeNames) == 1 && nodeNames[0] == "" {
		pterm.Info.Println("No cluster nodes found to cleanup")
		return nil
	}

	cleanedCount := 0
	for _, nodeName := range nodeNames {
		if nodeName == "" {
			continue
		}

		// Check if container exists and is running
		checkCmd := exec.CommandContext(ctx, "docker", "inspect", "--format", "{{.State.Status}}", nodeName)
		if output, err := checkCmd.Output(); err != nil {
			continue // Container doesn't exist, skip
		} else if !strings.Contains(string(output), "running") {
			continue // Container is not running, skip
		}

		pterm.Info.Printf("Cleaning up %s...\n", nodeName)

		cleanupCmd := exec.CommandContext(ctx, "docker", "exec", nodeName, "crictl", "rmi", "--prune")
		if err := cleanupCmd.Run(); err != nil {
			// Only show warning if verbose mode is on
			if verbose {
				pterm.Warning.Printf("Failed to cleanup %s: %v\n", nodeName, err)
			}
		} else {
			cleanedCount++
		}
	}

	if cleanedCount > 0 {
		pterm.Success.Printf("Cleaned up %d cluster nodes\n", cleanedCount)
	} else {
		pterm.Info.Println("No nodes were cleaned up")
	}

	return nil
}

func runClusterStatus(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	out := cmd.OutOrStdout()

	clusterName := getClusterName(args)

	fmt.Fprintf(out, "\n# Cluster Status: %s\n\n", clusterName)

	// Determine cluster type
	clusterType, err := detectClusterType(clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	// Create provider and get status
	provider, err := createClusterProvider(clusterType, false, out)
	if err != nil {
		return err
	}

	status, err := provider.Status(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to get cluster status: %w", err)
	}

	// Display status information in table format
	fmt.Fprintf(out, "Property | Value\n")
	fmt.Fprintf(out, "Name     | %s\n", status.Name)
	fmt.Fprintf(out, "Type     | %s\n", string(status.Type))
	fmt.Fprintf(out, "Status   | %s\n", status.Status)
	fmt.Fprintf(out, "Nodes    | %d\n", len(status.Nodes))

	// Show node details
	if len(status.Nodes) > 0 {
		fmt.Fprintf(out, "\n INFO  \n")
		fmt.Fprintf(out, "       Node Details:\n")
		fmt.Fprintf(out, "Name                                 | Role   | Status                               | Age\n")

		for _, node := range status.Nodes {
			fmt.Fprintf(out, "%-36s | %-6s | %-36s | %s\n",
				node.Name,
				node.Role,
				node.Status,
				node.Age,
			)
		}
	}

	// Check for running applications
	fmt.Fprintf(out, "\n INFO  \n")
	fmt.Fprintf(out, "       Installed Applications:\n")
	if err := showInstalledApps(ctx, out); err != nil {
		fmt.Fprintf(out, " WARNING  Failed to get installed applications: %v\n", err)
	}

	return nil
}

func showInstalledApps(ctx context.Context, out io.Writer) error {
	// Check for Helm releases
	cmd := exec.CommandContext(ctx, "helm", "list", "--all-namespaces", "--output", "table")
	output, err := cmd.Output()
	if err != nil {
		return err
	}

	if strings.TrimSpace(string(output)) == "" {
		fmt.Fprintf(out, "No Helm releases found\n")
		return nil
	}

	fmt.Fprintf(out, "%s", string(output))
	return nil
}

// Helper functions

func getDefaultClusterName() string {
	return "openframe-dev"
}

func getNodeCount(nodeCount int) int {
	if nodeCount == 0 {
		return 3 // Default to 3 nodes
	}
	return nodeCount
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

func validateConfig(config *ui.ClusterConfiguration) error {
	if config.Name == "" {
		return fmt.Errorf("cluster name cannot be empty")
	}
	if config.NodeCount < 1 {
		config.NodeCount = 3 // Default to 3 nodes
	}
	return nil
}

func showConfigSummary(config *ui.ClusterConfiguration, dryRun bool, skipWizard bool, out io.Writer) error {
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

	confirmed, err := ui.ConfirmAction("Proceed with cluster creation?")
	if err != nil {
		return err
	}
	if !confirmed {
		return fmt.Errorf("cluster creation cancelled")
	}
	return nil
}

func createClusterProvider(clusterType cluster.ClusterType, verbose bool, output io.Writer) (cluster.ClusterProvider, error) {
	opts := cluster.ProviderOptions{
		Verbose: verbose,
		DryRun:  dryRun,
		Output:  output,
	}

	switch clusterType {
	case cluster.ClusterTypeK3d:
		return cluster.NewK3dProvider(opts), nil
	default:
		return nil, fmt.Errorf("unsupported cluster type: %s", clusterType)
	}
}

func findRepoRoot() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Look for repository root indicators
	for {
		if _, err := os.Stat(filepath.Join(cwd, ".git")); err == nil {
			return cwd, nil
		}
		if _, err := os.Stat(filepath.Join(cwd, "manifests")); err == nil {
			return cwd, nil
		}

		parent := filepath.Dir(cwd)
		if parent == cwd {
			break
		}
		cwd = parent
	}

	return "", fmt.Errorf("repository root not found")
}

func listAllClusters(ctx context.Context) ([]*cluster.ClusterInfo, error) {
	var allClusters []*cluster.ClusterInfo

	// Check K3d clusters
	if k3dProvider := cluster.NewK3dProvider(cluster.ProviderOptions{}); k3dProvider.IsAvailable() == nil {
		if clusters, err := k3dProvider.List(ctx); err == nil {
			allClusters = append(allClusters, clusters...)
		}
	}

	return allClusters, nil
}

func detectClusterType(name string) (cluster.ClusterType, error) {
	ctx := context.Background()

	// Check K3d first
	k3dProvider := cluster.NewK3dProvider(cluster.ProviderOptions{})
	if k3dProvider.IsAvailable() == nil {
		if clusters, err := k3dProvider.List(ctx); err == nil {
			for _, c := range clusters {
				if c.Name == name {
					return cluster.ClusterTypeK3d, nil
				}
			}
		}
	}

	return "", fmt.Errorf("cluster '%s' not found", name)
}
