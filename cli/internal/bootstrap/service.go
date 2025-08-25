package bootstrap

import (
	"fmt"
	"strings"

	chartServices "github.com/flamingo/openframe/internal/chart/services"
	"github.com/flamingo/openframe/internal/cluster"
	"github.com/flamingo/openframe/internal/cluster/models"
	sharedErrors "github.com/flamingo/openframe/internal/shared/errors"
	"github.com/spf13/cobra"
)

// Service provides bootstrap functionality
type Service struct{}

// NewService creates a new bootstrap service
func NewService() *Service {
	return &Service{}
}

// Execute handles the bootstrap command execution
func (s *Service) Execute(cmd *cobra.Command, args []string) error {
	// Get verbose flag from root command
	verbose, err := cmd.Root().PersistentFlags().GetBool("verbose")
	if err != nil {
		verbose = false
	}

	// Get cluster name from args if provided
	var clusterName string
	if len(args) > 0 {
		clusterName = strings.TrimSpace(args[0])
	}

	err = s.bootstrap(clusterName, verbose)
	if err != nil {
		// Use shared error handler for consistent error display (same as chart install)
		return sharedErrors.HandleGlobalError(err, verbose)
	}
	return nil
}

// bootstrap executes cluster create followed by chart install
func (s *Service) bootstrap(clusterName string, verbose bool) error {
	// Normalize cluster name (use default if empty)
	config := s.buildClusterConfig(clusterName)
	actualClusterName := config.Name
	
	// Step 1: Create cluster with suppressed UI
	if err := s.createClusterSuppressed(actualClusterName, verbose); err != nil {
		return fmt.Errorf("failed to create cluster: %w", err)
	}

	// Add spacing between commands
	fmt.Println()
	fmt.Println()

	// Step 2: Install charts with suppressed UI on the created cluster
	if err := s.installChartSuppressed(actualClusterName, verbose); err != nil {
		return fmt.Errorf("failed to install charts: %w", err)
	}

	return nil
}


// createClusterSuppressed creates a cluster with suppressed UI elements
func (s *Service) createClusterSuppressed(clusterName string, verbose bool) error {
	// Use the wrapper function that includes prerequisite checks
	return cluster.CreateClusterWithPrerequisites(clusterName, verbose)
}

// buildClusterConfig builds a cluster configuration from the cluster name
func (s *Service) buildClusterConfig(clusterName string) models.ClusterConfig {
	if clusterName == "" {
		clusterName = "openframe-dev" // default name
	}
	
	return models.ClusterConfig{
		Name:       clusterName,
		Type:       models.ClusterTypeK3d,
		K8sVersion: "",
		NodeCount:  3,
	}
}

// installChartSuppressed installs charts with suppressed UI elements
func (s *Service) installChartSuppressed(clusterName string, verbose bool) error {
	// Use the common chart installation function with defaults
	return chartServices.InstallChartsWithDefaults([]string{clusterName}, false, false, verbose)
}