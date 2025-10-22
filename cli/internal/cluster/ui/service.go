package ui

import (
	"fmt"
	"io"
	"time"

	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// ClusterDisplayInfo represents cluster information for display purposes
type ClusterDisplayInfo struct {
	Name      string
	Type      string
	Status    string
	NodeCount int
	CreatedAt time.Time
	Nodes     []NodeDisplayInfo
}

// NodeDisplayInfo represents node information for display
type NodeDisplayInfo struct {
	Name   string
	Role   string
	Status string
}

// ClusterConfigDisplay represents cluster configuration for display
type ClusterConfigDisplay struct {
	Name       string
	Type       string
	K8sVersion string
	NodeCount  int
}

// DisplayService handles all cluster-related UI display operations
// This separates presentation concerns from business logic
type DisplayService struct{}

// NewDisplayService creates a new UI display service
func NewDisplayService() *DisplayService {
	return &DisplayService{}
}

// ShowClusterCreationStart displays the start of cluster creation
func (s *DisplayService) ShowClusterCreationStart(name, clusterType string, out io.Writer) {
	fmt.Fprintf(out, "Creating %s cluster '%s'...\n", clusterType, name)
}

// ShowClusterCreationSuccess displays successful cluster creation
func (s *DisplayService) ShowClusterCreationSuccess(name string, out io.Writer) {
	fmt.Fprintf(out, "Cluster '%s' created successfully!\n", name)
}

// ShowClusterDeletionStart displays the start of cluster deletion
func (s *DisplayService) ShowClusterDeletionStart(name, clusterType string, out io.Writer) {
	fmt.Fprintf(out, "Deleting %s cluster '%s'...\n", clusterType, name)
}

// ShowClusterDeletionSuccess displays successful cluster deletion
func (s *DisplayService) ShowClusterDeletionSuccess(name string, out io.Writer) {
	fmt.Fprintf(out, "Cluster '%s' deleted successfully!\n", name)
}

// ShowClusterStartInProgress displays cluster start in progress
func (s *DisplayService) ShowClusterStartInProgress(name, clusterType string, out io.Writer) {
	fmt.Fprintf(out, "Starting %s cluster '%s'...\n", clusterType, name)
}

// ShowClusterStartSuccess displays successful cluster start
func (s *DisplayService) ShowClusterStartSuccess(name string, out io.Writer) {
	fmt.Fprintf(out, "Cluster '%s' started successfully!\n", name)
}

// ShowClusterList displays a list of clusters
func (s *DisplayService) ShowClusterList(clusters []ClusterDisplayInfo, out io.Writer) {
	if len(clusters) == 0 {
		fmt.Fprintln(out, "No clusters found.")
		return
	}

	// Create table data
	tableData := pterm.TableData{
		{"NAME", "TYPE", "STATUS", "NODES", "CREATED"},
	}

	for _, clusterInfo := range clusters {
		statusColor := sharedUI.GetStatusColor(clusterInfo.Status)
		tableData = append(tableData, []string{
			pterm.Bold.Sprint(clusterInfo.Name),
			clusterInfo.Type,
			statusColor(clusterInfo.Status),
			fmt.Sprintf("%d", clusterInfo.NodeCount),
			clusterInfo.CreatedAt.Format("2006-01-02 15:04"),
		})
	}

	// Use pterm table for better formatting - but write to the provided writer
	table := pterm.DefaultTable.WithHasHeader().WithData(tableData).WithWriter(out)
	if err := table.Render(); err != nil {
		// Fallback to simple formatting if pterm fails
		for i, row := range tableData {
			if i == 0 {
				// Header row
				fmt.Fprintf(out, "%-17s %-8s %-10s %-6s %s\n", row[0], row[1], row[2], row[3], row[4])
				continue
			}
			// Data rows - need to account for styled text by using different spacing
			fmt.Fprintf(out, "%-17s %-8s %-10s %-6s %s\n",
				pterm.RemoveColorFromString(row[0]), // Remove color codes for alignment
				row[1],
				pterm.RemoveColorFromString(row[2]), // Remove color codes for alignment
				row[3],
				row[4])
		}
	}
}

// ShowClusterStatus displays detailed cluster status
func (s *DisplayService) ShowClusterStatus(status *ClusterDisplayInfo, out io.Writer) {
	fmt.Fprintf(out, "\nCluster Status:\n")
	fmt.Fprintf(out, "  Name: %s\n", pterm.Bold.Sprint(status.Name))
	fmt.Fprintf(out, "  Type: %s\n", status.Type)

	statusColor := sharedUI.GetStatusColor(status.Status)
	fmt.Fprintf(out, "  Status: %s\n", statusColor(status.Status))

	fmt.Fprintf(out, "  Node Count: %d\n", status.NodeCount)
	fmt.Fprintf(out, "  Created: %s\n", status.CreatedAt.Format("2006-01-02 15:04:05"))

	// Show node details if available
	if len(status.Nodes) > 0 {
		fmt.Fprintf(out, "\nNodes:\n")
		for _, node := range status.Nodes {
			nodeStatusColor := sharedUI.GetStatusColor(node.Status)
			fmt.Fprintf(out, "  - %s (%s): %s\n",
				node.Name,
				node.Role,
				nodeStatusColor(node.Status))
		}
	}
}

// ShowConfigurationSummary displays cluster configuration summary to output
func (s *DisplayService) ShowConfigurationSummary(config *ClusterConfigDisplay, dryRun bool, skipWizard bool, out io.Writer) error {
	fmt.Fprintf(out, "\nConfiguration Summary:\n")
	fmt.Fprintf(out, "  Cluster Name: %s\n", config.Name)
	fmt.Fprintf(out, "  Cluster Type: %s\n", config.Type)
	fmt.Fprintf(out, "  Kubernetes Version: %s\n", config.K8sVersion)
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

	return nil
}
