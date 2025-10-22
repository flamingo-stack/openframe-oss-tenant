package helm

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/stretchr/testify/assert"
)

func TestHelmManager_InstallAppOfAppsFromLocal(t *testing.T) {
	tests := []struct {
		name        string
		config      config.ChartInstallConfig
		certFile    string
		keyFile     string
		expectError bool
		errorMsg    string
		setupMock   func(*MockExecutor)
	}{
		{
			name: "nil app-of-apps config",
			config: config.ChartInstallConfig{
				AppOfApps: nil,
			},
			certFile:    "/path/to/cert.pem",
			keyFile:     "/path/to/key.pem",
			expectError: true,
			errorMsg:    "app-of-apps configuration is required",
			setupMock:   func(mockExec *MockExecutor) {},
		},
		{
			name: "empty chart path",
			config: config.ChartInstallConfig{
				AppOfApps: &models.AppOfAppsConfig{
					ChartPath: "",
				},
			},
			certFile:    "/path/to/cert.pem",
			keyFile:     "/path/to/key.pem",
			expectError: true,
			errorMsg:    "chart path is required",
			setupMock:   func(mockExec *MockExecutor) {},
		},
		{
			name: "successful installation",
			config: config.ChartInstallConfig{
				AppOfApps: &models.AppOfAppsConfig{
					ChartPath:  "/tmp/chart/manifests/app-of-apps",
					ValuesFile: "/path/to/values.yaml",
					Namespace:  "argocd",
					Timeout:    "60m",
				},
			},
			certFile:    "/path/to/cert.pem",
			keyFile:     "/path/to/key.pem",
			expectError: false,
			setupMock: func(mockExec *MockExecutor) {
				command := "helm upgrade --install app-of-apps /tmp/chart/manifests/app-of-apps --namespace argocd --wait --timeout 60m -f /path/to/values.yaml --set-file deployment.oss.ingress.localhost.tls.cert=/path/to/cert.pem --set-file deployment.oss.ingress.localhost.tls.key=/path/to/key.pem --set-file deployment.saas.ingress.localhost.tls.cert=/path/to/cert.pem --set-file deployment.saas.ingress.localhost.tls.key=/path/to/key.pem"
				result := &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "Release \"app-of-apps\" has been installed. Happy Helming!",
				}
				mockExec.SetResult(command, result)
			},
		},
		{
			name: "installation with dry-run",
			config: config.ChartInstallConfig{
				DryRun: true,
				AppOfApps: &models.AppOfAppsConfig{
					ChartPath:  "/tmp/chart/manifests/app-of-apps",
					ValuesFile: "/path/to/values.yaml",
					Namespace:  "argocd",
					Timeout:    "60m",
				},
			},
			certFile:    "/path/to/cert.pem",
			keyFile:     "/path/to/key.pem",
			expectError: false,
			setupMock: func(mockExec *MockExecutor) {
				command := "helm upgrade --install app-of-apps /tmp/chart/manifests/app-of-apps --namespace argocd --wait --timeout 60m -f /path/to/values.yaml --set-file deployment.oss.ingress.localhost.tls.cert=/path/to/cert.pem --set-file deployment.oss.ingress.localhost.tls.key=/path/to/key.pem --set-file deployment.saas.ingress.localhost.tls.cert=/path/to/cert.pem --set-file deployment.saas.ingress.localhost.tls.key=/path/to/key.pem --dry-run"
				result := &executor.CommandResult{
					ExitCode: 0,
					Stdout:   "Release \"app-of-apps\" would be installed. Happy Helming!",
				}
				mockExec.SetResult(command, result)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockExec := NewMockExecutor()
			tt.setupMock(mockExec)

			manager := NewHelmManager(mockExec)

			err := manager.InstallAppOfAppsFromLocal(context.Background(), tt.config, tt.certFile, tt.keyFile)

			if tt.expectError {
				assert.Error(t, err)
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
