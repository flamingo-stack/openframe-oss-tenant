package mocks

import (
	"context"
	"time"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/common/utils"
)

// MockExecutor implements utils.CommandExecutor for testing
type MockExecutor struct {
	responses map[string]*utils.CommandResult
}

// NewMockExecutor creates a new mock executor
func NewMockExecutor() *MockExecutor {
	return &MockExecutor{
		responses: make(map[string]*utils.CommandResult),
	}
}

// SetResponse sets a response for a command pattern
func (m *MockExecutor) SetResponse(pattern string, result *utils.CommandResult) {
	m.responses[pattern] = result
}

// Execute implements utils.CommandExecutor.Execute
func (m *MockExecutor) Execute(ctx context.Context, name string, args ...string) (*utils.CommandResult, error) {
	options := utils.ExecuteOptions{
		Command: name,
		Args:    args,
	}
	return m.ExecuteWithOptions(ctx, options)
}

// ExecuteWithOptions implements utils.CommandExecutor.ExecuteWithOptions
func (m *MockExecutor) ExecuteWithOptions(ctx context.Context, options utils.ExecuteOptions) (*utils.CommandResult, error) {
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

// CreateMockFlagContainer creates a flag container with mock dependencies for testing
func CreateMockFlagContainer() *cluster.FlagContainer {
	flags := cluster.NewFlagContainer()
	
	// Create mock executor with proper responses for k3d commands
	mockExecutor := NewMockExecutor()
	
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

// CreateIntegrationFlagContainer creates a flag container for integration tests with real dependencies
func CreateIntegrationFlagContainer() *cluster.FlagContainer {
	return cluster.NewFlagContainer() // No TestManager injection - uses real manager
}

// SetVerbose sets verbose flag for testing
func SetVerbose(flags *cluster.FlagContainer, verbose bool) {
	flags.Global.Verbose = verbose
}
