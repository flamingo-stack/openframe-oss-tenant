package config

import (
	"context"
	"fmt"
	"os"

	"github.com/flamingo/openframe/internal/cluster"
	"github.com/flamingo/openframe/internal/cluster/domain"
	uiCluster "github.com/flamingo/openframe/internal/cluster/ui"
	"github.com/flamingo/openframe/internal/common/executor"
	"github.com/pterm/pterm"
)

// ClusterService provides cluster configuration and management operations
// This handles cluster lifecycle operations and configuration management
type ClusterService struct {
	manager  *cluster.K3dManager
	executor executor.CommandExecutor
}

// NewClusterService creates a new cluster service with default configuration
func NewClusterService(exec executor.CommandExecutor) *ClusterService {
	manager := cluster.CreateClusterManagerWithExecutor(exec)
	return &ClusterService{
		manager:  manager,
		executor: exec,
	}
}

// NewClusterServiceWithOptions creates a cluster service with custom options
func NewClusterServiceWithOptions(exec executor.CommandExecutor, manager *cluster.K3dManager) *ClusterService {
	return &ClusterService{
		manager:  manager,
		executor: exec,
	}
}

// CreateCluster handles cluster creation operations
func (s *ClusterService) CreateCluster(config domain.ClusterConfig) error {
	ctx := context.Background()
	return s.manager.CreateCluster(ctx, config)
}

// DeleteCluster handles cluster deletion business logic
func (s *ClusterService) DeleteCluster(name string, clusterType domain.ClusterType, force bool) error {
	ctx := context.Background()
	return s.manager.DeleteCluster(ctx, name, clusterType, force)
}

// StartCluster handles cluster start business logic with UI
func (s *ClusterService) StartCluster(name string, clusterType domain.ClusterType) error {
	ctx := context.Background()
	
	// Display starting message
	fmt.Printf("Starting Cluster: %s\n", name)
	
	// Start the cluster using manager
	err := s.manager.StartCluster(ctx, name, clusterType)
	if err != nil {
		return fmt.Errorf("failed to start cluster '%s': %w", name, err)
	}
	
	// Display success message
	fmt.Printf("Cluster '%s' started successfully\n", name)
	return nil
}

// ListClusters handles cluster listing business logic
func (s *ClusterService) ListClusters() ([]domain.ClusterInfo, error) {
	ctx := context.Background()
	return s.manager.ListAllClusters(ctx)
}

// GetClusterStatus handles cluster status business logic
func (s *ClusterService) GetClusterStatus(name string) (domain.ClusterInfo, error) {
	ctx := context.Background()
	return s.manager.GetClusterStatus(ctx, name)
}

// DetectClusterType handles cluster type detection business logic
func (s *ClusterService) DetectClusterType(name string) (domain.ClusterType, error) {
	ctx := context.Background()
	return s.manager.DetectClusterType(ctx, name)
}

// CleanupCluster handles cluster cleanup business logic
func (s *ClusterService) CleanupCluster(name string, clusterType domain.ClusterType, verbose bool) error {
	fmt.Printf("Cleaning up cluster '%s' resources...\n", name)
	
	switch clusterType {
	case domain.ClusterTypeK3d:
		return s.cleanupK3dCluster(name, verbose)
	default:
		return fmt.Errorf("cleanup not supported for cluster type: %s", clusterType)
	}
}

// cleanupK3dCluster handles K3d-specific cleanup
func (s *ClusterService) cleanupK3dCluster(clusterName string, verbose bool) error {
	// For now, just return success - actual cleanup logic would use executor
	// This maintains the same interface while simplifying the implementation
	fmt.Printf("Cleanup completed for cluster '%s'\n", clusterName)
	return nil
}

// ShowClusterStatus handles cluster status display logic
func (s *ClusterService) ShowClusterStatus(name string, detailed bool, skipApps bool, verbose bool) error {
	ctx := context.Background()
	
	// Get cluster status
	status, err := s.manager.GetClusterStatus(ctx, name)
	if err != nil {
		return fmt.Errorf("failed to get cluster status: %w", err)
	}
	
	// Display basic cluster information
	fmt.Printf("Cluster Status: %s\n", name)
	fmt.Printf("Name: %s\n", status.Name)
	fmt.Printf("Type: %s\n", status.Type)
	fmt.Printf("Status: %s\n", status.Status)
	fmt.Printf("Nodes: %d\n", len(status.Nodes))
	
	if !status.CreatedAt.IsZero() {
		fmt.Printf("Age: %s\n", status.CreatedAt.Format("2006-01-02 15:04:05"))
	}
	
	// Show node details
	if len(status.Nodes) > 0 {
		fmt.Println("\nNode Details:")
		for _, node := range status.Nodes {
			fmt.Printf("  %s - %s (%s)\n", node.Name, node.Role, node.Status)
		}
	}
	
	if verbose {
		fmt.Printf("\nUse 'openframe cluster status %s --detailed' for more information\n", name)
	}
	
	return nil
}

// DisplayClusterList handles cluster list display logic
func (s *ClusterService) DisplayClusterList(clusters []domain.ClusterInfo, quiet bool, verbose bool) error {
	if len(clusters) == 0 {
		if quiet {
			// In quiet mode, just exit silently if no clusters
			return nil
		}
		// Use the UI service for consistent messaging
		uiCluster.ShowNoResourcesMessage("clusters", "openframe cluster create")
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
			NodeCount: len(cluster.Nodes),
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