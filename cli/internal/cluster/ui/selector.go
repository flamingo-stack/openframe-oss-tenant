package ui

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// Selector handles cluster selection logic across different commands
type Selector struct {
	operation string
}

// NewSelector creates a new cluster selector for the given operation
func NewSelector(operation string) *Selector {
	return &Selector{
		operation: operation,
	}
}

// SelectCluster handles cluster selection with consistent logic
// Supports both argument-based and interactive selection
func (s *Selector) SelectCluster(clusters []models.ClusterInfo, args []string) (string, error) {
	// Validate input
	if len(clusters) == 0 {
		s.showNoClusterMessage()
		return "", nil
	}

	// If cluster name provided as argument, validate and use it
	if len(args) > 0 {
		clusterName := strings.TrimSpace(args[0])
		if clusterName == "" {
			return "", fmt.Errorf("cluster name cannot be empty")
		}

		// Validate that the cluster exists
		for _, cluster := range clusters {
			if cluster.Name == clusterName {
				return clusterName, nil
			}
		}
		return "", fmt.Errorf("cluster '%s' not found", clusterName)
	}

	// Use interactive selection
	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	prompt := fmt.Sprintf("Select cluster for %s", s.operation)
	_, selectedCluster, err := sharedUI.SelectFromList(prompt, clusterNames)
	if err != nil {
		return "", fmt.Errorf("cluster selection failed: %w", err)
	}

	if selectedCluster == "" {
		s.showOperationCancelled()
		return "", nil
	}

	return selectedCluster, nil
}

// SelectMultipleClusters handles selection of multiple clusters
func (s *Selector) SelectMultipleClusters(clusters []models.ClusterInfo, args []string) ([]string, error) {
	if len(clusters) == 0 {
		s.showNoClusterMessage()
		return nil, nil
	}

	// If specific clusters provided as arguments, validate them
	if len(args) > 0 {
		var validClusters []string
		clusterMap := make(map[string]bool)
		for _, cluster := range clusters {
			clusterMap[cluster.Name] = true
		}

		for _, arg := range args {
			clusterName := strings.TrimSpace(arg)
			if clusterName == "" {
				return nil, fmt.Errorf("cluster name cannot be empty")
			}
			if !clusterMap[clusterName] {
				return nil, fmt.Errorf("cluster '%s' not found", clusterName)
			}
			validClusters = append(validClusters, clusterName)
		}
		return validClusters, nil
	}

	// Interactive multi-selection
	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	defaults := make([]bool, len(clusterNames))
	prompt := fmt.Sprintf("Select clusters for %s", s.operation)

	selected, err := sharedUI.GetMultiChoice(prompt, clusterNames, defaults)
	if err != nil {
		return nil, fmt.Errorf("cluster selection failed: %w", err)
	}

	var selectedClusters []string
	for i, isSelected := range selected {
		if isSelected {
			selectedClusters = append(selectedClusters, clusterNames[i])
		}
	}

	if len(selectedClusters) == 0 {
		s.showOperationCancelled()
		return nil, nil
	}

	return selectedClusters, nil
}

// ValidateClusterExists checks if a cluster exists in the given list
func (s *Selector) ValidateClusterExists(clusters []models.ClusterInfo, clusterName string) bool {
	for _, cluster := range clusters {
		if cluster.Name == clusterName {
			return true
		}
	}
	return false
}

// GetClusterByName returns the cluster info for the given name
func (s *Selector) GetClusterByName(clusters []models.ClusterInfo, clusterName string) (*models.ClusterInfo, error) {
	for _, cluster := range clusters {
		if cluster.Name == clusterName {
			return &cluster, nil
		}
	}
	return nil, fmt.Errorf("cluster '%s' not found", clusterName)
}

// FilterClusters returns clusters that match the given predicate
func (s *Selector) FilterClusters(clusters []models.ClusterInfo, predicate func(models.ClusterInfo) bool) []models.ClusterInfo {
	var filtered []models.ClusterInfo
	for _, cluster := range clusters {
		if predicate(cluster) {
			filtered = append(filtered, cluster)
		}
	}
	return filtered
}

// showNoClusterMessage displays a message when no clusters are available
func (s *Selector) showNoClusterMessage() {
	pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
}

// showOperationCancelled displays a cancellation message
func (s *Selector) showOperationCancelled() {
	pterm.Info.Printf("No cluster selected. %s cancelled.\n", strings.Title(s.operation))
}
