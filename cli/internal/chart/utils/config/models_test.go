package config

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/stretchr/testify/assert"
)

func TestChartInstallConfig_HasAppOfApps(t *testing.T) {
	// Test with nil AppOfApps
	config := &ChartInstallConfig{}
	assert.False(t, config.HasAppOfApps())

	// Test with empty GitHubRepo
	config.AppOfApps = &models.AppOfAppsConfig{}
	assert.False(t, config.HasAppOfApps())

	// Test with valid AppOfApps
	config.AppOfApps = &models.AppOfAppsConfig{
		GitHubRepo: "https://github.com/test/repo",
	}
	assert.True(t, config.HasAppOfApps())
}

func TestChartInstallConfig_DefaultValues(t *testing.T) {
	config := &ChartInstallConfig{}

	assert.Empty(t, config.ClusterName)
	assert.False(t, config.Force)
	assert.False(t, config.DryRun)
	assert.False(t, config.Verbose)
	assert.False(t, config.Silent)
	assert.Nil(t, config.AppOfApps)
}

func TestChartInstallConfig_WithValues(t *testing.T) {
	appOfApps := models.NewAppOfAppsConfig()
	config := &ChartInstallConfig{
		ClusterName: "test-cluster",
		Force:       true,
		DryRun:      true,
		Verbose:     true,
		Silent:      true,
		AppOfApps:   appOfApps,
	}

	assert.Equal(t, "test-cluster", config.ClusterName)
	assert.True(t, config.Force)
	assert.True(t, config.DryRun)
	assert.True(t, config.Verbose)
	assert.True(t, config.Silent)
	assert.Equal(t, appOfApps, config.AppOfApps)
	assert.True(t, config.HasAppOfApps())
}
