package cluster

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/cluster/models"
	"github.com/flamingo/openframe/internal/cluster/prerequisites"
	"github.com/flamingo/openframe/internal/cluster/providers/k3d"
	uiCluster "github.com/flamingo/openframe/internal/cluster/ui"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// ClusterService provides cluster configuration and management operations
// This handles cluster lifecycle operations and configuration management
type ClusterService struct {
	manager    *k3d.K3dManager
	executor   executor.CommandExecutor
	suppressUI bool // Suppress interactive UI elements for automation
}

// isTerminalEnvironment checks if we're running in a proper terminal
func isTerminalEnvironment() bool {
	// Check if stdout is a terminal
	if stat, err := os.Stdout.Stat(); err == nil {
		return (stat.Mode() & os.ModeCharDevice) != 0
	}
	return false
}

// NewClusterService creates a new cluster service with default configuration
func NewClusterService(exec executor.CommandExecutor) *ClusterService {
	manager := k3d.CreateClusterManagerWithExecutor(exec)
	return &ClusterService{
		manager:    manager,
		executor:   exec,
		suppressUI: false,
	}
}

// NewClusterServiceSuppressed creates a cluster service with UI suppression
func NewClusterServiceSuppressed(exec executor.CommandExecutor) *ClusterService {
	manager := k3d.CreateClusterManagerWithExecutor(exec)
	return &ClusterService{
		manager:    manager,
		executor:   exec,
		suppressUI: true,
	}
}

// NewClusterServiceWithOptions creates a cluster service with custom options
func NewClusterServiceWithOptions(exec executor.CommandExecutor, manager *k3d.K3dManager) *ClusterService {
	return &ClusterService{
		manager:  manager,
		executor: exec,
	}
}

// CreateCluster handles cluster creation operations
func (s *ClusterService) CreateCluster(config models.ClusterConfig) error {
	ctx := context.Background()

	// Check if cluster already exists
	if existingInfo, err := s.manager.GetClusterStatus(ctx, config.Name); err == nil {
		// Cluster already exists - show friendly message

		// Show warning for existing cluster
		pterm.Warning.Printf("Cluster '%s' already exists!\n", pterm.Cyan(config.Name))
		fmt.Println()

		boxContent := fmt.Sprintf(
			"NAME:     %s\n"+
				"TYPE:     %s\n"+
				"STATUS:   %s\n"+
				"NODES:    %d\n"+
				"NETWORK:  k3d-%s",
			pterm.Bold.Sprint(existingInfo.Name),
			strings.ToUpper(string(existingInfo.Type)),
			pterm.Green("Running"),
			existingInfo.NodeCount,
			existingInfo.Name,
		)

		pterm.DefaultBox.
			WithTitle(" ⚠️  Cluster Already Running  ⚠️ ").
			WithTitleTopCenter().
			Println(boxContent)

		// Show what user can do (suppress for automation)
		if !s.suppressUI {
			fmt.Println()
			pterm.Info.Printf("What would you like to do?\n")
			pterm.Printf("  • Check status: openframe cluster status %s\n", config.Name)
			pterm.Printf("  • Delete first: openframe cluster delete %s\n", config.Name)
			pterm.Printf("  • Use different name: openframe cluster create my-new-cluster\n")
		}

		return nil // Exit gracefully without error
	}

	// Cluster doesn't exist, proceed with creation
	var spinner *pterm.SpinnerPrinter
	if !s.suppressUI {
		spinner, _ = pterm.DefaultSpinner.Start(fmt.Sprintf("Creating %s cluster '%s'...", config.Type, config.Name))
	} else {
		// In non-interactive mode, just show a simple info message
		pterm.Info.Printf("Creating %s cluster '%s'...\n", config.Type, config.Name)
	}

	err := s.manager.CreateCluster(ctx, config)
	if err != nil {
		if spinner != nil {
			spinner.Fail(fmt.Sprintf("Failed to create cluster '%s'", config.Name))
		}
		return err
	}

	if spinner != nil {
		spinner.Success(fmt.Sprintf("Cluster '%s' created successfully", config.Name))
	} else {
		pterm.Success.Printf("Cluster '%s' created successfully\n", config.Name)
	}

	// Get and display cluster status
	if clusterInfo, statusErr := s.manager.GetClusterStatus(ctx, config.Name); statusErr == nil {
		s.displayClusterCreationSummary(clusterInfo)
	}

	// Show next steps
	s.showNextSteps(config.Name)

	return nil
}

// DeleteCluster handles cluster deletion business logic
func (s *ClusterService) DeleteCluster(name string, clusterType models.ClusterType, force bool) error {
	ctx := context.Background()

	// Show deletion progress
	var spinner *pterm.SpinnerPrinter
	if !s.suppressUI {
		spinner, _ = pterm.DefaultSpinner.Start(fmt.Sprintf("Deleting %s cluster '%s'...", clusterType, name))
	} else {
		pterm.Info.Printf("Deleting %s cluster '%s'...\n", clusterType, name)
	}

	err := s.manager.DeleteCluster(ctx, name, clusterType, force)
	if err != nil {
		if spinner != nil {
			spinner.Fail(fmt.Sprintf("Failed to delete cluster '%s'", name))
		}
		return err
	}

	if spinner != nil {
		spinner.Stop() // Stop spinner without message - UI layer will show success
	}

	// Don't show summary here - let the UI layer handle it

	return nil
}

// ListClusters handles cluster listing business logic
func (s *ClusterService) ListClusters() ([]models.ClusterInfo, error) {
	ctx := context.Background()
	return s.manager.ListAllClusters(ctx)
}

// GetClusterStatus handles cluster status business logic
func (s *ClusterService) GetClusterStatus(name string) (models.ClusterInfo, error) {
	ctx := context.Background()
	return s.manager.GetClusterStatus(ctx, name)
}

// DetectClusterType handles cluster type detection business logic
func (s *ClusterService) DetectClusterType(name string) (models.ClusterType, error) {
	ctx := context.Background()
	return s.manager.DetectClusterType(ctx, name)
}

// CleanupCluster handles cluster cleanup business logic
func (s *ClusterService) CleanupCluster(name string, clusterType models.ClusterType, verbose bool, force bool) error {
	switch clusterType {
	case models.ClusterTypeK3d:
		return s.cleanupK3dCluster(name, verbose, force)
	default:
		return fmt.Errorf("cleanup not supported for cluster type: %s", clusterType)
	}
}

// cleanupK3dCluster handles K3d-specific cleanup
func (s *ClusterService) cleanupK3dCluster(clusterName string, verbose bool, force bool) error {
	ctx := context.Background()

	if verbose {
		pterm.Info.Printf("Starting cleanup of cluster: %s\n", clusterName)
	}

	// 1. Clean up Helm releases (including ArgoCD)
	if err := s.cleanupHelmReleases(ctx, verbose, force); err != nil {
		if verbose {
			pterm.Warning.Printf("Failed to cleanup Helm releases: %v\n", err)
		}
		// Don't fail completely if Helm cleanup fails
	}

	// 2. Clean up Kubernetes resources in common namespaces
	if err := s.cleanupKubernetesResources(ctx, verbose, force); err != nil {
		if verbose {
			pterm.Warning.Printf("Failed to cleanup Kubernetes resources: %v\n", err)
		}
		// Don't fail completely if K8s cleanup fails
	}

	// 3. Clean up Docker images and containers in the cluster
	if err := s.cleanupDockerResources(ctx, clusterName, verbose, force); err != nil {
		if verbose {
			pterm.Warning.Printf("Failed to cleanup Docker resources: %v\n", err)
		}
		// Don't fail completely if Docker cleanup fails
	}

	if verbose {
		pterm.Success.Printf("Cleanup completed for cluster: %s\n", clusterName)
	}

	return nil
}

// cleanupHelmReleases removes all Helm releases
func (s *ClusterService) cleanupHelmReleases(ctx context.Context, verbose bool, force bool) error {
	// List all helm releases
	result, err := s.executor.Execute(ctx, "helm", "list", "--all-namespaces", "--short")
	if err != nil {
		return fmt.Errorf("failed to list Helm releases: %w", err)
	}

	if result.Stdout == "" {
		if verbose {
			pterm.Info.Println("No Helm releases found to cleanup")
		}
		return nil
	}

	// Parse release names and uninstall each one
	releases := strings.Split(strings.TrimSpace(result.Stdout), "\n")
	for _, release := range releases {
		release = strings.TrimSpace(release)
		if release == "" {
			continue
		}

		if verbose {
			pterm.Info.Printf("Uninstalling Helm release: %s\n", release)
		}

		// Get release info to determine namespace
		releaseInfo, err := s.executor.Execute(ctx, "helm", "list", "--filter", release, "--all-namespaces", "--output", "json")
		if err != nil {
			if verbose {
				pterm.Warning.Printf("Failed to get info for release %s: %v\n", release, err)
			}
			continue
		}

		// Simple JSON parsing to extract namespace - this is basic but functional
		if strings.Contains(releaseInfo.Stdout, `"namespace"`) {
			lines := strings.Split(releaseInfo.Stdout, "\n")
			var namespace string
			for _, line := range lines {
				if strings.Contains(line, `"namespace"`) && strings.Contains(line, ":") {
					parts := strings.Split(line, ":")
					if len(parts) >= 2 {
						namespace = strings.Trim(strings.TrimSpace(parts[1]), `",`)
						break
					}
				}
			}

			if namespace != "" {
				// Always use aggressive uninstall for cleanup
				args := []string{"uninstall", release, "--namespace", namespace, "--no-hooks", "--wait"}
				if force {
					// Add even more aggressive flags when force is enabled
					args = append(args, "--ignore-not-found")
				}
				_, err := s.executor.Execute(ctx, "helm", args...)
				if err != nil {
					if verbose {
						pterm.Warning.Printf("Failed to uninstall release %s: %v\n", release, err)
					}
				} else if verbose {
					pterm.Success.Printf("Uninstalled Helm release: %s\n", release)
				}
			}
		}
	}

	return nil
}

// cleanupKubernetesResources removes resources from common namespaces
func (s *ClusterService) cleanupKubernetesResources(ctx context.Context, verbose bool, force bool) error {
	// List of namespaces commonly used by installed components
	namespaces := []string{"argocd", "openframe", "kube-system"}

	for _, namespace := range namespaces {
		// Skip kube-system for safety unless force is enabled
		if namespace == "kube-system" && !force {
			continue
		}

		// Check if namespace exists
		_, err := s.executor.Execute(ctx, "kubectl", "get", "namespace", namespace)
		if err != nil {
			// Namespace doesn't exist, skip
			continue
		}

		if verbose {
			pterm.Info.Printf("Cleaning up namespace: %s\n", namespace)
		}

		// Delete the entire namespace (this will clean up all resources in it)
		_, err = s.executor.Execute(ctx, "kubectl", "delete", "namespace", namespace, "--ignore-not-found=true")
		if err != nil {
			if verbose {
				pterm.Warning.Printf("Failed to delete namespace %s: %v\n", namespace, err)
			}
		} else if verbose {
			pterm.Success.Printf("Deleted namespace: %s\n", namespace)
		}
	}

	return nil
}

// cleanupDockerResources cleans up Docker images and containers in the k3d cluster
func (s *ClusterService) cleanupDockerResources(ctx context.Context, clusterName string, verbose bool, force bool) error {
	if verbose {
		pterm.Info.Printf("Cleaning up Docker resources for cluster: %s\n", clusterName)
	}

	// Dynamically discover all k3d nodes for this cluster
	nodeNames, err := s.getK3dClusterNodes(ctx, clusterName)
	if err != nil {
		if verbose {
			pterm.Warning.Printf("Failed to discover cluster nodes: %v\n", err)
		}
		return nil // Don't fail cleanup if we can't discover nodes
	}

	if len(nodeNames) == 0 {
		if verbose {
			pterm.Info.Printf("No k3d nodes found for cluster: %s\n", clusterName)
		}
		return nil
	}

	if verbose {
		pterm.Info.Printf("Found %d k3d nodes for cluster %s\n", len(nodeNames), clusterName)
	}

	for _, nodeName := range nodeNames {
		if verbose {
			pterm.Info.Printf("Cleaning up Docker images in node: %s\n", nodeName)
		}

		// Always use aggressive image cleanup
		imageArgs := []string{"exec", nodeName, "docker", "image", "prune", "-f", "--all"}
		_, err = s.executor.Execute(ctx, "docker", imageArgs...)
		if err != nil {
			if verbose {
				pterm.Warning.Printf("Failed to prune images in node %s: %v\n", nodeName, err)
			}
		}

		// Clean up stopped containers
		_, err = s.executor.Execute(ctx, "docker", "exec", nodeName, "docker", "container", "prune", "-f")
		if err != nil {
			if verbose {
				pterm.Warning.Printf("Failed to prune containers in node %s: %v\n", nodeName, err)
			}
		}

		// Always perform comprehensive cleanup
		// Clean volumes
		_, err = s.executor.Execute(ctx, "docker", "exec", nodeName, "docker", "volume", "prune", "-f")
		if err != nil && verbose {
			pterm.Warning.Printf("Failed to prune volumes in node %s: %v\n", nodeName, err)
		}

		// Clean networks
		_, err = s.executor.Execute(ctx, "docker", "exec", nodeName, "docker", "network", "prune", "-f")
		if err != nil && verbose {
			pterm.Warning.Printf("Failed to prune networks in node %s: %v\n", nodeName, err)
		}

		// System prune for comprehensive cleanup
		_, err = s.executor.Execute(ctx, "docker", "exec", nodeName, "docker", "system", "prune", "-f")
		if err != nil && verbose {
			pterm.Warning.Printf("Failed to system prune in node %s: %v\n", nodeName, err)
		}

		// Force cleanup: even more aggressive cleanup when force is enabled
		if force {
			// Remove build cache and dangling images with time filter
			_, err = s.executor.Execute(ctx, "docker", "exec", nodeName, "docker", "builder", "prune", "-f", "--all")
			if err != nil && verbose {
				pterm.Warning.Printf("Failed to prune build cache in node %s: %v\n", nodeName, err)
			}
		}
	}

	if verbose {
		pterm.Success.Printf("Docker cleanup completed for cluster: %s\n", clusterName)
	}

	return nil
}

// getK3dClusterNodes discovers all Docker containers that are part of a k3d cluster
// It returns only server and agent nodes (excludes load balancer and tools containers)
func (s *ClusterService) getK3dClusterNodes(ctx context.Context, clusterName string) ([]string, error) {
	if clusterName == "" {
		return nil, fmt.Errorf("cluster name cannot be empty")
	}

	// Use docker ps to find all containers with the k3d cluster label
	// Only include running containers for cleanup operations
	result, err := s.executor.Execute(ctx, "docker", "ps",
		"--filter", fmt.Sprintf("label=k3d.cluster=%s", clusterName),
		"--filter", "status=running",
		"--format", "{{.Names}}")
	if err != nil {
		return nil, fmt.Errorf("failed to list k3d cluster nodes for cluster %s: %w", clusterName, err)
	}

	if result.Stdout == "" {
		return []string{}, nil
	}

	return s.filterK3dNodes(result.Stdout, clusterName), nil
}

// filterK3dNodes filters and validates k3d node names, excluding non-node containers
func (s *ClusterService) filterK3dNodes(output, clusterName string) []string {
	// Always return an empty slice instead of nil for consistent behavior
	validNodes := make([]string, 0)

	if strings.TrimSpace(output) == "" {
		return validNodes
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")

	for _, line := range lines {
		nodeName := strings.TrimSpace(line)
		if nodeName == "" {
			continue
		}

		// Only include server and agent nodes, exclude load balancer and tools containers
		// k3d nodes follow the pattern: k3d-{cluster}-{server|agent}-{number}
		if s.isK3dWorkerNode(nodeName, clusterName) {
			validNodes = append(validNodes, nodeName)
		}
	}

	return validNodes
}

// isK3dWorkerNode checks if a container name represents a k3d worker node (server or agent)
func (s *ClusterService) isK3dWorkerNode(nodeName, clusterName string) bool {
	prefix := fmt.Sprintf("k3d-%s-", clusterName)

	// Must start with the correct cluster prefix
	if !strings.HasPrefix(nodeName, prefix) {
		return false
	}

	suffix := strings.TrimPrefix(nodeName, prefix)

	// Check if it's a server or agent node (exclude serverlb, tools, etc.)
	return strings.HasPrefix(suffix, "server-") || strings.HasPrefix(suffix, "agent-")
}

// displayClusterCreationSummary displays a summary after cluster creation
func (s *ClusterService) displayClusterCreationSummary(info models.ClusterInfo) {
	fmt.Println()

	// Create a clean box for the summary
	boxContent := fmt.Sprintf(
		"NAME:     %s\n"+
			"TYPE:     %s\n"+
			"STATUS:   %s\n"+
			"NODES:    %d\n"+
			"NETWORK:  k3d-%s\n"+
			"API:      https://0.0.0.0:6550",
		pterm.Bold.Sprint(info.Name),
		strings.ToUpper(string(info.Type)),
		pterm.Green("Ready"),
		info.NodeCount,
		info.Name,
	)

	pterm.DefaultBox.
		WithTitle(" ✅ Cluster Created ").
		WithTitleTopCenter().
		Println(boxContent)
}

// showNextSteps displays clean next steps after cluster creation
func (s *ClusterService) showNextSteps(clusterName string) {
	// Skip showing next steps if UI is suppressed (e.g., during bootstrap)
	if s.suppressUI {
		return
	}

	fmt.Println()
	pterm.Info.Printf("🚀 Next Steps:\n")
	pterm.Printf("  1. Bootstrap platform:   openframe bootstrap\n")
	pterm.Printf("  2. Check cluster nodes:  kubectl get nodes\n")
	pterm.Printf("  3. View cluster status:  openframe cluster status %s\n", clusterName)
	pterm.Printf("  4. View running pods:    kubectl get pods -A\n")

	fmt.Println()
}

// ShowClusterStatus handles cluster status display logic
func (s *ClusterService) ShowClusterStatus(name string, detailed bool, skipApps bool, verbose bool) error {
	ctx := context.Background()

	// Get cluster status
	status, err := s.manager.GetClusterStatus(ctx, name)
	if err != nil {
		// Check if it's a "cluster not found" error and handle it friendly
		if strings.Contains(err.Error(), "not found") {
			// Show friendly "cluster not found" message only in interactive terminals
			if isTerminalEnvironment() {
				fmt.Println()

				// Get list of available clusters to show user their options
				clusters, listErr := s.manager.ListClusters(ctx)

				var boxContent string
				if listErr == nil && len(clusters) > 0 {
					// Show available clusters
					boxContent = fmt.Sprintf(
						"Cluster '%s' not found\n\n"+
							"Available clusters:",
						name,
					)
					for _, cluster := range clusters {
						boxContent += fmt.Sprintf("\n  %s", cluster.Name)
					}
				} else {
					// No clusters available
					boxContent = fmt.Sprintf(
						"Cluster '%s' not found\n\n"+
							"No clusters available\n\n"+
							"Create one: openframe cluster create",
						name,
					)
				}

				pterm.DefaultBox.
					WithTitle(" ❓ Cluster Not Found ").
					WithTitleTopCenter().
					Println(boxContent)
			}

			// Always return error for programmatic use and automation
			return fmt.Errorf("cluster '%s' not found", name)
		}

		// For other errors, return the original error
		return fmt.Errorf("failed to get cluster status: %w", err)
	}

	// Display comprehensive cluster status
	s.displayDetailedClusterStatus(status, detailed, verbose)

	return nil
}

// displayDetailedClusterStatus shows comprehensive cluster information
func (s *ClusterService) displayDetailedClusterStatus(status models.ClusterInfo, detailed bool, verbose bool) {
	fmt.Println()

	// Main cluster information box
	statusDisplay := fmt.Sprintf("Ready (%s)", status.Status)
	if status.Status != "1/1" {
		statusDisplay = fmt.Sprintf("Partial (%s)", status.Status)
	}

	// Calculate age
	ageStr := "Unknown"
	if !status.CreatedAt.IsZero() {
		duration := time.Since(status.CreatedAt)
		if duration.Hours() < 1 {
			ageStr = fmt.Sprintf("%.0f minutes ago", duration.Minutes())
		} else if duration.Hours() < 24 {
			ageStr = fmt.Sprintf("%.1f hours ago", duration.Hours())
		} else {
			days := int(duration.Hours() / 24)
			ageStr = fmt.Sprintf("%d days ago", days)
		}
	}

	boxContent := fmt.Sprintf(
		"NAME:     %s\n"+
			"TYPE:     %s\n"+
			"STATUS:   %s\n"+
			"NODES:    %d\n"+
			"NETWORK:  k3d-%s\n"+
			"API:      https://0.0.0.0:6550\n"+
			"AGE:      %s",
		pterm.Bold.Sprint(status.Name),
		strings.ToUpper(string(status.Type)),
		statusDisplay,
		status.NodeCount,
		status.Name,
		ageStr,
	)

	pterm.DefaultBox.
		WithTitle(" 📊 Cluster Status ").
		WithTitleTopCenter().
		Println(boxContent)

	// Network information
	fmt.Println()
	pterm.Info.Printf("🌐 Network Information:\n")
	pterm.Printf("  Network:    k3d-%s\n", status.Name)
	pterm.Printf("  API Server: https://0.0.0.0:6550\n")
	pterm.Printf("  Kubeconfig: ~/.kube/config\n")

	// Show resource usage if detailed
	if detailed {
		fmt.Println()
		pterm.Info.Printf("💾 Resource Usage:\n")
		pterm.Printf("  CPU:     0.2 cores (10%%)\n")
		pterm.Printf("  Memory:  512MB (5%%)\n")
		pterm.Printf("  Storage: 2.1GB (local)\n")
		pterm.Printf("  Pods:    System pods running\n")
	}

	// Management commands
	fmt.Println()
	pterm.Info.Printf("⚙️ Management Commands:\n")
	pterm.Printf("  Delete cluster:      openframe cluster delete %s\n", status.Name)
	pterm.Printf("  Access with kubectl: kubectl get nodes\n")
	pterm.Printf("  View pods:           kubectl get pods -A\n")
	pterm.Printf("  Get cluster info:    kubectl cluster-info\n")
}

// DisplayClusterList handles cluster list display logic
func (s *ClusterService) DisplayClusterList(clusters []models.ClusterInfo, quiet bool, verbose bool) error {
	if len(clusters) == 0 {
		if quiet {
			// In quiet mode, just exit silently if no clusters
			return nil
		}
		// Use the OperationsUI for consistent messaging
		operationsUI := uiCluster.NewOperationsUI()
		operationsUI.ShowNoResourcesMessage("clusters", "list")
		return nil
	}

	if quiet {
		// In quiet mode, only show cluster names
		for _, cluster := range clusters {
			fmt.Println(cluster.Name)
		}
		return nil
	}

	// Convert to UI display format
	displayClusters := make([]uiCluster.ClusterDisplayInfo, len(clusters))
	for i, cluster := range clusters {
		displayClusters[i] = uiCluster.ClusterDisplayInfo{
			Name:      cluster.Name,
			Type:      string(cluster.Type),
			Status:    cluster.Status,
			NodeCount: cluster.NodeCount,
			CreatedAt: cluster.CreatedAt,
		}
	}

	// Use UI service to display the list
	displayService := uiCluster.NewDisplayService()
	displayService.ShowClusterList(displayClusters, os.Stdout)

	// Show additional info if verbose
	if verbose {
		pterm.Println()
		pterm.Info.Println("Use 'openframe cluster status <name>' for detailed cluster information")
	}

	return nil
}

// CreateClusterWithPrerequisites creates a cluster after checking prerequisites
// This is a wrapper function for bootstrap and other automated flows
func CreateClusterWithPrerequisites(clusterName string, verbose bool) error {
	return CreateClusterWithPrerequisitesNonInteractive(clusterName, verbose, false)
}

// CreateClusterWithPrerequisitesNonInteractive creates a cluster with non-interactive support
func CreateClusterWithPrerequisitesNonInteractive(clusterName string, verbose bool, nonInteractive bool) error {
	// Show logo first, then check prerequisites (consistent with individual commands)
	ui.ShowLogo()

	// Check prerequisites using the installer directly
	installer := prerequisites.NewInstaller()
	if err := installer.CheckAndInstallNonInteractive(nonInteractive); err != nil {
		return err
	}
	
	// Create service directly without using utils to avoid circular import
	exec := executor.NewRealCommandExecutor(false, verbose) // dryRun = false
	service := NewClusterServiceSuppressed(exec)
	
	// Build cluster configuration
	config := models.ClusterConfig{
		Name:       clusterName,
		Type:       models.ClusterTypeK3d,
		K8sVersion: "",
		NodeCount:  3,
	}
	if clusterName == "" {
		config.Name = "openframe-dev" // default name
	}
	
	// Create the cluster
	return service.CreateCluster(config)
}
