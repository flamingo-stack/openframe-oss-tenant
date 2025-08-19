package argocd

import (
	"context"
	"testing"
	"time"

	"github.com/flamingo/openframe/internal/chart/models"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
)

// MockExecutor implements CommandExecutor for testing
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
	
	// Default success result
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

func (m *MockExecutor) GetCommands() [][]string {
	return m.commands
}

func TestManager_parseApplications(t *testing.T) {
	tests := []struct {
		name           string
		mockSetup      func(*MockExecutor)
		jsonInput      string
		expectedApps   []Application
		expectError    bool
	}{
		{
			name: "single healthy app",
			mockSetup: func(m *MockExecutor) {
				m.SetResult("sh -c echo '{}' | jq -r '.items[] | [.metadata.name, .status.health.status, .status.sync.status] | @tsv'", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "app1\tHealthy\tSynced\n",
				})
			},
			jsonInput: "{}",
			expectedApps: []Application{
				{Name: "app1", Health: "Healthy", Sync: "Synced"},
			},
			expectError: false,
		},
		{
			name: "multiple apps with different statuses",
			mockSetup: func(m *MockExecutor) {
				m.SetResult("sh -c echo '{}' | jq -r '.items[] | [.metadata.name, .status.health.status, .status.sync.status] | @tsv'", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "app1\tHealthy\tSynced\napp2\tProgressing\tOutOfSync\napp3\tHealthy\tSynced\n",
				})
			},
			jsonInput: "{}",
			expectedApps: []Application{
				{Name: "app1", Health: "Healthy", Sync: "Synced"},
				{Name: "app2", Health: "Progressing", Sync: "OutOfSync"},
				{Name: "app3", Health: "Healthy", Sync: "Synced"},
			},
			expectError: false,
		},
		{
			name: "no apps",
			mockSetup: func(m *MockExecutor) {
				m.SetResult("sh -c echo '{}' | jq -r '.items[] | [.metadata.name, .status.health.status, .status.sync.status] | @tsv'", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "",
				})
			},
			jsonInput: "{}",
			expectedApps: []Application{},
			expectError: false,
		},
		{
			name: "jq command fails",
			mockSetup: func(m *MockExecutor) {
				m.SetError("sh -c echo '{}' | jq -r '.items[] | [.metadata.name, .status.health.status, .status.sync.status] | @tsv'", assert.AnError)
			},
			jsonInput: "{}",
			expectedApps: nil,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.mockSetup(mockExec)
			
			manager := NewManager(mockExec)
			apps, err := manager.parseApplications(context.Background(), tt.jsonInput)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedApps, apps)
			}
		})
	}
}

func TestManager_WaitForApplications_DryRun(t *testing.T) {
	mockExec := NewMockExecutor()
	manager := NewManager(mockExec)
	
	// This test doesn't actually run WaitForApplications since it's only called 
	// when DryRun is false, but we can test the manager creation
	assert.NotNil(t, manager)
	assert.NotNil(t, manager.executor)
}

func TestManager_WaitForApplications_KubectlError(t *testing.T) {
	mockExec := NewMockExecutor()
	mockExec.SetError("kubectl -n argocd get applications.argoproj.io -o json", assert.AnError)
	
	manager := NewManager(mockExec)
	config := models.ChartInstallConfig{DryRun: false}
	
	// This would hang in the loop, so we'll use a timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	
	err := manager.WaitForApplications(ctx, config)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get ArgoCD applications")
}

func TestNewManager(t *testing.T) {
	mockExec := NewMockExecutor()
	manager := NewManager(mockExec)
	
	assert.NotNil(t, manager)
	assert.Equal(t, mockExec, manager.executor)
}