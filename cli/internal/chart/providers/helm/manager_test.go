package helm

import (
	"context"
	"strings"
	"testing"

	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/flamingo/openframe/internal/chart/utils/errors"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

	// Check for partial match for error handling (for complex commands)
	for errKey, err := range m.errors {
		if strings.Contains(commandStr, errKey) {
			return nil, err
		}
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

func TestHelmManager_IsHelmInstalled(t *testing.T) {
	tests := []struct {
		name        string
		setupMock   func(*MockExecutor)
		expectError bool
	}{
		{
			name: "helm is installed",
			setupMock: func(m *MockExecutor) {
				m.SetResult("helm version --short", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "v3.12.0+g4f11b4a",
				})
			},
			expectError: false,
		},
		{
			name: "helm is not installed",
			setupMock: func(m *MockExecutor) {
				m.SetError("helm version --short", assert.AnError)
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.setupMock(mockExec)

			manager := NewHelmManager(mockExec)
			err := manager.IsHelmInstalled(context.Background())

			if tt.expectError {
				assert.Error(t, err)
				assert.ErrorIs(t, err, errors.ErrHelmNotAvailable)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestHelmManager_IsChartInstalled(t *testing.T) {
	tests := []struct {
		name         string
		releaseName  string
		namespace    string
		setupMock    func(*MockExecutor)
		expectResult bool
		expectError  bool
	}{
		{
			name:        "chart is installed",
			releaseName: "argocd",
			namespace:   "argocd",
			setupMock: func(m *MockExecutor) {
				m.SetResult("helm list -q -n argocd -f argocd", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "argocd\n",
				})
			},
			expectResult: true,
			expectError:  false,
		},
		{
			name:        "chart is not installed",
			releaseName: "argocd",
			namespace:   "argocd",
			setupMock: func(m *MockExecutor) {
				m.SetResult("helm list -q -n argocd -f argocd", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "",
				})
			},
			expectResult: false,
			expectError:  false,
		},
		{
			name:        "helm command fails",
			releaseName: "argocd",
			namespace:   "argocd",
			setupMock: func(m *MockExecutor) {
				m.SetError("helm list -q -n argocd -f argocd", assert.AnError)
			},
			expectResult: false,
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.setupMock(mockExec)

			manager := NewHelmManager(mockExec)
			result, err := manager.IsChartInstalled(context.Background(), tt.releaseName, tt.namespace)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectResult, result)
			}
		})
	}
}

func TestHelmManager_InstallArgoCD(t *testing.T) {
	tests := []struct {
		name          string
		config        config.ChartInstallConfig
		setupMock     func(*MockExecutor)
		expectError   bool
		checkCommands func(t *testing.T, commands [][]string)
	}{
		{
			name: "successful installation",
			config: config.ChartInstallConfig{
				DryRun: false,
			},
			setupMock: func(m *MockExecutor) {
				// All commands should succeed
			},
			expectError: false,
			checkCommands: func(t *testing.T, commands [][]string) {
				// Verify expected commands were called
				require.GreaterOrEqual(t, len(commands), 3)

				// Should have added repo and updated
				assert.Equal(t, []string{"helm", "repo", "add", "argo", "https://argoproj.github.io/argo-helm"}, commands[0])
				assert.Equal(t, []string{"helm", "repo", "update"}, commands[1])

				// Should have upgrade/install command
				installCmd := commands[2]
				assert.Equal(t, "helm", installCmd[0])
				assert.Equal(t, "upgrade", installCmd[1])
				assert.Equal(t, "--install", installCmd[2])
				assert.Equal(t, "argo-cd", installCmd[3])
				assert.Equal(t, "argo/argo-cd", installCmd[4])
				assert.Contains(t, installCmd, "--version=8.1.4")
				assert.Contains(t, installCmd, "--namespace")
				assert.Contains(t, installCmd, "argocd")
				assert.Contains(t, installCmd, "--create-namespace")
				assert.Contains(t, installCmd, "--wait")
				assert.Contains(t, installCmd, "--timeout")
				assert.Contains(t, installCmd, "5m")
				// Check that values file path contains argocd-values.yaml
				hasValuesFile := false
				for i, arg := range installCmd {
					if arg == "-f" && i+1 < len(installCmd) {
						hasValuesFile = true
						assert.Contains(t, installCmd[i+1], "argocd-values.yaml")
						break
					}
				}
				assert.True(t, hasValuesFile, "Should have -f flag with values file")
			},
		},
		{
			name: "dry run installation",
			config: config.ChartInstallConfig{
				DryRun: true,
			},
			setupMock: func(m *MockExecutor) {
				// All commands should succeed
			},
			expectError: false,
			checkCommands: func(t *testing.T, commands [][]string) {
				require.GreaterOrEqual(t, len(commands), 3)
				installCmd := commands[2]
				assert.Contains(t, installCmd, "--dry-run")
			},
		},
		{
			name: "repo add fails",
			config: config.ChartInstallConfig{
				DryRun: false,
			},
			setupMock: func(m *MockExecutor) {
				m.SetError("helm repo add argo https://argoproj.github.io/argo-helm", assert.AnError)
			},
			expectError:   true,
			checkCommands: func(t *testing.T, commands [][]string) {},
		},
		{
			name: "repo update fails",
			config: config.ChartInstallConfig{
				DryRun: false,
			},
			setupMock: func(m *MockExecutor) {
				m.SetError("helm repo update", assert.AnError)
			},
			expectError:   true,
			checkCommands: func(t *testing.T, commands [][]string) {},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.setupMock(mockExec)

			manager := NewHelmManager(mockExec)
			err := manager.InstallArgoCD(context.Background(), tt.config)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				tt.checkCommands(t, mockExec.GetCommands())
			}
		})
	}
}

func TestHelmManager_GetChartStatus(t *testing.T) {
	tests := []struct {
		name        string
		releaseName string
		namespace   string
		setupMock   func(*MockExecutor)
		expectError bool
	}{
		{
			name:        "successful status retrieval",
			releaseName: "argocd",
			namespace:   "argocd",
			setupMock: func(m *MockExecutor) {
				m.SetResult("helm status argocd -n argocd --output json", &executor.CommandResult{
					ExitCode: 0,
					Stdout:   `{"name":"argocd","namespace":"argocd","info":{"status":"deployed"}}`,
				})
			},
			expectError: false,
		},
		{
			name:        "status command fails",
			releaseName: "argocd",
			namespace:   "argocd",
			setupMock: func(m *MockExecutor) {
				m.SetError("helm status argocd -n argocd --output json", assert.AnError)
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.setupMock(mockExec)

			manager := NewHelmManager(mockExec)
			info, err := manager.GetChartStatus(context.Background(), tt.releaseName, tt.namespace)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.releaseName, info.Name)
				assert.Equal(t, tt.namespace, info.Namespace)
				assert.Equal(t, "deployed", info.Status)
			}
		})
	}
}

// Removed: ensureHelmGitPlugin functionality moved to git provider
// Removed: ensureHelmGitPlugin functionality moved to git provider
// Removed: InstallAppOfApps functionality moved to services layer with git provider
/*
func TestHelmManager_InstallAppOfApps(t *testing.T) {
	tests := []struct {
		name        string
		config      config.ChartInstallConfig
		expectError bool
		errorMsg    string
		setupMock   func(*MockExecutor)
	}{
		{
			name: "successful installation",
			config: config.ChartInstallConfig{
				DryRun: false,
				AppOfApps: &models.AppOfAppsConfig{
					GitHubRepo:   "https://github.com/Flamingo-CX/openframe",
					GitHubBranch: "main",
					ChartPath:    "manifests/app-of-apps",
					CertDir:      "/path/to/certs",
					Namespace:    "argocd",
					Timeout:      "60m",
				},
			},
			expectError: false,
			setupMock: func(mockExec *MockExecutor) {
				// Mock plugin check (already installed)
				mockExec.SetResult("helm plugin list", &executor.CommandResult{
					Stdout: "helm-git\tv0.15.1\tInstall Helm Charts from Git repositories",
				})
			},
		},
		{
			name: "dry run mode",
			config: config.ChartInstallConfig{
				DryRun: true,
				AppOfApps: &models.AppOfAppsConfig{
					GitHubRepo:   "https://github.com/Flamingo-CX/openframe",
					GitHubBranch: "develop",
					ChartPath:    "manifests/app-of-apps",
					CertDir:      "/path/to/certs",
					Namespace:    "argocd",
					Timeout:      "60m",
				},
			},
			expectError: false,
			setupMock: func(mockExec *MockExecutor) {
				// Mock plugin check
				mockExec.SetResult("helm plugin list", &executor.CommandResult{
					Stdout: "helm-git\tv0.15.1\tInstall Helm Charts from Git repositories",
				})
			},
		},
		{
			name: "missing app-of-apps config",
			config: config.ChartInstallConfig{
				AppOfApps: nil,
			},
			expectError: true,
			errorMsg:    "app-of-apps configuration is required",
			setupMock:   func(mockExec *MockExecutor) {},
		},
		{
			name: "missing github repo",
			config: config.ChartInstallConfig{
				AppOfApps: &models.AppOfAppsConfig{
					GitHubRepo:   "",
					GitHubBranch: "main",
					CertDir:      "/path/to/certs",
				},
			},
			expectError: true,
			errorMsg:    "GitHub repository URL is required",
			setupMock:   func(mockExec *MockExecutor) {},
		},
		{
			name: "missing cert dir",
			config: config.ChartInstallConfig{
				AppOfApps: &models.AppOfAppsConfig{
					GitHubRepo:   "https://github.com/Flamingo-CX/openframe",
					GitHubBranch: "main",
					CertDir:      "",
				},
			},
			expectError: true,
			errorMsg:    "certificate directory is required",
			setupMock:   func(mockExec *MockExecutor) {},
		},
		{
			name: "default branch when empty",
			config: config.ChartInstallConfig{
				AppOfApps: &models.AppOfAppsConfig{
					GitHubRepo:   "https://github.com/Flamingo-CX/openframe",
					GitHubBranch: "",
					ChartPath:    "manifests/app-of-apps",
					CertDir:      "/path/to/certs",
					Namespace:    "argocd",
					Timeout:      "60m",
				},
			},
			expectError: false,
			setupMock: func(mockExec *MockExecutor) {
				// Mock plugin check
				mockExec.SetResult("helm plugin list", &executor.CommandResult{
					Stdout: "helm-git\tv0.15.1\tInstall Helm Charts from Git repositories",
				})
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.setupMock(mockExec)

			manager := NewHelmManager(mockExec)

			err := manager.InstallAppOfApps(context.Background(), tt.config)

			if tt.expectError {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)

				// For successful cases, verify commands were executed
				if tt.config.AppOfApps != nil && tt.config.AppOfApps.GitHubRepo != "" && tt.config.AppOfApps.CertDir != "" {
					commands := mockExec.GetCommands()
					hasPluginList := false
					hasHelmUpgrade := false

					for _, cmd := range commands {
						cmdStr := strings.Join(cmd, " ")
						if strings.Contains(cmdStr, "helm plugin list") {
							hasPluginList = true
						}
						if strings.Contains(cmdStr, "helm upgrade --install app-of-apps") {
							hasHelmUpgrade = true
						}
					}

					assert.True(t, hasPluginList, "Should check helm plugins")
					assert.True(t, hasHelmUpgrade, "Should call helm upgrade for app-of-apps")
				}
			}
		})
	}
}

func TestHelmManager_InstallAppOfApps_GitURL_Format(t *testing.T) {
	mockExec := NewMockExecutor()

	// Mock plugin check
	mockExec.SetResult("helm plugin list", &executor.CommandResult{
		Stdout: "helm-git\tv0.15.1\tInstall Helm Charts from Git repositories",
	})

	manager := NewHelmManager(mockExec)

	config := config.ChartInstallConfig{
		AppOfApps: &models.AppOfAppsConfig{
			GitHubRepo:   "https://github.com/Flamingo-CX/openframe",
			GitHubBranch: "feature-branch",
			ChartPath:    "manifests/app-of-apps",
			CertDir:      "/path/to/certs",
			Namespace:    "argocd",
			Timeout:      "60m",
		},
	}

	err := manager.InstallAppOfApps(context.Background(), config)
	require.NoError(t, err)

	// Verify the git URL format is correct
	commands := mockExec.GetCommands()
	var helmUpgradeCommand string
	for _, cmd := range commands {
		cmdStr := strings.Join(cmd, " ")
		if strings.Contains(cmdStr, "helm upgrade --install app-of-apps") {
			helmUpgradeCommand = cmdStr
			break
		}
	}

	require.NotEmpty(t, helmUpgradeCommand, "helm upgrade command should have been executed")

	// Verify the git URL contains the expected format
	expectedGitURL := "git+https://github.com/Flamingo-CX/openframe@manifests/app-of-apps?ref=feature-branch"
	assert.Contains(t, helmUpgradeCommand, expectedGitURL, "Git URL should be properly formatted")

	// Verify certificate file paths
	assert.Contains(t, helmUpgradeCommand, "--set-file deployment.ingress.localhost.tls.cert=/path/to/certs/localhost.pem")
	assert.Contains(t, helmUpgradeCommand, "--set-file deployment.ingress.localhost.tls.key=/path/to/certs/localhost-key.pem")

	// Verify other expected flags
	assert.Contains(t, helmUpgradeCommand, "--namespace argocd")
	assert.Contains(t, helmUpgradeCommand, "--wait")
	assert.Contains(t, helmUpgradeCommand, "--timeout 60m")
}
*/
