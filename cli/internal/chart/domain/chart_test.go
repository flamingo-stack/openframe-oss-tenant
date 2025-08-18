package domain

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestChartInstallConfig_Structure(t *testing.T) {
	config := ChartInstallConfig{
		ClusterName: "test-cluster",
		Force:       true,
		DryRun:      false,
		Verbose:     true,
		Silent:      false,
	}
	
	assert.Equal(t, "test-cluster", config.ClusterName)
	assert.True(t, config.Force)
	assert.False(t, config.DryRun)
	assert.True(t, config.Verbose)
	assert.False(t, config.Silent)
}

func TestChartInstallConfig_Defaults(t *testing.T) {
	config := ChartInstallConfig{}
	
	// Test zero values (Go defaults)
	assert.Equal(t, "", config.ClusterName)
	assert.False(t, config.Force)
	assert.False(t, config.DryRun)
	assert.False(t, config.Verbose)
	assert.False(t, config.Silent)
}

func TestChartInstallConfig_AllFlags(t *testing.T) {
	tests := []struct {
		name     string
		config   ChartInstallConfig
		expected ChartInstallConfig
	}{
		{
			name: "all flags true",
			config: ChartInstallConfig{
				ClusterName: "prod-cluster",
				Force:       true,
				DryRun:      true,
				Verbose:     true,
				Silent:      true,
			},
			expected: ChartInstallConfig{
				ClusterName: "prod-cluster",
				Force:       true,
				DryRun:      true,
				Verbose:     true,
				Silent:      true,
			},
		},
		{
			name: "mixed flags",
			config: ChartInstallConfig{
				ClusterName: "dev-cluster",
				Force:       false,
				DryRun:      true,
				Verbose:     false,
				Silent:      true,
			},
			expected: ChartInstallConfig{
				ClusterName: "dev-cluster",
				Force:       false,
				DryRun:      true,
				Verbose:     false,
				Silent:      true,
			},
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.config)
		})
	}
}

func TestChartInfo_Structure(t *testing.T) {
	info := ChartInfo{
		Name:       "argo-cd",
		Namespace:  "argocd",
		Status:     "deployed",
		Version:    "8.1.4",
		AppVersion: "2.8.4",
	}
	
	assert.Equal(t, "argo-cd", info.Name)
	assert.Equal(t, "argocd", info.Namespace)
	assert.Equal(t, "deployed", info.Status)
	assert.Equal(t, "8.1.4", info.Version)
	assert.Equal(t, "2.8.4", info.AppVersion)
}

func TestChartInfo_Defaults(t *testing.T) {
	info := ChartInfo{}
	
	// Test zero values
	assert.Equal(t, "", info.Name)
	assert.Equal(t, "", info.Namespace)
	assert.Equal(t, "", info.Status)
	assert.Equal(t, "", info.Version)
	assert.Equal(t, "", info.AppVersion)
}

func TestChartInfo_RealWorldScenarios(t *testing.T) {
	tests := []struct {
		name     string
		info     ChartInfo
		expected ChartInfo
	}{
		{
			name: "ArgoCD chart",
			info: ChartInfo{
				Name:       "argo-cd",
				Namespace:  "argocd",
				Status:     "deployed",
				Version:    "8.1.4",
				AppVersion: "2.8.4",
			},
			expected: ChartInfo{
				Name:       "argo-cd",
				Namespace:  "argocd",
				Status:     "deployed",
				Version:    "8.1.4",
				AppVersion: "2.8.4",
			},
		},
		{
			name: "App-of-apps chart",
			info: ChartInfo{
				Name:       "app-of-apps",
				Namespace:  "argocd",
				Status:     "deployed",
				Version:    "1.0.0",
				AppVersion: "1.0.0",
			},
			expected: ChartInfo{
				Name:       "app-of-apps",
				Namespace:  "argocd",
				Status:     "deployed",
				Version:    "1.0.0",
				AppVersion: "1.0.0",
			},
		},
		{
			name: "Failed chart",
			info: ChartInfo{
				Name:       "failed-chart",
				Namespace:  "default",
				Status:     "failed",
				Version:    "0.1.0",
				AppVersion: "0.1.0",
			},
			expected: ChartInfo{
				Name:       "failed-chart",
				Namespace:  "default",
				Status:     "failed",
				Version:    "0.1.0",
				AppVersion: "0.1.0",
			},
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.info)
		})
	}
}

func TestChartType_Constants(t *testing.T) {
	// Test that constants have expected values
	assert.Equal(t, "argocd", string(ChartTypeArgoCD))
	assert.Equal(t, "app-of-apps", string(ChartTypeAppOfApps))
}

func TestChartType_StringConversion(t *testing.T) {
	tests := []struct {
		name      string
		chartType ChartType
		expected  string
	}{
		{
			name:      "ArgoCD type",
			chartType: ChartTypeArgoCD,
			expected:  "argocd",
		},
		{
			name:      "App-of-apps type",
			chartType: ChartTypeAppOfApps,
			expected:  "app-of-apps",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, string(tt.chartType))
		})
	}
}

func TestChartType_Usage(t *testing.T) {
	// Test that ChartType can be used in various contexts
	
	// As map keys
	chartMap := map[ChartType]string{
		ChartTypeArgoCD:    "ArgoCD Chart",
		ChartTypeAppOfApps: "App-of-Apps Chart",
	}
	
	assert.Equal(t, "ArgoCD Chart", chartMap[ChartTypeArgoCD])
	assert.Equal(t, "App-of-Apps Chart", chartMap[ChartTypeAppOfApps])
	
	// In slices
	chartTypes := []ChartType{ChartTypeArgoCD, ChartTypeAppOfApps}
	assert.Contains(t, chartTypes, ChartTypeArgoCD)
	assert.Contains(t, chartTypes, ChartTypeAppOfApps)
	assert.Len(t, chartTypes, 2)
}

func TestChartType_Comparison(t *testing.T) {
	// Test equality comparisons
	assert.Equal(t, ChartTypeArgoCD, ChartTypeArgoCD)
	assert.Equal(t, ChartTypeAppOfApps, ChartTypeAppOfApps)
	assert.NotEqual(t, ChartTypeArgoCD, ChartTypeAppOfApps)
	
	// Test with string comparison
	assert.True(t, ChartType("argocd") == ChartTypeArgoCD)
	assert.True(t, ChartType("app-of-apps") == ChartTypeAppOfApps)
	assert.False(t, ChartType("invalid") == ChartTypeArgoCD)
}

func TestChartType_AllConstants(t *testing.T) {
	// Ensure all constants are defined and unique
	allTypes := []ChartType{ChartTypeArgoCD, ChartTypeAppOfApps}
	
	// Check uniqueness
	seen := make(map[ChartType]bool)
	for _, chartType := range allTypes {
		assert.False(t, seen[chartType], "ChartType %s should be unique", chartType)
		seen[chartType] = true
	}
	
	// Check that all are non-empty
	for _, chartType := range allTypes {
		assert.NotEmpty(t, string(chartType), "ChartType should not be empty")
	}
}

func TestChartInstallConfig_ValidationScenarios(t *testing.T) {
	tests := []struct {
		name        string
		config      ChartInstallConfig
		description string
	}{
		{
			name: "dry run with verbose",
			config: ChartInstallConfig{
				ClusterName: "test-cluster",
				DryRun:      true,
				Verbose:     true,
			},
			description: "Should support dry-run with verbose output",
		},
		{
			name: "force with silent",
			config: ChartInstallConfig{
				ClusterName: "prod-cluster",
				Force:       true,
				Silent:      true,
			},
			description: "Should support force mode with silent output",
		},
		{
			name: "conflicting verbosity flags",
			config: ChartInstallConfig{
				ClusterName: "test-cluster",
				Verbose:     true,
				Silent:      true,
			},
			description: "Should handle both verbose and silent flags",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Just validate the structure can hold the configuration
			// Validation logic would be in other components
			assert.NotNil(t, tt.config)
			assert.NotEmpty(t, tt.description)
			
			// Test that all fields are accessible
			_ = tt.config.ClusterName
			_ = tt.config.Force
			_ = tt.config.DryRun
			_ = tt.config.Verbose
			_ = tt.config.Silent
		})
	}
}

func TestChartInfo_StatusValues(t *testing.T) {
	// Test common Helm status values
	statusValues := []string{
		"deployed",
		"failed",
		"pending-install",
		"pending-upgrade",
		"pending-rollback",
		"superseded",
		"uninstalled",
		"unknown",
	}
	
	for _, status := range statusValues {
		info := ChartInfo{
			Name:       "test-chart",
			Namespace:  "default",
			Status:     status,
			Version:    "1.0.0",
			AppVersion: "1.0.0",
		}
		
		assert.Equal(t, status, info.Status)
	}
}

func TestChartInfo_EmptyFields(t *testing.T) {
	// Test scenarios where some fields might be empty
	tests := []struct {
		name string
		info ChartInfo
	}{
		{
			name: "missing app version",
			info: ChartInfo{
				Name:      "test-chart",
				Namespace: "default",
				Status:    "deployed",
				Version:   "1.0.0",
				// AppVersion is intentionally empty
			},
		},
		{
			name: "missing version",
			info: ChartInfo{
				Name:      "test-chart",
				Namespace: "default",
				Status:    "deployed",
				// Version is intentionally empty
				AppVersion: "1.0.0",
			},
		},
		{
			name: "minimal info",
			info: ChartInfo{
				Name:      "test-chart",
				Namespace: "default",
				// Only name and namespace provided
			},
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Should be able to handle partial information
			assert.NotEmpty(t, tt.info.Name)
			assert.NotEmpty(t, tt.info.Namespace)
			// Other fields may be empty
		})
	}
}