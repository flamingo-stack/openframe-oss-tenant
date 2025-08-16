package utils

import (
	"context"
	"fmt"

	"github.com/flamingo/openframe-cli/internal/cluster"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

// ClusterSelectionResult contains the result of cluster selection
type ClusterSelectionResult struct {
	Name string
	Type cluster.ClusterType
}

// HandleClusterSelectionWithType handles cluster selection and returns both name and type
func HandleClusterSelectionWithType(ctx context.Context, manager *cluster.Manager, args []string, prompt string) (*ClusterSelectionResult, error) {
	clusterName, err := uiCluster.HandleClusterSelection(ctx, manager, args, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to select cluster: %w", err)
	}
	if clusterName == "" {
		return &ClusterSelectionResult{}, nil
	}

	clusterType, err := manager.DetectClusterType(ctx, clusterName)
	if err != nil {
		return nil, fmt.Errorf("failed to detect cluster type for '%s': %w", clusterName, err)
	}

	return &ClusterSelectionResult{
		Name: clusterName,
		Type: clusterType,
	}, nil
}

// ConfirmClusterDeletion handles cluster deletion confirmation with consistent messaging
func ConfirmClusterDeletion(clusterName string, force bool) (bool, error) {
	if force {
		return true, nil
	}
	
	return common.ConfirmAction(fmt.Sprintf(
		"Are you sure you want to delete cluster '%s'? This action cannot be undone", 
		clusterName,
	))
}

// ShowClusterOperationCancelled displays a consistent cancellation message for cluster operations
func ShowClusterOperationCancelled() {
	pterm.Info.Println("No cluster selected. Operation cancelled.")
}

// FormatClusterSuccessMessage formats a success message with cluster info
func FormatClusterSuccessMessage(clusterName string, clusterType cluster.ClusterType, status string) string {
	return pterm.Sprintf("Cluster: %s\nType: %s\nStatus: %s", 
		pterm.Green(clusterName), 
		pterm.Blue(clusterType), 
		pterm.Green(status))
}

// ClusterError represents errors specific to cluster operations
type ClusterError struct {
	Operation   string
	ClusterName string
	ClusterType cluster.ClusterType
	Err         error
}

func (e *ClusterError) Error() string {
	if e.ClusterName != "" {
		return fmt.Sprintf("%s operation failed for cluster '%s': %v", e.Operation, e.ClusterName, e.Err)
	}
	return fmt.Sprintf("%s operation failed: %v", e.Operation, e.Err)
}

func (e *ClusterError) Unwrap() error {
	return e.Err
}

// CreateClusterError creates a new cluster error
func CreateClusterError(operation, clusterName string, clusterType cluster.ClusterType, err error) *ClusterError {
	return &ClusterError{
		Operation:   operation,
		ClusterName: clusterName,
		ClusterType: clusterType,
		Err:         err,
	}
}

// ClusterCommand defines the interface for cluster command operations
type ClusterCommand interface {
	// Execute runs the command with the given context and arguments
	Execute(ctx context.Context, manager *cluster.Manager, args []string) error
	
	// GetCommand returns the cobra command definition
	GetCommand() *cobra.Command
	
	// ValidateArgs validates command arguments
	ValidateArgs(args []string) error
}

// BaseClusterCommand provides common functionality for cluster commands
type BaseClusterCommand struct {
	Name        string
	Use         string
	Short       string
	Long        string
	Aliases     []string
	MaxArgs     int
	ExactArgs   int
	RequiresCluster bool
}