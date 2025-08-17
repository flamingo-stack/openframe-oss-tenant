package testutil

import (
	"context"
	"time"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/common/utils"
	uiCommon "github.com/flamingo/openframe-cli/internal/common"
)

// InitializeTestMode sets up the test environment for UI components
func InitializeTestMode() {
	uiCommon.TestMode = true
}

// TestMockExecutor implements utils.CommandExecutor for testing
type TestMockExecutor struct {
	responses map[string]*utils.CommandResult
}

// NewTestMockExecutor creates a new test mock executor
func NewTestMockExecutor() *TestMockExecutor {
	return &TestMockExecutor{
		responses: make(map[string]*utils.CommandResult),
	}
}

// SetResponse sets a response for a command pattern
func (m *TestMockExecutor) SetResponse(pattern string, result *utils.CommandResult) {
	m.responses[pattern] = result
}

// Execute implements utils.CommandExecutor.Execute
func (m *TestMockExecutor) Execute(ctx context.Context, name string, args ...string) (*utils.CommandResult, error) {
	options := utils.ExecuteOptions{
		Command: name,
		Args:    args,
	}
	return m.ExecuteWithOptions(ctx, options)
}

// ExecuteWithOptions implements utils.CommandExecutor.ExecuteWithOptions
func (m *TestMockExecutor) ExecuteWithOptions(ctx context.Context, options utils.ExecuteOptions) (*utils.CommandResult, error) {
	fullCommand := options.Command
	if len(options.Args) > 0 {
		for _, arg := range options.Args {
			fullCommand += " " + arg
		}
	}
	
	// Look for matching response
	for pattern, response := range m.responses {
		if contains(fullCommand, pattern) {
			result := &utils.CommandResult{
				Stdout:   response.Stdout,
				Stderr:   response.Stderr,
				ExitCode: response.ExitCode,
				Duration: 100 * time.Millisecond,
			}
			return result, nil
		}
	}
	
	// Default response
	return &utils.CommandResult{
		Stdout:   "",
		Stderr:   "",
		ExitCode: 0,
		Duration: 100 * time.Millisecond,
	}, nil
}

// contains checks if s contains substr (simple implementation)
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(substr) <= len(s) && s[:len(substr)] == substr) ||
		(len(substr) <= len(s) && s[len(s)-len(substr):] == substr) ||
		(len(substr) < len(s) && findInString(s, substr)))
}

func findInString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}


// CreateStandardTestFlags creates a standard flag container for unit tests
// This uses mock dependencies to avoid external requirements
func CreateStandardTestFlags() *cluster.FlagContainer {
	flags := cluster.NewFlagContainer()
	
	// Create mock executor with proper responses for k3d commands
	mockExecutor := NewTestMockExecutor()
	
	// Configure mock responses for common k3d commands
	mockExecutor.SetResponse("k3d cluster list", &utils.CommandResult{
		ExitCode: 0,
		Stdout:   "[]", // Empty JSON array for no clusters
	})
	
	mockExecutor.SetResponse("k3d cluster get", &utils.CommandResult{
		ExitCode: 1,
		Stderr:   "cluster not found",
	})
	
	// Inject mock executor for unit tests
	flags.Executor = mockExecutor
	
	// Inject mock K3D cluster manager with test executor
	mockManager := cluster.NewK3dManager(mockExecutor, false)
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

