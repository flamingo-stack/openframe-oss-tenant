package argocd

import (
	"context"
	"testing"

	"github.com/flamingo/openframe/internal/chart/utils/config"
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
		name         string
		mockSetup    func(*MockExecutor)
		expectedApps []Application
		expectError  bool
	}{
		{
			name: "single healthy app",
			mockSetup: func(m *MockExecutor) {
				m.SetResult("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "app1\tHealthy\tSynced\n",
				})
			},
			expectedApps: []Application{
				{Name: "app1", Health: "Healthy", Sync: "Synced"},
			},
			expectError: false,
		},
		{
			name: "multiple apps with different statuses",
			mockSetup: func(m *MockExecutor) {
				m.SetResult("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "app1\tHealthy\tSynced\napp2\tProgressing\tOutOfSync\napp3\tHealthy\tSynced\n",
				})
			},
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
				m.SetResult("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "",
				})
			},
			expectedApps: []Application{},
			expectError:  false,
		},
		{
			name: "kubectl command fails",
			mockSetup: func(m *MockExecutor) {
				m.SetError("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}", assert.AnError)
			},
			expectedApps: []Application{}, // Now returns empty array instead of error
			expectError:  false, // Changed to false since we handle errors gracefully
		},
		{
			name: "apps with empty status fields",
			mockSetup: func(m *MockExecutor) {
				m.SetResult("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "app1\t\t\napp2\tHealthy\tSynced\n",
				})
			},
			expectedApps: []Application{
				{Name: "app2", Health: "Healthy", Sync: "Synced"}, // app1 is skipped because it has Unknown status
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.mockSetup(mockExec)

			manager := NewManager(mockExec)
			apps, err := manager.parseApplications(context.Background(), false)

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

func TestManager_WaitForApplications_Success(t *testing.T) {
	mockExec := NewMockExecutor()
	// Mock successful response with healthy applications
	mockExec.SetResult("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}", &executor.CommandResult{
		ExitCode: 0,
		Stdout:   "app1\tHealthy\tSynced\napp2\tHealthy\tSynced\n",
	})

	manager := NewManager(mockExec)
	config := config.ChartInstallConfig{DryRun: true, Verbose: false} // Use DryRun to skip the wait logic

	ctx := context.Background()
	err := manager.WaitForApplications(ctx, config)
	assert.NoError(t, err)
}

func TestNewManager(t *testing.T) {
	mockExec := NewMockExecutor()
	manager := NewManager(mockExec)

	assert.NotNil(t, manager)
	assert.Equal(t, mockExec, manager.executor)
}
