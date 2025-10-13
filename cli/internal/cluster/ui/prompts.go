package ui

import (
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// Use domain types for consistency - no duplicate definitions needed
type ClusterType = models.ClusterType
type ClusterInfo = models.ClusterInfo

// Re-export domain constants for UI convenience
const (
	ClusterTypeK3d = models.ClusterTypeK3d
	ClusterTypeGKE = models.ClusterTypeGKE
)

// UI should not depend on business logic interfaces
// Business logic functions will be injected as simple parameters

// SelectClusterByName allows user to interactively select from available clusters by name
// Takes pre-fetched cluster list instead of manager to separate UI from business logic
func SelectClusterByName(clusters []ClusterInfo, prompt string) (string, error) {
	if len(clusters) == 0 {
		pterm.Warning.Println("No clusters found")
		return "", nil
	}

	clusterNames := make([]string, 0, len(clusters))
	for _, cl := range clusters {
		clusterNames = append(clusterNames, cl.Name)
	}

	if len(clusterNames) == 0 {
		pterm.Warning.Println("No clusters available")
		return "", nil
	}

	selectedIndex, _, err := selectFromList(prompt, clusterNames)
	if err != nil {
		return "", err
	}

	return clusterNames[selectedIndex], nil
}

// HandleClusterSelection handles the common pattern of getting cluster name from args or interactive selection
// Takes pre-fetched cluster list to separate UI from business logic
func HandleClusterSelection(clusters []ClusterInfo, args []string, prompt string) (string, error) {
	// Extract cluster names for generic selection
	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	// Use common UI function
	return sharedUI.HandleResourceSelection(args, clusterNames, prompt)
}

// selectFromList shows a selection prompt for a list of items
func selectFromList(prompt string, items []string) (int, string, error) {
	// Use common UI function
	return sharedUI.SelectFromList(prompt, items)
}

// ConfirmClusterDeletion asks for user confirmation before cluster deletion
func ConfirmClusterDeletion(clusterName string, force bool) (bool, error) {
	if force {
		return true, nil
	}

	return confirmAction(fmt.Sprintf(
		"Are you sure you want to delete cluster '%s'? This action cannot be undone",
		clusterName,
	))
}

// ShowClusterOperationCancelled displays a consistent cancellation message for cluster operations
func ShowClusterOperationCancelled() {
	pterm.Info.Println("No cluster selected. Operation cancelled.")
}

// FormatClusterSuccessMessage formats a success message with cluster info
func FormatClusterSuccessMessage(clusterName string, clusterType string, status string) string {
	return pterm.Sprintf("Cluster: %s\nType: %s\nStatus: %s",
		pterm.Green(clusterName),
		pterm.Blue(clusterType),
		pterm.Green(status))
}

// confirmAction shows a confirmation prompt
func confirmAction(message string) (bool, error) {
	// Use common UI function
	return sharedUI.ConfirmAction(message)
}
