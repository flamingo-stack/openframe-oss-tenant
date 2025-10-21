package config

import (
	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
)

// ChartInstallConfig holds configuration for chart installation
type ChartInstallConfig struct {
	ClusterName    string
	Force          bool
	DryRun         bool
	Verbose        bool
	Silent         bool
	NonInteractive bool // Suppresses interactive UI elements and spinners
	// App-of-apps specific configuration
	AppOfApps *models.AppOfAppsConfig
}

// HasAppOfApps returns true if app-of-apps configuration is provided
func (c *ChartInstallConfig) HasAppOfApps() bool {
	return c.AppOfApps != nil && c.AppOfApps.GitHubRepo != ""
}
