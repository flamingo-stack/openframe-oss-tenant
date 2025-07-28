package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/flamingo/openframe-cli/pkg/cluster"
	"github.com/flamingo/openframe-cli/pkg/helm"
	"github.com/flamingo/openframe-cli/pkg/ui"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

var (
	clusterName   string
	clusterType   string
	nodeCount     int
	k8sVersion    string
	skipWizard    bool
	installCharts bool
	valuesFile    string
	verbose       bool
	dryRun        bool
)

// clusterCmd represents the cluster command
var clusterCmd = &cobra.Command{
	Use:     "cluster",
	Aliases: []string{"k"},
	Short:   "🎯 Manage Kubernetes clusters",
	Long: `🎯 Cluster Management - Create, manage, and clean up Kubernetes clusters

This command group provides cluster lifecycle management functionality
that replaces the shell script cluster operations:

  • create/up - Create a new cluster with interactive configuration
  • delete/down - Remove a cluster and clean up resources  
  • start - Start an existing stopped cluster
  • list - Show all managed clusters
  • status - Display detailed cluster information
  • cleanup - Remove unused images and resources

Supports multiple cluster types:
  🚀 K3d - Lightweight Kubernetes in Docker (recommended for local development)
  🔧 Kind - Kubernetes in Docker (alternative local option)
  ☁️  GKE - Google Kubernetes Engine (cloud)
  📡 EKS - Amazon Elastic Kubernetes Service (cloud)

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
	Short: "Create a new Kubernetes cluster with OpenFrame",
	Long: `Create a new Kubernetes cluster and optionally install OpenFrame components.

This command provides an interactive wizard that guides you through:
  1. Cluster configuration (type, version, node count)
  2. Component selection (API, UI, monitoring, external tools)
  3. Deployment mode (development, production-like, minimal)

The wizard creates the cluster and installs the selected components using
Helm charts and ArgoCD for GitOps deployment.

Examples:
  # Interactive wizard (recommended)
  openframe cluster create

  # Create with specific options
  openframe cluster create my-cluster --type k3d --nodes 3

  # Create cluster only (no OpenFrame installation)
  openframe cluster create my-cluster --skip-charts`,
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
	createCmd.Flags().StringVarP(&clusterType, "type", "t", "", "Cluster type (k3d, kind, gke, eks)")
	createCmd.Flags().IntVarP(&nodeCount, "nodes", "n", 0, "Number of worker nodes")
	createCmd.Flags().StringVarP(&k8sVersion, "version", "v", "", "Kubernetes version")
	createCmd.Flags().BoolVar(&skipWizard, "skip-wizard", false, "Skip interactive wizard")
	createCmd.Flags().BoolVar(&installCharts, "install-charts", true, "Install OpenFrame Helm charts")
	createCmd.Flags().StringVarP(&valuesFile, "values", "f", "", "Helm values file")
	createCmd.Flags().BoolVar(&verbose, "verbose", false, "Verbose output")
	createCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Dry run mode")

	// Global flags
	clusterCmd.PersistentFlags().BoolVar(&verbose, "verbose", false, "Verbose output")
}

func runCreateCluster(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Get repository root
	repoPath, err := findRepoRoot()
	if err != nil {
		return fmt.Errorf("failed to find repository root: %w", err)
	}

	var config *ui.ClusterConfiguration

	if skipWizard {
		// Use provided flags to create configuration
		config = &ui.ClusterConfiguration{
			Name:              getClusterName(args),
			Type:              parseClusterType(clusterType),
			KubernetesVersion: k8sVersion,
			NodeCount:         nodeCount,
			EnableComponents:  getDefaultComponents(),
		}
	} else {
		// Run interactive wizard
		fmt.Println("🚀 Welcome to OpenFrame Cluster Creation Wizard")
		fmt.Println("This wizard will guide you through creating a Kubernetes cluster and installing OpenFrame.")
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
	if err := showConfigSummary(config); err != nil {
		return err
	}

	// Create cluster provider
	provider, err := createClusterProvider(config.Type)
	if err != nil {
		return err
	}

	// Check if provider is available
	if err := provider.IsAvailable(); err != nil {
		return fmt.Errorf("cluster provider not available: %w", err)
	}

	// Create cluster configuration
	clusterConfig := &cluster.ClusterConfig{
		Name:              config.Name,
		Type:              config.Type,
		KubernetesVersion: config.KubernetesVersion,
		NodeCount:         config.NodeCount,
	}

	// Create the cluster
	fmt.Printf("📦 Creating %s cluster '%s'...\n", config.Type, config.Name)
	if err := provider.Create(ctx, clusterConfig); err != nil {
		return fmt.Errorf("failed to create cluster: %w", err)
	}

	fmt.Printf("✅ Cluster '%s' created successfully!\n", config.Name)

	// Install Helm charts if requested
	if installCharts && hasChartsToInstall(config) {
		fmt.Println("\n📋 Installing OpenFrame components...")

		kubeContext := fmt.Sprintf("k3d-%s", config.Name)
		if config.Type == cluster.ClusterTypeKind {
			kubeContext = fmt.Sprintf("kind-%s", config.Name)
		}

		installer := helm.NewChartInstaller(kubeContext, verbose, dryRun)

		if err := installer.InstallOpenFrameStack(ctx, config, repoPath); err != nil {
			return fmt.Errorf("failed to install OpenFrame stack: %w", err)
		}

		fmt.Println("✅ OpenFrame components installed successfully!")

		// Wait for ArgoCD if installed
		if config.EnableComponents["ArgoCD"] {
			fmt.Println("⏳ Waiting for ArgoCD applications to sync...")
			if err := installer.WaitForArgoCD(ctx); err != nil {
				fmt.Printf("⚠️  Warning: ArgoCD sync timeout: %v\n", err)
			} else {
				fmt.Println("✅ ArgoCD applications synced!")
			}
		}
	}

	// Show next steps
	showNextSteps(config, repoPath)

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

	// Confirm deletion
	confirmed, err := ui.ConfirmAction(fmt.Sprintf("Are you sure you want to delete cluster '%s'? This action cannot be undone", clusterName))
	if err != nil {
		return err
	}
	if !confirmed {
		fmt.Println("Deletion cancelled.")
		return nil
	}

	// Determine cluster type and create provider
	clusterType, err := detectClusterType(clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	provider, err := createClusterProvider(clusterType)
	if err != nil {
		return err
	}

	// Delete the cluster
	fmt.Printf("🗑️  Deleting cluster '%s'...\n", clusterName)
	if err := provider.Delete(ctx, clusterName); err != nil {
		return fmt.Errorf("failed to delete cluster: %w", err)
	}

	fmt.Printf("✅ Cluster '%s' deleted successfully!\n", clusterName)
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
	case cluster.ClusterTypeKind:
		return fmt.Errorf("kind clusters cannot be started/stopped - they are always running")
	default:
		return fmt.Errorf("unsupported cluster type for start operation: %s", clusterType)
	}

	if err := startCmd.Run(); err != nil {
		return fmt.Errorf("failed to start cluster: %w", err)
	}

	pterm.Success.Printf("✅ Cluster '%s' started successfully!\n", clusterName)
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
	case cluster.ClusterTypeKind:
		return cleanupKindCluster(ctx, clusterName)
	default:
		return fmt.Errorf("cleanup not supported for cluster type: %s", clusterType)
	}
}

func cleanupK3dCluster(ctx context.Context, clusterName string) error {
	// Get cluster nodes (following shell script logic)
	nodeNames := []string{
		fmt.Sprintf("k3d-%s-agent-0", clusterName),
		fmt.Sprintf("k3d-%s-agent-1", clusterName),
		fmt.Sprintf("k3d-%s-agent-2", clusterName),
		fmt.Sprintf("k3d-%s-server-0", clusterName),
	}

	cleanedCount := 0
	for _, nodeName := range nodeNames {
		pterm.Info.Printf("Cleaning up %s...\n", nodeName)

		cmd := exec.CommandContext(ctx, "docker", "exec", nodeName, "crictl", "rmi", "--prune")
		if err := cmd.Run(); err != nil {
			pterm.Warning.Printf("Failed to cleanup %s: %v\n", nodeName, err)
		} else {
			cleanedCount++
		}
	}

	if cleanedCount > 0 {
		pterm.Success.Printf("✅ Cleaned up %d cluster nodes\n", cleanedCount)
	} else {
		pterm.Warning.Println("No nodes were cleaned up")
	}

	return nil
}

func cleanupKindCluster(ctx context.Context, clusterName string) error {
	// For Kind, we can clean up using Docker directly
	pterm.Info.Println("Cleaning up Kind cluster images...")

	// Get Kind cluster containers
	cmd := exec.CommandContext(ctx, "docker", "ps", "-a", "--format", "{{.Names}}", "--filter", fmt.Sprintf("label=io.x-k8s.kind.cluster=%s", clusterName))
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to get Kind containers: %w", err)
	}

	containers := strings.Split(strings.TrimSpace(string(output)), "\n")
	cleanedCount := 0

	for _, container := range containers {
		if container == "" {
			continue
		}

		pterm.Info.Printf("Cleaning up %s...\n", container)

		cmd := exec.CommandContext(ctx, "docker", "exec", container, "crictl", "rmi", "--prune")
		if err := cmd.Run(); err != nil {
			pterm.Warning.Printf("Failed to cleanup %s: %v\n", container, err)
		} else {
			cleanedCount++
		}
	}

	if cleanedCount > 0 {
		pterm.Success.Printf("✅ Cleaned up %d cluster containers\n", cleanedCount)
	} else {
		pterm.Warning.Println("No containers were cleaned up")
	}

	return nil
}

func runClusterStatus(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	clusterName := getClusterName(args)

	pterm.DefaultSection.Printf("📊 Cluster Status: %s\n", clusterName)

	// Determine cluster type
	clusterType, err := detectClusterType(clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	// Create provider and get status
	provider, err := createClusterProvider(clusterType)
	if err != nil {
		return err
	}

	status, err := provider.Status(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to get cluster status: %w", err)
	}

	// Display status information
	statusData := [][]string{
		{"Property", "Value"},
		{"Name", status.Name},
		{"Type", string(status.Type)},
		{"Status", status.Status},
		{"Nodes", fmt.Sprintf("%d", len(status.Nodes))},
	}

	pterm.DefaultTable.WithHasHeader().WithData(statusData).Render()

	// Show node details
	if len(status.Nodes) > 0 {
		pterm.Info.Println("\n🔧 Node Details:")
		nodeData := [][]string{{"Name", "Role", "Status", "Age"}}

		for _, node := range status.Nodes {
			nodeData = append(nodeData, []string{
				node.Name,
				node.Role,
				node.Status,
				node.Age,
			})
		}

		pterm.DefaultTable.WithHasHeader().WithData(nodeData).Render()
	}

	// Check for running applications
	pterm.Info.Println("\n📦 Installed Applications:")
	if err := showInstalledApps(ctx); err != nil {
		pterm.Warning.Printf("Failed to get installed applications: %v\n", err)
	}

	return nil
}

func showInstalledApps(ctx context.Context) error {
	// Check for Helm releases
	cmd := exec.CommandContext(ctx, "helm", "list", "--all-namespaces", "--output", "table")
	output, err := cmd.Output()
	if err != nil {
		return err
	}

	if strings.TrimSpace(string(output)) == "" {
		pterm.Info.Println("No Helm releases found")
		return nil
	}

	fmt.Println(string(output))
	return nil
}

// Helper functions

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
	case "kind":
		return cluster.ClusterTypeKind
	case "gke":
		return cluster.ClusterTypeGKE
	case "eks":
		return cluster.ClusterTypeEKS
	default:
		return cluster.ClusterTypeK3d // Default
	}
}

func getDefaultComponents() map[string]bool {
	return map[string]bool{
		"ArgoCD":          true,
		"OpenFrame API":   true,
		"OpenFrame UI":    true,
		"Monitoring":      false,
		"External Tools":  false,
		"Developer Tools": false,
	}
}

func validateConfig(config *ui.ClusterConfiguration) error {
	if config.Name == "" {
		return fmt.Errorf("cluster name cannot be empty")
	}
	if config.NodeCount < 1 {
		config.NodeCount = 1 // Default to 1 node
	}
	return nil
}

func showConfigSummary(config *ui.ClusterConfiguration) error {
	fmt.Printf("\n📋 Configuration Summary:\n")
	fmt.Printf("  Cluster Name: %s\n", config.Name)
	fmt.Printf("  Cluster Type: %s\n", config.Type)
	fmt.Printf("  Kubernetes Version: %s\n", config.KubernetesVersion)
	fmt.Printf("  Node Count: %d\n", config.NodeCount)
	fmt.Printf("  Deployment Mode: %s\n", config.DeploymentMode)

	fmt.Printf("  Components:\n")
	for component, enabled := range config.EnableComponents {
		status := "❌"
		if enabled {
			status = "✅"
		}
		fmt.Printf("    %s %s\n", status, component)
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

func createClusterProvider(clusterType cluster.ClusterType) (cluster.ClusterProvider, error) {
	opts := cluster.ProviderOptions{
		Verbose: globalVerbose,
		DryRun:  dryRun,
	}

	switch clusterType {
	case cluster.ClusterTypeK3d:
		return cluster.NewK3dProvider(opts), nil
	case cluster.ClusterTypeKind:
		return cluster.NewKindProvider(opts), nil
	default:
		return nil, fmt.Errorf("unsupported cluster type: %s", clusterType)
	}
}

func hasChartsToInstall(config *ui.ClusterConfiguration) bool {
	for _, enabled := range config.EnableComponents {
		if enabled {
			return true
		}
	}
	return false
}

func showNextSteps(config *ui.ClusterConfiguration, repoPath string) {
	fmt.Printf("\n🎉 OpenFrame cluster '%s' is ready!\n\n", config.Name)

	fmt.Println("📋 Next Steps:")
	fmt.Println("  1. Check cluster status:")
	fmt.Printf("     kubectl get nodes\n\n")

	if config.EnableComponents["OpenFrame UI"] {
		fmt.Println("  2. Access OpenFrame UI:")
		fmt.Println("     http://localhost (once ingress is ready)")
		fmt.Println()
	}

	if config.EnableComponents["ArgoCD"] {
		fmt.Println("  3. Access ArgoCD:")
		fmt.Println("     kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d")
		fmt.Println("     kubectl port-forward svc/argo-cd-argocd-server -n argocd 8080:443")
		fmt.Println("     https://localhost:8080 (admin / <password from above>)")
		fmt.Println()
	}

	if config.EnableComponents["Developer Tools"] {
		fmt.Println("  4. Developer commands:")
		fmt.Printf("     openframe dev intercept <service> <port>\n")
		fmt.Printf("     openframe dev skaffold <service>\n")
		fmt.Println()
	}

	fmt.Println("  5. Manage cluster:")
	fmt.Printf("     openframe cluster status %s\n", config.Name)
	fmt.Printf("     openframe cluster delete %s\n", config.Name)
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

	// Check Kind clusters
	if kindProvider := cluster.NewKindProvider(cluster.ProviderOptions{}); kindProvider.IsAvailable() == nil {
		if clusters, err := kindProvider.List(ctx); err == nil {
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

	// Check Kind
	kindProvider := cluster.NewKindProvider(cluster.ProviderOptions{})
	if kindProvider.IsAvailable() == nil {
		if clusters, err := kindProvider.List(ctx); err == nil {
			for _, c := range clusters {
				if c.Name == name {
					return cluster.ClusterTypeKind, nil
				}
			}
		}
	}

	return "", fmt.Errorf("cluster '%s' not found", name)
}
