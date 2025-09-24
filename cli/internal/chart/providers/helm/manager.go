package helm

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/flamingo/openframe/internal/chart/models"
	"github.com/flamingo/openframe/internal/chart/providers/argocd"
	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/flamingo/openframe/internal/chart/utils/errors"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// HelmManager handles Helm operations
type HelmManager struct {
	executor executor.CommandExecutor
}

// NewHelmManager creates a new Helm manager
func NewHelmManager(exec executor.CommandExecutor) *HelmManager {
	return &HelmManager{
		executor: exec,
	}
}

// IsHelmInstalled checks if Helm is available
func (h *HelmManager) IsHelmInstalled(ctx context.Context) error {
	_, err := h.executor.Execute(ctx, "helm", "version", "--short")
	if err != nil {
		return errors.ErrHelmNotAvailable
	}
	return nil
}

// IsChartInstalled checks if a chart is already installed
func (h *HelmManager) IsChartInstalled(ctx context.Context, releaseName, namespace string) (bool, error) {
	args := []string{"list", "-q", "-n", namespace}
	if releaseName != "" {
		args = append(args, "-f", releaseName)
	}

	result, err := h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		return false, err
	}

	releases := strings.Split(strings.TrimSpace(result.Stdout), "\n")
	for _, release := range releases {
		if strings.TrimSpace(release) == releaseName {
			return true, nil
		}
	}

	return false, nil
}

// InstallArgoCD installs ArgoCD using Helm with exact commands specified
func (h *HelmManager) InstallArgoCD(ctx context.Context, config config.ChartInstallConfig) error {
	// Add ArgoCD Helm repository
	_, err := h.executor.Execute(ctx, "helm", "repo", "add", "argo", "https://argoproj.github.io/argo-helm")
	if err != nil {
		return fmt.Errorf("failed to add ArgoCD repository: %w", err)
	}

	// Update repositories
	_, err = h.executor.Execute(ctx, "helm", "repo", "update")
	if err != nil {
		return fmt.Errorf("failed to update Helm repositories: %w", err)
	}

	// Create a temporary file with ArgoCD values
	tmpFile, err := os.CreateTemp("", "argocd-values-*.yaml")
	if err != nil {
		return fmt.Errorf("failed to create temporary values file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	// Write the ArgoCD values to the temporary file
	if _, err := tmpFile.WriteString(argocd.GetArgoCDValues()); err != nil {
		return fmt.Errorf("failed to write values to temporary file: %w", err)
	}
	tmpFile.Close()

	// Install ArgoCD with upgrade --install
	args := []string{
		"upgrade", "--install", "argo-cd", "argo/argo-cd",
		"--version=8.2.7",
		"--namespace", "argocd",
		"--create-namespace",
		"--wait",
		"--timeout", "5m",
		"-f", tmpFile.Name(),
	}

	if config.DryRun {
		args = append(args, "--dry-run")
	}

	result, err := h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		// Check if the error is due to context cancellation (CTRL-C)
		if ctx.Err() == context.Canceled {
			return ctx.Err() // Return context cancellation directly without extra messaging
		}

		// Include stderr output for better debugging
		if result != nil && result.Stderr != "" {
			return fmt.Errorf("failed to install ArgoCD: %w\nHelm output: %s", err, result.Stderr)
		}
		return fmt.Errorf("failed to install ArgoCD: %w", err)
	}

	return nil
}

// InstallArgoCDWithProgress installs ArgoCD using Helm with progress indicators
func (h *HelmManager) InstallArgoCDWithProgress(ctx context.Context, config config.ChartInstallConfig) error {
	// Show progress for each step
	spinner, _ := pterm.DefaultSpinner.Start("Installing ArgoCD...")

	// Add ArgoCD repository silently
	_, err := h.executor.Execute(ctx, "helm", "repo", "add", "argo", "https://argoproj.github.io/argo-helm")
	if err != nil {
		// Ignore if already exists
		if !strings.Contains(err.Error(), "already exists") {
			spinner.Stop()
			return fmt.Errorf("failed to add ArgoCD repository: %w", err)
		}
	}

	// Update repositories silently
	_, err = h.executor.Execute(ctx, "helm", "repo", "update")
	if err != nil {
		spinner.Stop()
		return fmt.Errorf("failed to update Helm repositories: %w", err)
	}

	// Create a temporary file with ArgoCD values
	tmpFile, err := os.CreateTemp("", "argocd-values-*.yaml")
	if err != nil {
		spinner.Stop()
		return fmt.Errorf("failed to create temporary values file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	// Write the ArgoCD values to the temporary file
	if _, err := tmpFile.WriteString(argocd.GetArgoCDValues()); err != nil {
		spinner.Stop()
		return fmt.Errorf("failed to write values to temporary file: %w", err)
	}
	tmpFile.Close()

	// Installation details are now silent - just show in verbose mode
	if config.Verbose {
		pterm.Info.Printf("   Version: 8.2.7\n")
		pterm.Info.Printf("   Namespace: argocd\n")
		pterm.Info.Printf("   Values file: %s\n", tmpFile.Name())
	}

	// Install ArgoCD with upgrade --install
	args := []string{
		"upgrade", "--install", "argo-cd", "argo/argo-cd",
		"--version=8.2.7",
		"--namespace", "argocd",
		"--create-namespace",
		"--wait",
		"--timeout", "5m",
		"-f", tmpFile.Name(),
	}

	if config.DryRun {
		args = append(args, "--dry-run")
		if config.Verbose {
			pterm.Info.Println("🔍 Running in dry-run mode...")
		}
	}

	// Show command being executed
	if config.Verbose {
		pterm.Debug.Printf("Executing: helm %s\n", strings.Join(args, " "))
	}

	result, err := h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		// Check if the error is due to context cancellation (CTRL-C)
		if ctx.Err() == context.Canceled {
			spinner.Stop()
			return ctx.Err() // Return context cancellation directly without extra messaging
		}

		spinner.Stop()
		// Include stderr output for better debugging
		if result != nil && result.Stderr != "" {
			return fmt.Errorf("failed to install ArgoCD: %w\nHelm output: %s", err, result.Stderr)
		}
		return fmt.Errorf("failed to install ArgoCD: %w", err)
	}

	spinner.Stop()

	return nil
}

// InstallAppOfAppsFromLocal installs the app-of-apps chart from a local path
func (h *HelmManager) InstallAppOfAppsFromLocal(ctx context.Context, config config.ChartInstallConfig, certFile, keyFile string) error {
	// Validate configuration
	if config.AppOfApps == nil {
		return fmt.Errorf("app-of-apps configuration is required")
	}

	appConfig := config.AppOfApps
	if appConfig.ChartPath == "" {
		return fmt.Errorf("chart path is required for app-of-apps installation")
	}

	// Install app-of-apps using the local chart path
	args := []string{
		"upgrade", "--install", "app-of-apps", appConfig.ChartPath,
		"--namespace", appConfig.Namespace,
		"--wait",
		"--timeout", appConfig.Timeout,
		"-f", appConfig.ValuesFile,
		"--set-file", fmt.Sprintf("deployment.oss.ingress.localhost.tls.cert=%s", certFile),
		"--set-file", fmt.Sprintf("deployment.oss.ingress.localhost.tls.key=%s", keyFile),
	}

	if config.DryRun {
		args = append(args, "--dry-run")
	}

	// Execute helm command with local chart path
	result, err := h.executor.Execute(ctx, "helm", args...)

	if err != nil {
		// Check if the error is due to context cancellation (CTRL-C)
		if ctx.Err() == context.Canceled {
			return ctx.Err() // Return context cancellation directly without extra messaging
		}

		// Include stderr output for better debugging
		if result != nil && result.Stderr != "" {
			return fmt.Errorf("failed to install app-of-apps: %w\nHelm output: %s", err, result.Stderr)
		}
		return fmt.Errorf("failed to install app-of-apps: %w", err)
	}

	return nil
}

// GetChartStatus returns the status of a chart
func (h *HelmManager) GetChartStatus(ctx context.Context, releaseName, namespace string) (models.ChartInfo, error) {
	args := []string{"status", releaseName, "-n", namespace, "--output", "json"}

	_, err := h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		return models.ChartInfo{}, fmt.Errorf("failed to get chart status: %w", err)
	}

	// Parse JSON output and return chart info
	// For now, return basic info
	return models.ChartInfo{
		Name:      releaseName,
		Namespace: namespace,
		Status:    "deployed", // Parse from JSON
		Version:   "1.0.0",    // Parse from JSON
	}, nil
}
