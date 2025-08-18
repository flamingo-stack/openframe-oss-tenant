package helm

import (
	"context"
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/chart/domain"
	"github.com/flamingo/openframe/internal/shared/executor"
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
		return domain.ErrHelmNotFound
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
func (h *HelmManager) InstallArgoCD(ctx context.Context, config domain.ChartInstallConfig) error {
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
	
	// Install ArgoCD with upgrade --install
	args := []string{
		"upgrade", "--install", "argo-cd", "argo/argo-cd",
		"--version=8.1.4",
		"--namespace", "argocd",
		"--create-namespace",
		"--wait",
		"--timeout", "5m",
		"-f", "./manifests/argocd-values.yaml",
	}
	
	if config.DryRun {
		args = append(args, "--dry-run")
	}
	
	_, err = h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		return fmt.Errorf("failed to install ArgoCD: %w", err)
	}
	
	return nil
}

// InstallAppOfApps installs the app-of-apps chart
func (h *HelmManager) InstallAppOfApps(ctx context.Context, config domain.ChartInstallConfig) error {
	// Install app-of-apps chart
	args := []string{
		"upgrade", "--install", "app-of-apps", "./manifests/app-of-apps",
		"--namespace", "argocd", 
		"--wait",
		"--timeout", "60m",
		"-f", "./helm-values.yaml",
	}
	
	if config.DryRun {
		args = append(args, "--dry-run")
	}
	
	_, err := h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		return fmt.Errorf("failed to install app-of-apps: %w", err)
	}
	
	return nil
}

// GetChartStatus returns the status of a chart
func (h *HelmManager) GetChartStatus(ctx context.Context, releaseName, namespace string) (domain.ChartInfo, error) {
	args := []string{"status", releaseName, "-n", namespace, "--output", "json"}
	
	_, err := h.executor.Execute(ctx, "helm", args...)
	if err != nil {
		return domain.ChartInfo{}, fmt.Errorf("failed to get chart status: %w", err)
	}
	
	// Parse JSON output and return chart info
	// For now, return basic info
	return domain.ChartInfo{
		Name:      releaseName,
		Namespace: namespace,
		Status:    "deployed", // Parse from JSON
		Version:   "1.0.0",    // Parse from JSON
	}, nil
}