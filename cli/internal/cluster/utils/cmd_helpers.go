package utils

import (
	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/cluster/domain"
	"github.com/flamingo/openframe-cli/internal/cluster/services"
	"github.com/flamingo/openframe-cli/internal/common"
	"github.com/flamingo/openframe-cli/internal/common/errors"
	commonUtils "github.com/flamingo/openframe-cli/internal/common/utils"
	"github.com/flamingo/openframe-cli/tests/testutil"
	"github.com/spf13/cobra"
)

// Global flag container for all cluster commands
var globalFlags *cluster.FlagContainer

// InitGlobalFlags initializes the global flag container if not already set
func InitGlobalFlags() {
	if globalFlags == nil {
		globalFlags = cluster.NewFlagContainer()
	}
}

// GetCommandService creates a command service for business logic operations
func GetCommandService() *services.ClusterCommandService {
	// Use injected executor if available (for testing)
	if globalFlags != nil && globalFlags.Executor != nil {
		return services.NewClusterCommandService(globalFlags.Executor)
	}
	
	// Create real executor with current flags
	dryRun := globalFlags != nil && globalFlags.Global != nil && globalFlags.Global.DryRun
	verbose := globalFlags != nil && globalFlags.Global != nil && globalFlags.Global.Verbose
	executor := commonUtils.NewRealCommandExecutor(dryRun, verbose)
	return services.NewClusterCommandService(executor)
}

// WrapCommandWithCommonSetup wraps a command function with common CLI setup and error handling
func WrapCommandWithCommonSetup(runFunc func(cmd *cobra.Command, args []string) error) func(cmd *cobra.Command, args []string) error {
	return func(cmd *cobra.Command, args []string) error {
		// Show logo consistently
		common.ShowLogo()
		
		// Execute the command
		err := runFunc(cmd, args)
		if err != nil {
			// Handle error with proper context
			verbose := globalFlags != nil && globalFlags.Global != nil && globalFlags.Global.Verbose
			handler := errors.NewErrorHandler(verbose)
			handler.HandleError(err)
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
		return domain.ValidateGlobalFlags(globalFlags.Global)
	}
	return nil
}

// GetGlobalFlags returns the current global flags instance
func GetGlobalFlags() *cluster.FlagContainer {
	InitGlobalFlags()
	return globalFlags
}

func SetTestExecutor(executor commonUtils.CommandExecutor) {
	InitGlobalFlags()
	globalFlags.Executor = executor
}

func ResetGlobalFlags() {
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