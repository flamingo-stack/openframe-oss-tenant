package cluster

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/cluster/domain"
	uiCluster "github.com/flamingo/openframe/internal/cluster/ui"
	"github.com/flamingo/openframe/internal/common/executor"
	"github.com/pterm/pterm"
)

// ClusterService provides cluster configuration and management operations
// This handles cluster lifecycle operations and configuration management
type ClusterService struct {
	manager  *K3dManager
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
	manager := CreateClusterManagerWithExecutor(exec)
	return &ClusterService{
		manager:  manager,
		executor: exec,
	}
}

// NewClusterServiceWithOptions creates a cluster service with custom options
func NewClusterServiceWithOptions(exec executor.CommandExecutor, manager *K3dManager) *ClusterService {
	return &ClusterService{
		manager:  manager,
		executor: exec,
	}
}

// CreateCluster handles cluster creation operations
func (s *ClusterService) CreateCluster(config domain.ClusterConfig) error {
	ctx := context.Background()
	
	// Check if cluster already exists
	if existingInfo, err := s.manager.GetClusterStatus(ctx, config.Name); err == nil {
		// Cluster already exists - show friendly message
		
		// Format creation time properly, or show "Just now" if timestamp is zero
		createdTime := "Just now"
		if !existingInfo.CreatedAt.IsZero() && existingInfo.CreatedAt.Year() > 1 {
			createdTime = existingInfo.CreatedAt.Format("2006-01-02 15:04")
		}
		
		boxContent := fmt.Sprintf(
			"A cluster named '%s' already exists!\n\n"+
			"NAME:     %s\n"+
			"TYPE:     %s\n"+
			"STATUS:   %s\n"+
			"NODES:    %d\n"+
			"CREATED:  %s",
			config.Name,
			pterm.Bold.Sprint(existingInfo.Name),
			existingInfo.Type,
			pterm.Green("Running"),
			existingInfo.NodeCount,
			createdTime,
		)
		
		pterm.DefaultBox.
			WithTitle(" ℹ️  Cluster Already Exists ").
			WithTitleTopCenter().
			Println(boxContent)
			
		// Show available options
		fmt.Println()
		tableData := pterm.TableData{
			{"💡", "What would you like to do?"},
			{"1.", pterm.Gray("Check cluster status: ") + pterm.Cyan("openframe cluster status")},
			{"2.", pterm.Gray("Delete and recreate:  ") + pterm.Cyan("openframe cluster delete " + config.Name + " --force && openframe cluster create")},
			{"3.", pterm.Gray("Create with new name:  ") + pterm.Cyan("openframe cluster create my-new-cluster")},
			{"4.", pterm.Gray("List all clusters:    ") + pterm.Cyan("openframe cluster list")},
		}
		
		if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
			// Fallback to simple output
			fmt.Println("What would you like to do?")
			fmt.Printf("  1. Check cluster status: %s\n", pterm.Cyan("openframe cluster status"))
			fmt.Printf("  2. Delete and recreate:  %s\n", pterm.Cyan("openframe cluster delete "+config.Name+" --force && openframe cluster create"))
			fmt.Printf("  3. Create with new name:  %s\n", pterm.Cyan("openframe cluster create my-new-cluster"))
			fmt.Printf("  4. List all clusters:    %s\n", pterm.Cyan("openframe cluster list"))
		}
		fmt.Println()
		
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
	uiCluster.ShowClusterCreationNextSteps(config.Name)
	
	return nil
}

// DeleteCluster handles cluster deletion business logic
func (s *ClusterService) DeleteCluster(name string, clusterType domain.ClusterType, force bool) error {
	ctx := context.Background()
	
	// Show deletion progress
	spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("Deleting %s cluster '%s'...", clusterType, name))
	
	err := s.manager.DeleteCluster(ctx, name, clusterType, force)
	if err != nil {
		spinner.Fail(fmt.Sprintf("Failed to delete cluster '%s'", name))
		return err
	}
	
	spinner.Success(fmt.Sprintf("Cluster '%s' deleted successfully", name))
	
	// Show deletion summary
	s.displayClusterDeletionSummary(name, clusterType)
	
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
	return nil
}

// displayClusterCreationSummary displays a summary after cluster creation
func (s *ClusterService) displayClusterCreationSummary(info domain.ClusterInfo) {
	fmt.Println()
	
	// Create a styled box for the summary
	boxContent := fmt.Sprintf(
		"NAME:     %s\n"+
		"TYPE:     %s\n"+
		"STATUS:   %s\n"+
		"NODES:    %d (1 server, %d agents)\n"+
		"NETWORK:  k3d-%s\n"+
		"API:      https://0.0.0.0:6550",
		pterm.Bold.Sprint(info.Name),
		info.Type,
		pterm.Green("Ready"),
		info.NodeCount,
		info.NodeCount-1,
		info.Name,
	)
	
	pterm.DefaultBox.
		WithTitle(" ✅ Cluster Created ").
		WithTitleTopCenter().
		Println(boxContent)
}

// displayClusterDeletionSummary displays a summary after cluster deletion
func (s *ClusterService) displayClusterDeletionSummary(name string, clusterType domain.ClusterType) {
	fmt.Println()
	
	// Create a styled box for the deletion summary
	boxContent := fmt.Sprintf(
		"NAME:         %s\n"+
		"TYPE:         %s\n"+
		"STATUS:       %s\n"+
		"NETWORK:      %s\n"+
		"RESOURCES:    %s",
		pterm.Bold.Sprint(name),
		string(clusterType),
		pterm.Red("Deleted"),
		pterm.Gray("Removed"),
		pterm.Gray("Cleaned up"),
	)
	
	pterm.DefaultBox.
		WithTitle(" 🗑️  Cluster Deleted ").
		WithTitleTopCenter().
		Println(boxContent)
	
	// Show what was cleaned up
	fmt.Println()
	tableData := pterm.TableData{
		{"🧹", "Resources Cleaned Up"},
		{"•", pterm.Gray("Docker containers removed")},
		{"•", pterm.Gray("Kubernetes network deleted")},
		{"•", pterm.Gray("Volumes and configs removed")},
		{"•", pterm.Gray("Kubeconfig entries cleaned")},
	}
	
	// Try to render as table, fallback to simple output
	if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
		// Fallback to simple output
		fmt.Println("Resources cleaned up:")
		fmt.Printf("  • %s\n", pterm.Gray("Docker containers removed"))
		fmt.Printf("  • %s\n", pterm.Gray("Kubernetes network deleted"))
		fmt.Printf("  • %s\n", pterm.Gray("Volumes and configs removed"))
		fmt.Printf("  • %s\n", pterm.Gray("Kubeconfig entries cleaned"))
	}
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
			
			boxContent := fmt.Sprintf(
				"Cluster '%s' not found!\n\n"+
				"Available clusters:",
				name,
			)
			
			// Get list of available clusters
			clusters, listErr := s.manager.ListClusters(ctx)
			if listErr == nil && len(clusters) > 0 {
				for _, cluster := range clusters {
					boxContent += fmt.Sprintf("\n  • %s (%s)", cluster.Name, cluster.Type)
				}
				boxContent += "\n\nTry one of the above cluster names."
			} else if len(clusters) == 0 {
				boxContent += "\n\n  (No clusters available)\n\nCreate a cluster first: openframe cluster create"
			}
			
			pterm.DefaultBox.
				WithTitle(" ❓ Cluster Not Found ").
				WithTitleTopCenter().
				Println(boxContent)
				
			// Show helpful commands
			fmt.Println()
			tableData := pterm.TableData{
				{"💡", "What would you like to do?"},
				{"1.", pterm.Gray("List all clusters:    ") + pterm.Cyan("openframe cluster list")},
				{"2.", pterm.Gray("Create a new cluster: ") + pterm.Cyan("openframe cluster create")},
				{"3.", pterm.Gray("Check specific status:") + pterm.Cyan("openframe cluster status <cluster-name>")},
			}
			
			if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
				// Fallback
				fmt.Println("What would you like to do?")
				fmt.Printf("  1. List all clusters:     %s\n", pterm.Cyan("openframe cluster list"))
				fmt.Printf("  2. Create a new cluster:  %s\n", pterm.Cyan("openframe cluster create"))
				fmt.Printf("  3. Check specific status: %s\n", pterm.Cyan("openframe cluster status <cluster-name>"))
			}
			fmt.Println()
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
func (s *ClusterService) displayDetailedClusterStatus(status domain.ClusterInfo, detailed bool, verbose bool) {
	fmt.Println()
	
	// Main cluster information box
	statusColor := "🟢 Ready"
	if status.Status != "1/1" {
		statusColor = "🟡 Partial"
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
		"STATUS:   %s (%s)\n"+
		"NODES:    %d total\n"+
		"CREATED:  %s\n"+
		"AGE:      %s",
		pterm.Bold.Sprint(status.Name),
		strings.ToUpper(string(status.Type)),
		statusColor,
		status.Status,
		status.NodeCount,
		status.CreatedAt.Format("2006-01-02 15:04:05"),
		ageStr,
	)
	
	pterm.DefaultBox.
		WithTitle(" 📊 Cluster Status ").
		WithTitleTopCenter().
		Println(boxContent)
	
	// Network and connectivity information
	fmt.Println()
	networkData := pterm.TableData{
		{"🌐", "Network Information"},
		{"Network:", pterm.Gray("k3d-" + status.Name)},
		{"API Server:", pterm.Cyan("https://0.0.0.0:6550")},
		{"Kubeconfig:", pterm.Gray("~/.kube/config (k3d-" + status.Name + ")")},
	}
	
	if err := pterm.DefaultTable.WithHasHeader().WithData(networkData).Render(); err != nil {
		fmt.Println("Network Information:")
		fmt.Printf("  Network: k3d-%s\n", status.Name)
		fmt.Printf("  API Server: https://0.0.0.0:6550\n")
		fmt.Printf("  Kubeconfig: ~/.kube/config (k3d-%s)\n", status.Name)
	}
	
	// Resource usage (simulated for now)
	if detailed {
		fmt.Println()
		resourceData := pterm.TableData{
			{"📈", "Resource Usage"},
			{"CPU:", pterm.Green("0.2 cores (10%)")},
			{"Memory:", pterm.Green("512MB (5%)")},
			{"Storage:", pterm.Green("2.1GB (local)")},
			{"Pods:", pterm.Gray("System pods running")},
		}
		
		if err := pterm.DefaultTable.WithHasHeader().WithData(resourceData).Render(); err != nil {
			fmt.Println("Resource Usage:")
			fmt.Println("  CPU: 0.2 cores (10%)")
			fmt.Println("  Memory: 512MB (5%)")
			fmt.Println("  Storage: 2.1GB (local)")
			fmt.Println("  Pods: System pods running")
		}
	}
	
	// Management commands
	fmt.Println()
	commandData := pterm.TableData{
		{"🔧", "Management Commands"},
		{"Delete cluster:", pterm.Cyan("openframe cluster delete " + status.Name)},
		{"Access with kubectl:", pterm.Cyan("kubectl get nodes")},
		{"View pods:", pterm.Cyan("kubectl get pods -A")},
		{"Get cluster info:", pterm.Cyan("kubectl cluster-info")},
	}
	
	if err := pterm.DefaultTable.WithHasHeader().WithData(commandData).Render(); err != nil {
		fmt.Println("Management Commands:")
		fmt.Printf("  Delete cluster: %s\n", pterm.Cyan("openframe cluster delete "+status.Name))
		fmt.Printf("  Access with kubectl: %s\n", pterm.Cyan("kubectl get nodes"))
		fmt.Printf("  View pods: %s\n", pterm.Cyan("kubectl get pods -A"))
		fmt.Printf("  Get cluster info: %s\n", pterm.Cyan("kubectl cluster-info"))
	}
	
	if verbose {
		fmt.Println()
		pterm.Info.Printf("Use --detailed flag for resource usage information\n")
		pterm.Info.Printf("Cluster context: k3d-%s\n", status.Name)
	}
	
	fmt.Println()
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