package scaffold

import (
	"context"
	"testing"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockExecutor for testing
type MockExecutor struct {
	mock.Mock
}

func (m *MockExecutor) Execute(ctx context.Context, command string, args ...string) (*executor.CommandResult, error) {
	mockArgs := make([]interface{}, len(args)+2)
	mockArgs[0] = ctx
	mockArgs[1] = command
	for i, arg := range args {
		mockArgs[i+2] = arg
	}
	
	callArgs := m.Called(mockArgs...)
	return callArgs.Get(0).(*executor.CommandResult), callArgs.Error(1)
}

func (m *MockExecutor) ExecuteWithOptions(ctx context.Context, options executor.ExecuteOptions) (*executor.CommandResult, error) {
	callArgs := m.Called(ctx, options)
	return callArgs.Get(0).(*executor.CommandResult), callArgs.Error(1)
}

func (m *MockExecutor) SetDryRun(dryRun bool) {
	m.Called(dryRun)
}

func (m *MockExecutor) SetVerbose(verbose bool) {
	m.Called(verbose)
}

func TestNewService(t *testing.T) {
	exec := &MockExecutor{}
	service := NewService(exec, true)
	
	assert.NotNil(t, service)
	assert.Equal(t, exec, service.executor)
	assert.True(t, service.verbose)
	assert.False(t, service.isRunning)
}

func TestService_GetClusterName(t *testing.T) {
	service := NewService(&MockExecutor{}, false)
	
	tests := []struct {
		name     string
		args     []string
		expected string
	}{
		{
			name:     "with cluster name provided",
			args:     []string{"my-cluster"},
			expected: "my-cluster",
		},
		{
			name:     "no cluster name - use default",
			args:     []string{},
			expected: "openframe-dev",
		},
		{
			name:     "multiple args - use first",
			args:     []string{"cluster1", "cluster2"},
			expected: "cluster1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getClusterName(tt.args)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestService_BuildSkaffoldArgs(t *testing.T) {
	service := NewService(&MockExecutor{}, true)
	
	tests := []struct {
		name     string
		flags    *models.ScaffoldFlags
		expected []string
	}{
		{
			name: "default flags",
			flags: &models.ScaffoldFlags{
				Namespace: "",
			},
			expected: []string{"dev", "--port-forward", "--verbosity", "info"},
		},
		{
			name: "with namespace",
			flags: &models.ScaffoldFlags{
				Namespace: "my-namespace",
			},
			expected: []string{"dev", "--port-forward", "--namespace", "my-namespace", "--verbosity", "info"},
		},
		{
			name: "minimal flags",
			flags: &models.ScaffoldFlags{
				Namespace: "",
			},
			expected: []string{"dev", "--port-forward", "--verbosity", "info"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.buildSkaffoldArgs(tt.flags)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestService_BuildSkaffoldArgs_NonVerbose(t *testing.T) {
	service := NewService(&MockExecutor{}, false)
	
	flags := &models.ScaffoldFlags{
		Namespace: "",
	}
	
	result := service.buildSkaffoldArgs(flags)
	expected := []string{"dev", "--port-forward"}
	
	assert.Equal(t, expected, result)
}

func TestService_IsRunning(t *testing.T) {
	service := NewService(&MockExecutor{}, false)
	
	// Initially not running
	assert.False(t, service.IsRunning())
	
	// Set running
	service.isRunning = true
	assert.True(t, service.IsRunning())
	
	// Set not running
	service.isRunning = false
	assert.False(t, service.IsRunning())
}

func TestService_Stop(t *testing.T) {
	service := NewService(&MockExecutor{}, false)
	
	// Test stopping when not running
	err := service.Stop()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no active Skaffold session")
	
	// Test stopping when running
	service.isRunning = true
	err = service.Stop()
	assert.NoError(t, err)
	assert.False(t, service.isRunning)
}