package utils

import (
	"strings"
	"sync"
	
	"github.com/flamingo/openframe/internal/cluster"
	"github.com/flamingo/openframe/internal/cluster/models"
	"github.com/flamingo/openframe/internal/shared/errors"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/spf13/cobra"
)

// Global flag container for all cluster commands
var globalFlags *cluster.FlagContainer
var globalFlagsMutex sync.Mutex

// InitGlobalFlags initializes the global flag container if not already set
func InitGlobalFlags() {
	globalFlagsMutex.Lock()
	defer globalFlagsMutex.Unlock()
	
	if globalFlags == nil {
		globalFlags = cluster.NewFlagContainer()
	}
}

// GetCommandService creates a command service for business logic operations
func GetCommandService() *cluster.ClusterService {
	// Use injected executor if available (for testing)
	if globalFlags != nil && globalFlags.Executor != nil {
		return cluster.NewClusterService(globalFlags.Executor)
	}
	
	// Create real executor with current flags
	dryRun := globalFlags != nil && globalFlags.Global != nil && globalFlags.Global.DryRun
	verbose := globalFlags != nil && globalFlags.Global != nil && globalFlags.Global.Verbose
	exec := executor.NewRealCommandExecutor(dryRun, verbose)
	return cluster.NewClusterService(exec)
}

// WrapCommandWithCommonSetup wraps a command function with common CLI setup and error handling
func WrapCommandWithCommonSetup(runFunc func(cmd *cobra.Command, args []string) error) func(cmd *cobra.Command, args []string) error {
	return func(cmd *cobra.Command, args []string) error {
		// Show logo consistently
		ui.ShowLogo()
		
		// Execute the command
		err := runFunc(cmd, args)
		if err != nil {
			// Handle error with proper context - show user-friendly message
			verbose := globalFlags != nil && globalFlags.Global != nil && globalFlags.Global.Verbose
			handler := errors.NewErrorHandler(verbose)
			handler.HandleError(err)
			
			// Return the error for validation errors and "not found" errors to preserve exit codes for automation
			// This ensures scripts and tests can detect failures while users still see friendly messages
			if errors.IsValidationError(err) || 
			   strings.Contains(err.Error(), "not found") ||
			   strings.Contains(err.Error(), "cluster create operation failed") ||
			   strings.Contains(err.Error(), "cluster name") ||  // Cluster name validation errors
			   strings.Contains(err.Error(), "node count must") { // Node count validation errors
				return err
			}
			
			// For other errors, return nil to prevent Cobra double-printing
			return nil
		}
		return err
	}
}

// SyncGlobalFlags synchronizes global flags to all command flags
func SyncGlobalFlags() {
	if globalFlags != nil && globalFlags.Global != nil {
		globalFlags.SyncGlobalFlags()
	}
}

// ValidateGlobalFlags validates global flags
func ValidateGlobalFlags() error {
	if globalFlags != nil && globalFlags.Global != nil {
		return models.ValidateGlobalFlags(globalFlags.Global)
	}
	return nil
}

// GetGlobalFlags returns the current global flags instance
func GetGlobalFlags() *cluster.FlagContainer {
	InitGlobalFlags()
	return globalFlags
}

func SetTestExecutor(exec executor.CommandExecutor) {
	InitGlobalFlags()
	globalFlags.Executor = exec
}

func ResetGlobalFlags() {
	globalFlagsMutex.Lock()
	defer globalFlagsMutex.Unlock()
	globalFlags = nil
}

// Compatibility functions for integration tests
var integrationTestFlags *cluster.FlagContainer

func getOrCreateIntegrationFlags() *cluster.FlagContainer {
	if integrationTestFlags == nil {
		integrationTestFlags = testutil.CreateIntegrationTestFlags()
	}
	return integrationTestFlags
}

func SetVerboseForIntegrationTesting(v bool) {
	flags := getOrCreateIntegrationFlags()
	testutil.SetVerboseMode(flags, v)
}

func ResetTestFlags() {
	integrationTestFlags = nil
	ResetGlobalFlags()
}