package bootstrap

import (
	"fmt"
	"strings"

	chartServices "github.com/flamingo-stack/openframe/openframe/internal/chart/services"
	utilTypes "github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	sharedErrors "github.com/flamingo-stack/openframe/openframe/internal/shared/errors"
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
	// Get verbose flag - first check local flag, then root command
	verbose := false
	if localVerbose, err := cmd.Flags().GetBool("verbose"); err == nil {
		verbose = localVerbose
	}
	if !verbose {
		if rootVerbose, err := cmd.Root().PersistentFlags().GetBool("verbose"); err == nil {
			verbose = rootVerbose
		}
	}

	// Get deployment mode flags
	deploymentMode, err := cmd.Flags().GetString("deployment-mode")
	if err != nil {
		deploymentMode = ""
	}

	nonInteractive, err := cmd.Flags().GetBool("non-interactive")
	if err != nil {
		nonInteractive = false
	}

	// Validate deployment mode
	if deploymentMode != "" {
		validModes := []string{"oss-tenant", "saas-tenant", "saas-shared"}
		isValid := false
		for _, mode := range validModes {
			if deploymentMode == mode {
				isValid = true
				break
			}
		}
		if !isValid {
			return fmt.Errorf("invalid deployment mode: %s. Valid options: oss-tenant, saas-tenant, saas-shared", deploymentMode)
		}
	}

	// Validate non-interactive requires deployment mode
	if nonInteractive && deploymentMode == "" {
		return fmt.Errorf("--deployment-mode is required when using --non-interactive")
	}

	// Get cluster name from args if provided
	var clusterName string
	if len(args) > 0 {
		clusterName = strings.TrimSpace(args[0])
	}

	err = s.bootstrap(clusterName, deploymentMode, nonInteractive, verbose)
	if err != nil {
		// Use shared error handler for consistent error display (same as chart install)
		return sharedErrors.HandleGlobalError(err, verbose)
	}
	return nil
}

// bootstrap executes cluster create followed by chart install
func (s *Service) bootstrap(clusterName, deploymentMode string, nonInteractive, verbose bool) error {
	// Normalize cluster name (use default if empty)
	config := s.buildClusterConfig(clusterName)
	actualClusterName := config.Name

	// Step 1: Create cluster with suppressed UI
	if err := s.createClusterSuppressed(actualClusterName, verbose, nonInteractive); err != nil {
		return fmt.Errorf("failed to create cluster: %w", err)
	}

	// Add spacing between commands
	fmt.Println()
	fmt.Println()

	// Step 2: Install charts with deployment mode flags on the created cluster
	if err := s.installChartWithMode(actualClusterName, deploymentMode, nonInteractive, verbose); err != nil {
		return fmt.Errorf("failed to install charts: %w", err)
	}

	return nil
}

// createClusterSuppressed creates a cluster with suppressed UI elements
func (s *Service) createClusterSuppressed(clusterName string, verbose bool, nonInteractive bool) error {
	// Use the wrapper function that includes prerequisite checks
	return cluster.CreateClusterWithPrerequisitesNonInteractive(clusterName, verbose, nonInteractive)
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

// installChartWithMode installs charts with deployment mode flags
func (s *Service) installChartWithMode(clusterName, deploymentMode string, nonInteractive, verbose bool) error {
	// Use the chart installation function with deployment mode flags
	return chartServices.InstallChartsWithConfig(utilTypes.InstallationRequest{
		Args:           []string{clusterName},
		Force:          false,
		DryRun:         false,
		Verbose:        verbose,
		GitHubRepo:     "https://github.com/flamingo-stack/openframe-oss-tenant", // Default repository
		GitHubBranch:   "main",                                                   // Default branch
		CertDir:        "",                                                       // Auto-detected
		DeploymentMode: deploymentMode,
		NonInteractive: nonInteractive,
	})
}
