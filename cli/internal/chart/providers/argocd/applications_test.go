package argocd

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
)

func TestNewManager(t *testing.T) {
	mockExec := executor.NewMockCommandExecutor()
	manager := NewManager(mockExec)

	assert.NotNil(t, manager)
	assert.Equal(t, mockExec, manager.executor)
}

func TestGetTotalExpectedApplications(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(*executor.MockCommandExecutor)
		expectedCount int
		verbose       bool
	}{
		{
			name: "successfully counts all applications",
			setupMock: func(m *executor.MockCommandExecutor) {
				m.SetResponse("kubectl -n argocd get applications.argoproj.io", &executor.CommandResult{
					Stdout: "app1\napp2\napp3\napp4\napp5\n",
				})
			},
			expectedCount: 5,
		},
		{
			name: "falls back to helm values counting",
			setupMock: func(m *executor.MockCommandExecutor) {
				// App-of-apps specific calls return empty
				m.SetResponse("kubectl -n argocd get applications.argoproj.io app-of-apps", &executor.CommandResult{
					Stdout: "",
				})

				// ArgoCD server pod call returns empty (no server pod found)
				m.SetResponse("kubectl -n argocd get pod -l app.kubernetes.io/name=argocd-server", &executor.CommandResult{
					Stdout: "",
				})

				// General kubectl call returns empty
				m.SetResponse("kubectl -n argocd get applications.argoproj.io", &executor.CommandResult{
					Stdout: "",
				})

				// Helm values call returns applications
				m.SetResponse("helm get values app-of-apps", &executor.CommandResult{
					Stdout: `applications:
  - name: app1
    repoURL: https://github.com/example/repo1
    targetRevision: main
  - name: app2
    repoURL: https://github.com/example/repo2
    targetRevision: main
  - name: app3
    repoURL: https://github.com/example/repo3
    targetRevision: main`,
				})
			},
			expectedCount: 3,
		},
		{
			name: "estimates from ApplicationSets",
			setupMock: func(m *executor.MockCommandExecutor) {
				// App-of-apps specific calls return empty
				m.SetResponse("kubectl -n argocd get applications.argoproj.io app-of-apps", &executor.CommandResult{
					Stdout: "",
				})

				// ArgoCD server pod call returns empty
				m.SetResponse("kubectl -n argocd get pod", &executor.CommandResult{
					Stdout: "",
				})

				// General kubectl call returns empty
				m.SetResponse("kubectl -n argocd get applications.argoproj.io", &executor.CommandResult{
					Stdout: "",
				})

				// Helm values call returns empty
				m.SetResponse("helm get values", &executor.CommandResult{
					Stdout: "",
				})

				// ApplicationSets call
				m.SetResponse("applicationsets.argoproj.io", &executor.CommandResult{
					Stdout: "appset1\nappset2\n",
				})
			},
			expectedCount: 14, // 2 appsets * 7 estimated apps each
		},
		{
			name: "returns 0 when no method succeeds",
			setupMock: func(m *executor.MockCommandExecutor) {
				m.SetDefaultResult(&executor.CommandResult{
					Stdout: "",
				})
			},
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := executor.NewMockCommandExecutor()
			tt.setupMock(mockExec)

			manager := NewManager(mockExec)
			config := config.ChartInstallConfig{
				Verbose: tt.verbose,
			}

			count := manager.getTotalExpectedApplications(context.Background(), config)
			assert.Equal(t, tt.expectedCount, count)
		})
	}
}

func TestParseApplications(t *testing.T) {
	tests := []struct {
		name         string
		setupMock    func(*executor.MockCommandExecutor)
		expectedApps []Application
		expectError  bool
	}{
		{
			name: "successfully parses healthy applications",
			setupMock: func(m *executor.MockCommandExecutor) {
				// First query: get application names
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={.items[*].metadata.name}", &executor.CommandResult{
					Stdout: "app1 app2 app3",
				})
				// Second query: get full status
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}", &executor.CommandResult{
					Stdout: "app1\tHealthy\tSynced\napp2\tProgressing\tSynced\napp3\tHealthy\tOutOfSync\n",
				})
			},
			expectedApps: []Application{
				{Name: "app1", Health: "Healthy", Sync: "Synced"},
				{Name: "app2", Health: "Progressing", Sync: "Synced"},
				{Name: "app3", Health: "Healthy", Sync: "OutOfSync"},
			},
		},
		{
			name: "handles applications with unknown status",
			setupMock: func(m *executor.MockCommandExecutor) {
				// First query: get application names
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={.items[*].metadata.name}", &executor.CommandResult{
					Stdout: "app1 app2 app3",
				})
				// Second query: get full status
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}", &executor.CommandResult{
					Stdout: "app1\tHealthy\tSynced\napp2\t\t\napp3\tUnknown\tUnknown\n",
				})
			},
			expectedApps: []Application{
				{Name: "app1", Health: "Healthy", Sync: "Synced"},
				{Name: "app2", Health: "Unknown", Sync: "Unknown"},
				{Name: "app3", Health: "Unknown", Sync: "Unknown"},
			},
		},
		{
			name: "handles applications without status fields (newly created)",
			setupMock: func(m *executor.MockCommandExecutor) {
				// First query succeeds: applications exist
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={.items[*].metadata.name}", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "app1 app2 app3",
				})
				// Second query fails: status fields don't exist yet
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={range .items[*]}", &executor.CommandResult{
					ExitCode: 1,
					Stderr:   "error: error executing jsonpath",
				})
			},
			expectedApps: []Application{
				{Name: "app1", Health: "Unknown", Sync: "Unknown"},
				{Name: "app2", Health: "Unknown", Sync: "Unknown"},
				{Name: "app3", Health: "Unknown", Sync: "Unknown"},
			},
		},
		{
			name: "returns empty list when no applications exist",
			setupMock: func(m *executor.MockCommandExecutor) {
				// First query returns empty (no applications)
				m.SetResponse("kubectl -n argocd get applications.argoproj.io -o jsonpath={.items[*].metadata.name}", &executor.CommandResult{
					Stdout: "",
				})
			},
			expectedApps: []Application{},
		},
		{
			name: "returns empty list on kubectl error",
			setupMock: func(m *executor.MockCommandExecutor) {
				m.SetShouldFail(true, "kubectl error")
			},
			expectedApps: []Application{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := executor.NewMockCommandExecutor()
			tt.setupMock(mockExec)

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
