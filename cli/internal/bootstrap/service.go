package bootstrap

import (
	"context"
	"fmt"
	"strings"

	chartCmd "github.com/flamingo/openframe/cmd/chart"
	"github.com/flamingo/openframe/internal/cluster/models"
	clusterUtils "github.com/flamingo/openframe/internal/cluster/utils"
	"github.com/flamingo/openframe/internal/shared/ui"
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

	return s.bootstrap(clusterName, verbose)
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
	// Initialize cluster utils
	clusterUtils.InitGlobalFlags()
	
	// Get suppressed service
	service := clusterUtils.GetSuppressedCommandService()
	
	// Build configuration
	config := s.buildClusterConfig(clusterName)
	
	// Execute cluster creation with suppressed UI
	return service.CreateCluster(config)
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

// installChart installs charts using the chart install command
func (s *Service) installChart(clusterName string, verbose bool) error {
	// Create the chart install command
	chartInstallCmd := chartCmd.GetChartCmd()
	
	// Find the install subcommand
	var installCmd *cobra.Command
	for _, cmd := range chartInstallCmd.Commands() {
		if cmd.Use == "install [cluster-name]" {
			installCmd = cmd
			break
		}
	}
	
	if installCmd == nil {
		return fmt.Errorf("chart install command not found")
	}

	// Set verbose flag if needed
	if verbose {
		chartInstallCmd.PersistentFlags().Set("verbose", "true")
	}

	// Always pass the cluster name
	args := []string{clusterName}

	// Execute the chart install command
	return installCmd.RunE(installCmd, args)
}

// installChartSuppressed installs charts with suppressed UI elements
func (s *Service) installChartSuppressed(clusterName string, verbose bool) error {
	// Create the chart install command
	chartInstallCmd := chartCmd.GetChartCmd()
	
	// Find the install subcommand
	var installCmd *cobra.Command
	for _, cmd := range chartInstallCmd.Commands() {
		if cmd.Use == "install [cluster-name]" {
			installCmd = cmd
			break
		}
	}
	
	if installCmd == nil {
		return fmt.Errorf("chart install command not found")
	}

	// Create context with logo suppression
	ctx := ui.WithSuppressedLogo(context.Background())
	installCmd.SetContext(ctx)
	chartInstallCmd.SetContext(ctx)
	
	// Set verbose flag if needed
	if verbose {
		chartInstallCmd.PersistentFlags().Set("verbose", "true")
	}

	// Always pass the cluster name (it should never be empty at this point)
	args := []string{clusterName}

	// Execute the chart install command with suppressed context
	return installCmd.RunE(installCmd, args)
}