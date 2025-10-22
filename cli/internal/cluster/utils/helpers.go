package utils

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
)

// ClusterSelectionResult contains the result of cluster selection (deprecated - use UI types)
type ClusterSelectionResult struct {
	Name string
	Type models.ClusterType
}

// ExecResult moved to cmd/cluster/cluster.go for better locality

// Command execution utilities moved to respective cmd files for better locality

// Validation utilities

// ValidateClusterName validates cluster name format using domain validation
func ValidateClusterName(name string) error {
	return models.ValidateClusterName(name)
}

// ParseClusterType converts string to ClusterType
func ParseClusterType(typeStr string) models.ClusterType {
	switch strings.ToLower(typeStr) {
	case "k3d":
		return models.ClusterTypeK3d
	case "gke":
		return models.ClusterTypeGKE
	default:
		return models.ClusterTypeK3d // Default
	}
}

// GetNodeCount returns validated node count with default
func GetNodeCount(nodeCount int) int {
	if nodeCount <= 0 {
		return 3 // Default to 3 nodes
	}
	return nodeCount
}

// Cluster selection utilities

// HandleClusterSelectionWithType removed - use UI package for clean separation

// HandleClusterSelection removed - use UI package for clean separation

// SelectClusterByName removed - use UI package for clean separation

// selectFromList removed - use UI package for clean separation

// UI utilities

// ConfirmClusterDeletion handles cluster deletion confirmation with consistent messaging
// ConfirmClusterDeletion moved to ui package - use ui.ConfirmClusterDeletion instead

// ShowClusterOperationCancelled moved to ui package - use ui.ShowClusterOperationCancelled instead

// FormatClusterSuccessMessage moved to ui package - use ui.FormatClusterSuccessMessage instead

// CreateClusterError creates a new cluster error using the standardized error system
func CreateClusterError(operation, clusterName string, clusterType models.ClusterType, err error) error {
	return fmt.Errorf("cluster %s operation failed for %s (%s): %w", operation, clusterName, clusterType, err)
}

// confirmAction moved to ui package - use ui internal confirmAction instead
