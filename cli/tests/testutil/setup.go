package testutil

import (
	"github.com/flamingo-stack/openframe/openframe/internal/cluster"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/providers/k3d"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
)

// InitializeTestMode sets up the test environment for UI components
func InitializeTestMode() {
	ui.TestMode = true
}

// NewTestMockExecutor creates a new test mock executor using the standard mock
func NewTestMockExecutor() *executor.MockCommandExecutor {
	return executor.NewMockCommandExecutor()
}

// CreateStandardTestFlags creates a standard flag container for unit tests
// This uses mock dependencies to avoid external requirements
func CreateStandardTestFlags() *cluster.FlagContainer {
	flags := cluster.NewFlagContainer()

	// Create mock executor with proper responses for k3d commands
	mockExecutor := NewTestMockExecutor()

	// Configure mock responses for common k3d commands
	mockExecutor.SetResponse("k3d cluster list", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "[]", // Empty JSON array for no clusters
	})

	mockExecutor.SetResponse("k3d cluster get", &executor.CommandResult{
		ExitCode: 1,
		Stderr:   "cluster not found",
	})

	// Inject mock executor for unit tests
	flags.Executor = mockExecutor

	// Inject mock K3D cluster manager with test executor
	mockManager := k3d.NewK3dManager(mockExecutor, false)
	flags.TestManager = mockManager

	return flags
}

// CreateIntegrationTestFlags creates a flag container for integration tests
// This uses real dependencies for actual testing
func CreateIntegrationTestFlags() *cluster.FlagContainer {
	return cluster.NewFlagContainer() // No TestManager injection - uses real manager
}

// SetVerboseMode sets verbose flag for testing
func SetVerboseMode(flags *cluster.FlagContainer, verbose bool) {
	flags.Global.Verbose = verbose
}
