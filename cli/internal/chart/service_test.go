package chart

import (
	"context"
	"testing"

	"github.com/flamingo/openframe/internal/chart/domain"
	clusterDomain "github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// MockClusterService implements cluster service interface for testing
type MockClusterService struct {
	clusters []clusterDomain.ClusterInfo
	listErr  error
}

func (m *MockClusterService) ListClusters() ([]clusterDomain.ClusterInfo, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.clusters, nil
}

// MockExecutor for chart service tests
type MockExecutor struct {
	commands [][]string
	results  map[string]*executor.CommandResult
	errors   map[string]error
}

func NewMockExecutor() *MockExecutor {
	return &MockExecutor{
		commands: make([][]string, 0),
		results:  make(map[string]*executor.CommandResult),
		errors:   make(map[string]error),
	}
}

func (m *MockExecutor) Execute(ctx context.Context, name string, args ...string) (*executor.CommandResult, error) {
	command := append([]string{name}, args...)
	m.commands = append(m.commands, command)

	commandStr := name
	for _, arg := range args {
		commandStr += " " + arg
	}

	if err, exists := m.errors[commandStr]; exists {
		return nil, err
	}

	if result, exists := m.results[commandStr]; exists {
		return result, nil
	}

	return &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "",
		Stderr:   "",
	}, nil
}

func (m *MockExecutor) ExecuteWithOptions(ctx context.Context, options executor.ExecuteOptions) (*executor.CommandResult, error) {
	return m.Execute(ctx, options.Command, options.Args...)
}

func (m *MockExecutor) SetResult(command string, result *executor.CommandResult) {
	m.results[command] = result
}

func (m *MockExecutor) SetError(command string, err error) {
	m.errors[command] = err
}

func TestChartService_validateClusterExists(t *testing.T) {
	tests := []struct {
		name          string
		clusterName   string
		clusters      []clusterDomain.ClusterInfo
		listErr       error
		expectError   bool
		expectedError string
	}{
		{
			name:        "no clusters available",
			clusterName: "test",
			clusters:    []clusterDomain.ClusterInfo{},
			expectError: true,
		},
		{
			name:        "single cluster, no name specified",
			clusterName: "",
			clusters: []clusterDomain.ClusterInfo{
				{Name: "default-cluster"},
			},
			expectError: false,
		},
		{
			name:        "multiple clusters, no name specified",
			clusterName: "",
			clusters: []clusterDomain.ClusterInfo{
				{Name: "cluster1"},
				{Name: "cluster2"},
			},
			expectError:   true,
			expectedError: "cluster name required",
		},
		{
			name:        "specific cluster exists",
			clusterName: "test-cluster",
			clusters: []clusterDomain.ClusterInfo{
				{Name: "test-cluster"},
				{Name: "other-cluster"},
			},
			expectError: false,
		},
		{
			name:        "specific cluster not found",
			clusterName: "missing-cluster",
			clusters: []clusterDomain.ClusterInfo{
				{Name: "test-cluster"},
			},
			expectError:   true,
			expectedError: "cluster 'missing-cluster' not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create mock cluster service
			mockClusterService := &MockClusterService{
				clusters: tt.clusters,
				listErr:  tt.listErr,
			}

			// Create service with mock
			mockExec := NewMockExecutor()
			service := NewChartServiceWithClusterService(mockExec, mockClusterService)

			err := service.validateClusterExists(tt.clusterName)

			if tt.expectError {
				assert.Error(t, err)
				if tt.expectedError != "" {
					assert.Contains(t, err.Error(), tt.expectedError)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestChartService_InstallCharts_DryRun(t *testing.T) {
	// Create mock services
	mockExec := NewMockExecutor()
	mockClusterService := &MockClusterService{
		clusters: []clusterDomain.ClusterInfo{
			{Name: "test-cluster"},
		},
	}

	// Mock helm commands to succeed
	mockExec.SetResult("helm version --short", &executor.CommandResult{ExitCode: 0})

	service := NewChartServiceWithClusterService(mockExec, mockClusterService)

	config := domain.ChartInstallConfig{
		ClusterName: "test-cluster",
		DryRun:      true,
	}

	err := service.InstallCharts(config)
	assert.NoError(t, err)

	// In dry run mode, actual helm install commands should not be executed
	commands := mockExec.commands
	require.GreaterOrEqual(t, len(commands), 1)

	// Should have checked helm version
	assert.Equal(t, []string{"helm", "version", "--short"}, commands[0])
}

func TestChartService_InstallCharts_OpenFrameChart(t *testing.T) {
	// Create mock services
	mockExec := NewMockExecutor()
	mockClusterService := &MockClusterService{
		clusters: []clusterDomain.ClusterInfo{
			{Name: "test-cluster"},
		},
	}

	// Mock helm commands
	mockExec.SetResult("helm version --short", &executor.CommandResult{ExitCode: 0})

	service := NewChartServiceWithClusterService(mockExec, mockClusterService)

	config := domain.ChartInstallConfig{
		ClusterName: "test-cluster",
		DryRun:      true,
	}

	err := service.InstallCharts(config)
	assert.NoError(t, err)

	// Should have helm version check
	commands := mockExec.commands
	require.GreaterOrEqual(t, len(commands), 1)
	assert.Equal(t, []string{"helm", "version", "--short"}, commands[0])
}

func TestChartService_InstallCharts_HelmNotFound(t *testing.T) {
	// Create mock services
	mockExec := NewMockExecutor()
	mockClusterService := &MockClusterService{
		clusters: []clusterDomain.ClusterInfo{
			{Name: "test-cluster"},
		},
	}

	// Mock helm not found
	mockExec.SetError("helm version --short", assert.AnError)

	service := NewChartServiceWithClusterService(mockExec, mockClusterService)

	config := domain.ChartInstallConfig{
		ClusterName: "test-cluster",
	}

	err := service.InstallCharts(config)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Helm is required but not found")
}
