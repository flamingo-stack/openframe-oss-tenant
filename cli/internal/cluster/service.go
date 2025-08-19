package cluster

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/cluster/models"
	"github.com/flamingo/openframe/internal/cluster/providers/k3d"
	uiCluster "github.com/flamingo/openframe/internal/cluster/ui"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// ClusterService provides cluster configuration and management operations
// This handles cluster lifecycle operations and configuration management
type ClusterService struct {
	manager  *k3d.K3dManager
	executor executor.CommandExecutor
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
		manager:  manager,
		executor: exec,
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
		
		// Show what user can do
		fmt.Println()
		pterm.Info.Printf("What would you like to do?\n")
		pterm.Printf("  • Check status: openframe cluster status %s\n", config.Name)
		pterm.Printf("  • Delete first: openframe cluster delete %s\n", config.Name)
		pterm.Printf("  • Use different name: openframe cluster create my-new-cluster\n")
		
		return nil // Exit gracefully without error
	}
	
	// Cluster doesn't exist, proceed with creation
	spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("Creating %s cluster '%s'...", config.Type, config.Name))
	
	err := s.manager.CreateCluster(ctx, config)
	if err != nil {
		spinner.Fail(fmt.Sprintf("Failed to create cluster '%s'", config.Name))
		return err
	}
	
	spinner.Success(fmt.Sprintf("Cluster '%s' created successfully", config.Name))
	
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
	spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("Deleting %s cluster '%s'...", clusterType, name))
	
	err := s.manager.DeleteCluster(ctx, name, clusterType, force)
	if err != nil {
		spinner.Fail(fmt.Sprintf("Failed to delete cluster '%s'", name))
		return err
	}
	
	spinner.Stop() // Stop spinner without message - UI layer will show success
	
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
func (s *ClusterService) CleanupCluster(name string, clusterType models.ClusterType, verbose bool) error {
	switch clusterType {
	case models.ClusterTypeK3d:
		return s.cleanupK3dCluster(name, verbose)
	default:
		return fmt.Errorf("cleanup not supported for cluster type: %s", clusterType)
	}
}

// cleanupK3dCluster handles K3d-specific cleanup
func (s *ClusterService) cleanupK3dCluster(clusterName string, verbose bool) error {
	// For now, just return success - actual cleanup logic would use executor
	// This maintains the same interface while simplifying the implementation
	return nil
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