package ui

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/cluster/domain"
	commonUI "github.com/flamingo/openframe/internal/common/ui"
	"github.com/pterm/pterm"
)

// OperationsUI provides user-friendly interfaces for cluster operations
type OperationsUI struct{}

// NewOperationsUI creates a new operations UI service
func NewOperationsUI() *OperationsUI {
	return &OperationsUI{}
}

// SelectClusterForOperation provides a friendly interface for selecting a cluster for a specific operation
func (ui *OperationsUI) SelectClusterForOperation(clusters []domain.ClusterInfo, args []string, operation string) (string, error) {
	// If cluster name provided as argument, use it directly
	if len(args) > 0 {
		clusterName := strings.TrimSpace(args[0])
		if clusterName == "" {
			return "", fmt.Errorf("cluster name cannot be empty")
		}
		
		// Validate that the cluster exists in the available clusters
		found := false
		for _, cluster := range clusters {
			if cluster.Name == clusterName {
				found = true
				break
			}
		}
		if !found {
			return "", fmt.Errorf("cluster '%s' not found", clusterName)
		}
		
		return clusterName, nil
	}

	// Check if clusters are available
	if len(clusters) == 0 {
		ui.ShowNoResourcesMessage("clusters", operation)
		return "", nil
	}

	// Use interactive selection
	clusterName, err := SelectClusterByName(clusters, fmt.Sprintf("Select cluster to %s", operation))
	if err != nil {
		return "", fmt.Errorf("cluster selection failed: %w", err)
	}

	return clusterName, nil
}

// SelectClusterForDelete provides a friendly interface for selecting a cluster to delete with confirmation
func (ui *OperationsUI) SelectClusterForDelete(clusters []domain.ClusterInfo, args []string, force bool) (string, error) {
	// If cluster name provided as argument, use it directly
	if len(args) > 0 {
		clusterName := strings.TrimSpace(args[0])
		if clusterName == "" {
			return "", fmt.Errorf("cluster name cannot be empty")
		}
		
		// Validate that the cluster exists in the available clusters
		found := false
		for _, cluster := range clusters {
			if cluster.Name == clusterName {
				found = true
				break
			}
		}
		if !found {
			return "", fmt.Errorf("cluster '%s' not found", clusterName)
		}
		
		// Ask for confirmation unless forced
		if !force {
			confirmed, err := ui.confirmDeletion(clusterName)
			if err != nil {
				return "", err
			}
			if !confirmed {
				pterm.Info.Println("Deletion cancelled.")
				return "", nil
			}
		}
		
		return clusterName, nil
	}

	// Check if clusters are available
	if len(clusters) == 0 {
		ui.ShowNoResourcesMessage("clusters", "delete")
		return "", nil
	}

	// Use interactive selection
	clusterName, err := SelectClusterByName(clusters, "Select cluster to delete")
	if err != nil {
		return "", fmt.Errorf("cluster selection failed: %w", err)
	}
	
	if clusterName == "" {
		return "", nil
	}
	
	// Ask for confirmation unless forced
	if !force {
		confirmed, err := ui.confirmDeletion(clusterName)
		if err != nil {
			return "", err
		}
		if !confirmed {
			pterm.Info.Println("Deletion cancelled.")
			return "", nil
		}
	}

	return clusterName, nil
}

// SelectClusterForCleanup provides a friendly interface for selecting a cluster for cleanup with confirmation
func (ui *OperationsUI) SelectClusterForCleanup(clusters []domain.ClusterInfo, args []string, force bool) (string, error) {
	// If cluster name provided as argument, use it directly
	if len(args) > 0 {
		clusterName := strings.TrimSpace(args[0])
		if clusterName == "" {
			return "", fmt.Errorf("cluster name cannot be empty")
		}
		
		// Validate that the cluster exists in the available clusters
		found := false
		for _, cluster := range clusters {
			if cluster.Name == clusterName {
				found = true
				break
			}
		}
		if !found {
			return "", fmt.Errorf("cluster '%s' not found", clusterName)
		}
		
		// Ask for confirmation unless forced
		if !force {
			confirmed, err := ui.confirmCleanup(clusterName)
			if err != nil {
				return "", err
			}
			if !confirmed {
				pterm.Info.Println("Cleanup cancelled.")
				return "", nil
			}
		}
		
		return clusterName, nil
	}

	// Check if clusters are available
	if len(clusters) == 0 {
		ui.ShowNoResourcesMessage("clusters", "cleanup")
		return "", nil
	}

	// Use interactive selection
	clusterName, err := SelectClusterByName(clusters, "Select cluster to cleanup")
	if err != nil {
		return "", fmt.Errorf("cluster selection failed: %w", err)
	}
	
	if clusterName == "" {
		return "", nil
	}
	
	// Ask for confirmation unless forced
	if !force {
		confirmed, err := ui.confirmCleanup(clusterName)
		if err != nil {
			return "", err
		}
		if !confirmed {
			pterm.Info.Println("Cleanup cancelled.")
			return "", nil
		}
	}

	return clusterName, nil
}

// confirmCleanup asks for user confirmation before cleaning up a cluster
func (ui *OperationsUI) confirmCleanup(clusterName string) (bool, error) {
	return pterm.DefaultInteractiveConfirm.
		WithDefaultText(fmt.Sprintf("Are you sure you want to cleanup cluster '%s'?", pterm.Cyan(clusterName))).
		WithDefaultValue(false).
		Show()
}

// confirmDeletion asks for user confirmation before deleting a cluster
func (ui *OperationsUI) confirmDeletion(clusterName string) (bool, error) {
	return pterm.DefaultInteractiveConfirm.
		WithDefaultText(fmt.Sprintf("Are you sure you want to delete cluster '%s'?", pterm.Cyan(clusterName))).
		WithDefaultValue(false).
		Show()
}

// ShowOperationStart displays a friendly message when starting an operation
func (ui *OperationsUI) ShowOperationStart(operation, clusterName string) {
	switch strings.ToLower(operation) {
	case "cleanup":
		pterm.Info.Printf("Starting cleanup for cluster '%s'...\n", pterm.Cyan(clusterName))
		pterm.Printf("This will remove unused Docker images and free up disk space.\n\n")
	case "delete":
		pterm.Info.Printf("Deleting cluster '%s'...\n", pterm.Cyan(clusterName))
		pterm.Printf("This will remove the cluster and clean up all associated resources.\n\n")
	default:
		pterm.Info.Printf("Processing '%s' for cluster '%s'...\n", operation, pterm.Cyan(clusterName))
	}
}

// ShowOperationSuccess displays a friendly success message
func (ui *OperationsUI) ShowOperationSuccess(operation, clusterName string) {
	switch strings.ToLower(operation) {
	case "cleanup":
		pterm.Success.Printf("Cleanup completed for cluster '%s'\n", pterm.Cyan(clusterName))
		
		// Show what was cleaned up
		fmt.Println()
		tableData := pterm.TableData{
			{"STATUS", "Cleanup Summary"},
			{"•", pterm.Gray("Removed unused Docker images")},
			{"•", pterm.Gray("Freed up disk space")},
			{"•", pterm.Gray("Optimized cluster performance")},
		}
		
		if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
			pterm.Println("✓ Removed unused Docker images")
			pterm.Println("✓ Freed up disk space") 
			pterm.Println("✓ Optimized cluster performance")
		}
		
	case "delete":
		// The spinner already showed the success message, so we just show the details
		fmt.Println()
		
		// Create a styled box for the deletion summary
		boxContent := fmt.Sprintf(
			"NAME:         %s\n"+
			"TYPE:         %s\n"+
			"STATUS:       %s\n"+
			"NETWORK:      %s\n"+
			"RESOURCES:    %s",
			pterm.Bold.Sprint(clusterName),
			"k3d", // We don't have cluster type here, default to k3d
			pterm.Red("Deleted"),
			pterm.Gray("Removed"),
			pterm.Gray("Cleaned up"),
		)
		
		pterm.DefaultBox.
			WithTitle(" Cluster Deleted ").
			WithTitleTopCenter().
			Println(boxContent)
		
		// Show deletion summary
		fmt.Println()
		tableData := pterm.TableData{
			{"STATUS", "Deletion Summary"},
			{"•", pterm.Gray("Cluster and nodes removed")},
			{"•", pterm.Gray("Docker containers cleaned up")},
			{"•", pterm.Gray("Network configuration removed")},
			{"•", pterm.Gray("Kubeconfig entries cleaned")},
		}
		
		if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
			// Fallback to simple output
			fmt.Println("Deletion Summary:")
			fmt.Println("• Cluster and nodes removed")
			fmt.Println("• Docker containers cleaned up")
			fmt.Println("• Network configuration removed")
			fmt.Println("• Kubeconfig entries cleaned")
		}
		
	default:
		pterm.Success.Printf("Operation '%s' completed for cluster '%s'\n", operation, pterm.Cyan(clusterName))
	}
	fmt.Println()
}

// ShowOperationError displays a friendly error message
func (ui *OperationsUI) ShowOperationError(operation, clusterName string, err error) {
	troubleshootingTips := []commonUI.TroubleshootingTip{
		{Description: "Check cluster exists:", Command: "openframe cluster list"},
		{Description: "Check cluster status:", Command: "openframe cluster status " + clusterName},
		{Description: "Try with verbose output:", Command: "openframe cluster " + operation + " " + clusterName + " --verbose"},
	}
	
	commonUI.ShowOperationError(operation, clusterName, err, troubleshootingTips)
}



// ShowConfigurationSummary displays the cluster configuration summary
func (ui *OperationsUI) ShowConfigurationSummary(config domain.ClusterConfig, dryRun bool, skipWizard bool) {
	pterm.Info.Println("Configuration Summary")
	
	// Clean, simple format without heavy table styling
	fmt.Printf("   Name: %s\n", pterm.Cyan(config.Name))
	fmt.Printf("   Type: %s\n", string(config.Type))
	fmt.Printf("  Nodes: %d\n", config.NodeCount)
	
	if config.K8sVersion != "" {
		fmt.Printf("Version: %s\n", config.K8sVersion)
	}
	
	fmt.Println()
	
	if dryRun {
		pterm.Warning.Println("DRY RUN MODE - No cluster will be created")
	} else if skipWizard {
		pterm.Info.Println("Proceeding with cluster creation...")
	}
}

// ShowNoResourcesMessage displays a friendly message when no clusters are available
func (ui *OperationsUI) ShowNoResourcesMessage(resourceType, operation string) {
	commonUI.ShowNoResourcesMessage(
		resourceType,
		operation,
		"openframe cluster create",
		"openframe cluster list",
	)
}

