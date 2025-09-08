package models

import (
	"fmt"
	"strings"
)

// AppOfAppsConfig holds configuration for app-of-apps installation
type AppOfAppsConfig struct {
	// GitHub repository configuration
	GitHubRepo   string // Repository URL (e.g., "https://github.com/flamingo-stack/openframe-oss-tenant")
	GitHubBranch string // Branch to use (e.g., "main", "develop")
	ChartPath    string // Path to chart in repository (e.g., "manifests/app-of-apps")
	// Certificate configuration
	CertDir string // Directory containing certificates for TLS configuration
	// Values configuration
	ValuesFile string // Path to values file
	// Helm configuration
	Namespace string // Target namespace (e.g., "argocd")
	Timeout   string // Installation timeout (e.g., "60m")
}

// NewAppOfAppsConfig creates a new AppOfAppsConfig with defaults
func NewAppOfAppsConfig() *AppOfAppsConfig {
	return &AppOfAppsConfig{
		GitHubRepo:   "https://github.com/flamingo-stack/openframe-oss-tenant",
		GitHubBranch: "main",
		ChartPath:    "manifests/app-of-apps",
		Namespace:    "argocd",
		Timeout:      "60m",
	}
}

// GetGitURL returns the formatted git URL for helm-git plugin
func (a *AppOfAppsConfig) GetGitURL() string {
	// helm-git plugin v1.4.0 format: git+https://github.com/org/repo@path?ref=branch
	// Authentication should be handled via environment variables or Git credentials
	baseURL := strings.TrimSuffix(a.GitHubRepo, ".git")
	return fmt.Sprintf("git+%s@%s?ref=%s", baseURL, a.ChartPath, a.GitHubBranch)
}
