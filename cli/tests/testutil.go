// Package testutil provides backward compatibility for existing tests
//
// DEPRECATED: Use the new helpers structure instead:
// - helpers/assertions/ for assertion utilities
// - helpers/mocks/ for mock implementations
// - helpers/builders/ for test data builders
// - integration/common/ for integration test utilities
//
// This package will be removed in a future version.
package testutil

import (
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/tests/helpers/assertions"
	"github.com/flamingo/openframe-cli/tests/helpers/builders"
	"github.com/flamingo/openframe-cli/tests/helpers/mocks"
	integrationCommon "github.com/flamingo/openframe-cli/tests/integration/common"
	"github.com/spf13/cobra"

	uiCommon "github.com/flamingo/openframe-cli/internal/common"
)

// Compatibility aliases for backward compatibility

// InitializeTestMode sets up the test environment for UI components
func InitializeTestMode() {
	uiCommon.TestMode = true
}

// Command structure testing
type TestCommandStructure = assertions.CommandStructure

// Command output testing
type AssertCommandOutput = assertions.CommandOutput

func NewAssertCommandOutput(t *testing.T, stdout, stderr string, err error) *assertions.CommandOutput {
	return assertions.NewCommandOutput(t, stdout, stderr, err)
}

// Test scenario types
type TestCLIScenario struct {
	Name     string
	Args     []string
	WantErr  bool
	Contains []string
}

// Flag container creation
func CreateStandardTestFlags() *cluster.FlagContainer {
	return mocks.CreateMockFlagContainer()
}

func CreateTestFlagContainer() *cluster.FlagContainer {
	return mocks.CreateMockFlagContainer()
}

func CreateIntegrationTestFlags() *cluster.FlagContainer {
	return mocks.CreateIntegrationFlagContainer()
}

func SetVerboseMode(flags *cluster.FlagContainer, verbose bool) {
	mocks.SetVerbose(flags, verbose)
}

// Test data builders
func TestClusterConfig(name string) *cluster.ClusterConfig {
	return builders.NewClusterConfig().WithName(name).Build()
}

// Integration test dependencies
func RequireClusterDependencies(t *testing.T) {
	integrationCommon.RequireClusterDependencies(t)
}

// Mock types (deprecated - use testutil/ package instead)
// These types have been removed in favor of simplified mock executor pattern

func NewMockClusterManager() interface{} {
	panic("NewMockClusterManager is deprecated - use testutil.CreateStandardTestFlags() instead")
}

// CLI testing (simplified versions)
func TestCLIScenarios(t *testing.T, cmdFactory func() *cobra.Command, scenarios []TestCLIScenario) {
	// Simplified implementation for backward compatibility
	// TODO: Implement using new structure
}
