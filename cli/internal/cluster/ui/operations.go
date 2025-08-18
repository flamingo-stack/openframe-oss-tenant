package ui

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/cluster/domain"
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
		pterm.Info.Printf("🧹 Starting cleanup for cluster '%s'...\n", pterm.Cyan(clusterName))
		pterm.Printf("This will remove unused Docker images and free up disk space.\n\n")
	case "delete":
		pterm.Info.Printf("🗑️ Deleting cluster '%s'...\n", pterm.Cyan(clusterName))
		pterm.Printf("This will remove the cluster and clean up all associated resources.\n\n")
	default:
		pterm.Info.Printf("Processing '%s' for cluster '%s'...\n", operation, pterm.Cyan(clusterName))
	}
}

// ShowOperationSuccess displays a friendly success message
func (ui *OperationsUI) ShowOperationSuccess(operation, clusterName string) {
	switch strings.ToLower(operation) {
	case "cleanup":
		pterm.Success.Printf("✨ Cleanup completed for cluster '%s'\n", pterm.Cyan(clusterName))
		
		// Show what was cleaned up
		fmt.Println()
		tableData := pterm.TableData{
			{"🧹", "Cleanup Summary"},
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
		pterm.Success.Printf("🗑️ Cluster '%s' deleted successfully\n", pterm.Cyan(clusterName))
		
		// Show what was cleaned up
		fmt.Println()
		tableData := pterm.TableData{
			{"🗑️", "Deletion Summary"},
			{"•", pterm.Gray("Cluster and nodes removed")},
			{"•", pterm.Gray("Docker containers cleaned up")},
			{"•", pterm.Gray("Network configuration removed")},
			{"•", pterm.Gray("Kubeconfig entries cleaned")},
		}
		
		if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
			pterm.Println("✓ Cluster and nodes removed")
			pterm.Println("✓ Docker containers cleaned up") 
			pterm.Println("✓ Network configuration removed")
			pterm.Println("✓ Kubeconfig entries cleaned")
		}
		
	default:
		pterm.Success.Printf("✅ Operation '%s' completed for cluster '%s'\n", operation, pterm.Cyan(clusterName))
	}
	fmt.Println()
}

// ShowOperationError displays a friendly error message
func (ui *OperationsUI) ShowOperationError(operation, clusterName string, err error) {
	switch strings.ToLower(operation) {
	case "cleanup":
		pterm.Error.Printf("❌ Cleanup failed for cluster '%s'\n", pterm.Cyan(clusterName))
	case "delete":
		pterm.Error.Printf("❌ Failed to delete cluster '%s'\n", pterm.Cyan(clusterName))
	default:
		pterm.Error.Printf("❌ Operation '%s' failed for cluster '%s'\n", operation, pterm.Cyan(clusterName))
	}
	
	pterm.Printf("Error details: %s\n\n", pterm.Red(err.Error()))
	
	// Show helpful suggestions
	tableData := pterm.TableData{
		{"💡", "Troubleshooting Tips"},
		{"1.", pterm.Gray("Check cluster exists: ") + pterm.Cyan("openframe cluster list")},
		{"2.", pterm.Gray("Check cluster status: ") + pterm.Cyan("openframe cluster status " + clusterName)},
		{"3.", pterm.Gray("Try with verbose output: ") + pterm.Cyan("openframe cluster " + operation + " " + clusterName + " --verbose")},
	}
	
	if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
		pterm.Printf("Troubleshooting:\n")
		pterm.Printf("  1. List clusters: %s\n", pterm.Cyan("openframe cluster list"))
		pterm.Printf("  2. Check status: %s\n", pterm.Cyan("openframe cluster status "+clusterName))
		pterm.Printf("  3. Use verbose: %s\n", pterm.Cyan("openframe cluster "+operation+" "+clusterName+" --verbose"))
	}
	fmt.Println()
}

// ShowNoResourcesMessage displays a friendly message when no clusters are available
func (ui *OperationsUI) ShowNoResourcesMessage(resourceType, operation string) {
	pterm.Warning.Printf("No %s found for %s operation\n", resourceType, operation)
	fmt.Println()
	
	boxContent := fmt.Sprintf(
		"No %s are currently available.\n\n"+
		"To get started:\n"+
		"  • Create a new cluster: %s\n"+
		"  • List existing clusters: %s\n\n"+
		"Need help? Try: %s",
		resourceType,
		pterm.Green("openframe cluster create"),
		pterm.Cyan("openframe cluster list"), 
		pterm.Gray("openframe cluster --help"),
	)
	
	pterm.DefaultBox.
		WithTitle(" 📭 No Clusters Available ").
		WithTitleTopCenter().
		Println(boxContent)
	fmt.Println()
}

