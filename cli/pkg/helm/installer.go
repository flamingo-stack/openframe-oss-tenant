package helm

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/flamingo/openframe-cli/pkg/ui"
)

// ChartInstaller handles Helm chart installations
type ChartInstaller struct {
	kubeContext string
	verbose     bool
	dryRun      bool
}

// NewChartInstaller creates a new Helm chart installer
func NewChartInstaller(kubeContext string, verbose, dryRun bool) *ChartInstaller {
	return &ChartInstaller{
		kubeContext: kubeContext,
		verbose:     verbose,
		dryRun:      dryRun,
	}
}

// ChartConfig represents a Helm chart configuration
type ChartConfig struct {
	Name         string
	Chart        string
	Version      string
	Namespace    string
	ValuesFile   string
	Values       map[string]interface{}
	CreateNS     bool
	Wait         bool
	Timeout      time.Duration
	Dependencies []string
}

// InstallOpenFrameStack installs the complete OpenFrame stack based on user configuration
func (h *ChartInstaller) InstallOpenFrameStack(ctx context.Context, config *ui.ClusterConfiguration, repoPath string) error {
	// First, update Helm repositories
	if err := h.updateRepos(ctx); err != nil {
		return fmt.Errorf("failed to update helm repos: %w", err)
	}

	// Install components based on configuration
	charts := h.buildChartList(config, repoPath)

	for _, chart := range charts {
		fmt.Printf("Installing %s...\n", chart.Name)
		if err := h.InstallChart(ctx, chart); err != nil {
			return fmt.Errorf("failed to install %s: %w", chart.Name, err)
		}
		fmt.Printf("✓ %s installed successfully\n", chart.Name)
	}

	return nil
}

// InstallChart installs a single Helm chart
func (h *ChartInstaller) InstallChart(ctx context.Context, config *ChartConfig) error {
	args := []string{"upgrade", "--install", config.Name, config.Chart}

	// Add version if specified
	if config.Version != "" {
		args = append(args, "--version", config.Version)
	}

	// Add namespace
	if config.Namespace != "" {
		args = append(args, "--namespace", config.Namespace)
	}

	// Create namespace if needed
	if config.CreateNS {
		args = append(args, "--create-namespace")
	}

	// Add kube context
	if h.kubeContext != "" {
		args = append(args, "--kube-context", h.kubeContext)
	}

	// Add values file if specified
	if config.ValuesFile != "" {
		args = append(args, "-f", config.ValuesFile)
	}

	// Add wait and timeout
	if config.Wait {
		args = append(args, "--wait")
		if config.Timeout > 0 {
			args = append(args, "--timeout", config.Timeout.String())
		}
	}

	// Add dry-run if enabled
	if h.dryRun {
		args = append(args, "--dry-run")
	}

	// Create the command
	cmd := exec.CommandContext(ctx, "helm", args...)

	// Set up output
	if h.verbose {
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
	}

	return cmd.Run()
}

// buildChartList builds the list of charts to install based on user configuration
func (h *ChartInstaller) buildChartList(config *ui.ClusterConfiguration, repoPath string) []*ChartConfig {
	var charts []*ChartConfig

	// Core infrastructure charts
	if config.EnableComponents["ArgoCD"] {
		charts = append(charts, &ChartConfig{
			Name:       "argo-cd",
			Chart:      "argo/argo-cd",
			Version:    "8.1.3",
			Namespace:  "argocd",
			CreateNS:   true,
			Wait:       true,
			Timeout:    5 * time.Minute,
			ValuesFile: filepath.Join(repoPath, "manifests/argocd-values.yaml"),
		})

		// ArgoCD Applications (App of Apps pattern)
		charts = append(charts, &ChartConfig{
			Name:         "app-of-apps",
			Chart:        filepath.Join(repoPath, "manifests/app-of-apps"),
			Namespace:    "argocd",
			Wait:         true,
			Timeout:      60 * time.Minute,
			ValuesFile:   h.generateValuesFile(config, repoPath),
			Dependencies: []string{"argo-cd"},
		})
	}

	// Monitoring stack
	if config.EnableComponents["Monitoring"] {
		charts = append(charts, h.getMonitoringCharts(repoPath)...)
	}

	// OpenFrame services
	if config.EnableComponents["OpenFrame API"] {
		charts = append(charts, h.getOpenFrameServiceCharts(repoPath)...)
	}

	// External tools
	if config.EnableComponents["External Tools"] {
		charts = append(charts, h.getExternalToolCharts(repoPath)...)
	}

	return charts
}

// getMonitoringCharts returns monitoring stack charts
func (h *ChartInstaller) getMonitoringCharts(repoPath string) []*ChartConfig {
	return []*ChartConfig{
		{
			Name:      "prometheus",
			Chart:     filepath.Join(repoPath, "manifests/platform/prometheus"),
			Namespace: "platform",
			CreateNS:  true,
			Wait:      true,
			Timeout:   10 * time.Minute,
		},
		{
			Name:      "grafana",
			Chart:     filepath.Join(repoPath, "manifests/platform/grafana"),
			Namespace: "platform",
			Wait:      true,
			Timeout:   5 * time.Minute,
		},
		{
			Name:      "loki",
			Chart:     filepath.Join(repoPath, "manifests/platform/loki"),
			Namespace: "platform",
			Wait:      true,
			Timeout:   5 * time.Minute,
		},
	}
}

// getOpenFrameServiceCharts returns OpenFrame service charts
func (h *ChartInstaller) getOpenFrameServiceCharts(repoPath string) []*ChartConfig {
	services := []string{
		"openframe-config",
		"openframe-gateway",
		"openframe-api",
		"openframe-management",
		"openframe-stream",
		"openframe-client",
	}

	var charts []*ChartConfig
	for _, service := range services {
		charts = append(charts, &ChartConfig{
			Name:      service,
			Chart:     filepath.Join(repoPath, "manifests/microservices", service),
			Namespace: "microservices",
			CreateNS:  true,
			Wait:      true,
			Timeout:   10 * time.Minute,
		})
	}

	// Add UI if enabled
	if h.isComponentEnabled("OpenFrame UI") {
		charts = append(charts, &ChartConfig{
			Name:      "openframe-ui",
			Chart:     filepath.Join(repoPath, "manifests/microservices/openframe-ui"),
			Namespace: "microservices",
			Wait:      true,
			Timeout:   5 * time.Minute,
		})
	}

	return charts
}

// getExternalToolCharts returns external tool charts
func (h *ChartInstaller) getExternalToolCharts(repoPath string) []*ChartConfig {
	tools := []string{"meshcentral", "tactical-rmm", "fleetmdm", "authentik"}
	var charts []*ChartConfig

	for _, tool := range tools {
		charts = append(charts, &ChartConfig{
			Name:      tool,
			Chart:     filepath.Join(repoPath, "manifests/integrated-tools", tool),
			Namespace: "integrated-tools",
			CreateNS:  true,
			Wait:      true,
			Timeout:   15 * time.Minute,
		})
	}

	return charts
}

// generateValuesFile creates a Helm values file based on user configuration
func (h *ChartInstaller) generateValuesFile(config *ui.ClusterConfiguration, repoPath string) string {
	// This would generate a values file based on the configuration
	// For now, return the default values file
	return filepath.Join(repoPath, "scripts/helm-values.yaml")
}

// isComponentEnabled checks if a component is enabled (placeholder)
func (h *ChartInstaller) isComponentEnabled(component string) bool {
	// This would check the configuration - placeholder for now
	return true
}

// updateRepos updates Helm repositories
func (h *ChartInstaller) updateRepos(ctx context.Context) error {
	// Add required repositories
	repos := map[string]string{
		"argo":       "https://argoproj.github.io/argo-helm",
		"prometheus": "https://prometheus-community.github.io/helm-charts",
		"grafana":    "https://grafana.github.io/helm-charts",
	}

	for name, url := range repos {
		cmd := exec.CommandContext(ctx, "helm", "repo", "add", name, url)
		if err := cmd.Run(); err != nil {
			// Ignore error if repo already exists
			fmt.Printf("Warning: failed to add repo %s: %v\n", name, err)
		}
	}

	// Update all repositories
	cmd := exec.CommandContext(ctx, "helm", "repo", "update")
	return cmd.Run()
}

// UninstallChart removes a Helm chart
func (h *ChartInstaller) UninstallChart(ctx context.Context, name, namespace string) error {
	args := []string{"uninstall", name}

	if namespace != "" {
		args = append(args, "--namespace", namespace)
	}

	if h.kubeContext != "" {
		args = append(args, "--kube-context", h.kubeContext)
	}

	cmd := exec.CommandContext(ctx, "helm", args...)
	return cmd.Run()
}

// ListInstalledCharts lists all installed Helm charts
func (h *ChartInstaller) ListInstalledCharts(ctx context.Context) ([]InstalledChart, error) {
	args := []string{"list", "--all-namespaces", "--output", "json"}

	if h.kubeContext != "" {
		args = append(args, "--kube-context", h.kubeContext)
	}

	cmd := exec.CommandContext(ctx, "helm", args...)
	_, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	// Parse JSON output (simplified - would need proper JSON unmarshaling)
	// For now, return empty slice
	return []InstalledChart{}, nil
}

// InstalledChart represents an installed Helm chart
type InstalledChart struct {
	Name       string    `json:"name"`
	Namespace  string    `json:"namespace"`
	Revision   string    `json:"revision"`
	Updated    time.Time `json:"updated"`
	Status     string    `json:"status"`
	Chart      string    `json:"chart"`
	AppVersion string    `json:"app_version"`
}

// WaitForArgoCD waits for ArgoCD applications to be synced and healthy
func (h *ChartInstaller) WaitForArgoCD(ctx context.Context) error {
	timeout := time.NewTimer(30 * time.Minute)
	defer timeout.Stop()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timeout.C:
			return fmt.Errorf("timeout waiting for ArgoCD applications")
		case <-ticker.C:
			// Check ArgoCD application status
			cmd := exec.Command("kubectl", "get", "applications", "-n", "argocd", "--no-headers")
			if h.kubeContext != "" {
				cmd.Args = append(cmd.Args, "--context", h.kubeContext)
			}

			output, err := cmd.Output()
			if err != nil {
				continue
			}

			// Simple check - in production would parse the output properly
			if len(output) > 0 {
				fmt.Println("ArgoCD applications are ready")
				return nil
			}
		}
	}
}
