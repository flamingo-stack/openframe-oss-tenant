package testutil

import (
	"bytes"
	"context"
	"fmt"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/cluster/domain"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockClusterProvider provides a mock implementation for testing
type MockClusterProvider struct {
	mock.Mock
}

func (m *MockClusterProvider) Create(ctx context.Context, config domain.ClusterConfig) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

func (m *MockClusterProvider) Delete(ctx context.Context, name string, force bool) error {
	args := m.Called(ctx, name, force)
	return args.Error(0)
}

func (m *MockClusterProvider) Start(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

func (m *MockClusterProvider) List(ctx context.Context) ([]domain.ClusterInfo, error) {
	args := m.Called(ctx)
	return args.Get(0).([]domain.ClusterInfo), args.Error(1)
}

func (m *MockClusterProvider) Status(ctx context.Context, name string) (domain.ClusterInfo, error) {
	args := m.Called(ctx, name)
	return args.Get(0).(domain.ClusterInfo), args.Error(1)
}

func (m *MockClusterProvider) DetectType(ctx context.Context, name string) (domain.ClusterType, error) {
	args := m.Called(ctx, name)
	return args.Get(0).(domain.ClusterType), args.Error(1)
}

func (m *MockClusterProvider) GetKubeconfig(ctx context.Context, name string) (string, error) {
	args := m.Called(ctx, name)
	return args.String(0), args.Error(1)
}

// MockClusterManager provides a mock cluster manager for testing
type MockClusterManager struct {
	providers map[domain.ClusterType]domain.ClusterProvider
}

func NewMockClusterManager() *MockClusterManager {
	return &MockClusterManager{
		providers: make(map[domain.ClusterType]domain.ClusterProvider),
	}
}

func (m *MockClusterManager) RegisterProvider(clusterType domain.ClusterType, provider domain.ClusterProvider) {
	m.providers[clusterType] = provider
}

func (m *MockClusterManager) GetProvider(clusterType domain.ClusterType) (domain.ClusterProvider, error) {
	if provider, exists := m.providers[clusterType]; exists {
		return provider, nil
	}
	return nil, fmt.Errorf("provider not found for type: %s", clusterType)
}

// TestCommandStructure provides a standard test for command structure
type TestCommandStructure struct {
	Name         string
	Use          string
	Short        string
	Aliases      []string
	HasRunE      bool
	HasArgs      bool
	LongContains []string
}

// TestCommand runs standard structure tests for a command
func (tcs TestCommandStructure) TestCommand(t *testing.T, cmd *cobra.Command) {
	t.Helper()

	// Basic properties
	assert.Equal(t, tcs.Use, cmd.Use, "Command Use mismatch")
	assert.Equal(t, tcs.Short, cmd.Short, "Command Short description mismatch")
	if len(tcs.Aliases) > 0 {
		assert.Equal(t, tcs.Aliases, cmd.Aliases, "Command aliases mismatch")
	}

	// Structure
	if tcs.HasRunE {
		assert.NotNil(t, cmd.RunE, "Command should have RunE function")
	}
	if tcs.HasArgs {
		assert.NotNil(t, cmd.Args, "Command should have Args validation")
	}

	// Content
	for _, content := range tcs.LongContains {
		assert.Contains(t, cmd.Long, content, "Long description missing expected content: %s", content)
	}

	// Common validations
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
}

// TestCLIScenario represents a CLI test scenario
type TestCLIScenario struct {
	Name     string
	Args     []string
	WantErr  bool
	Contains []string
}

// TestCLIScenarios runs standard CLI tests for a command
func TestCLIScenarios(t *testing.T, cmdFactory func() *cobra.Command, scenarios []TestCLIScenario) {
	t.Helper()

	for _, tc := range scenarios {
		t.Run(tc.Name, func(t *testing.T) {
			cmd := cmdFactory()
			var out bytes.Buffer
			cmd.SetOut(&out)
			cmd.SetErr(&out)
			cmd.SetArgs(tc.Args)

			err := cmd.Execute()

			if tc.WantErr {
				assert.Error(t, err, "Expected error but got none")
			} else {
				assert.NoError(t, err, "Unexpected error: %v", err)
			}

			output := out.String()
			for _, contains := range tc.Contains {
				assert.Contains(t, output, contains, "Output missing expected content: %s", contains)
			}
		})
	}
}

// CreateTestFlagContainer creates a flag container for unit testing with mocks
func CreateTestFlagContainer() *cluster.FlagContainer {
	return CreateStandardTestFlags()
}

// CreateIntegrationTestFlagContainer creates a flag container for integration tests
func CreateIntegrationTestFlagContainer() *cluster.FlagContainer {
	return CreateIntegrationTestFlags()
}

// Note: ResetTestState is implemented in each package that uses these utilities
// since it needs to reset package-specific global variables
