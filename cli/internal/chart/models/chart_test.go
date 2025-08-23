package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestChartInfo_DefaultValues(t *testing.T) {
	info := &ChartInfo{}

	assert.Empty(t, info.Name)
	assert.Empty(t, info.Namespace)
	assert.Empty(t, info.Status)
	assert.Empty(t, info.Version)
	assert.Empty(t, info.AppVersion)
}

func TestChartInfo_WithValues(t *testing.T) {
	info := &ChartInfo{
		Name:       "argocd",
		Namespace:  "argocd",
		Status:     "deployed",
		Version:    "1.0.0",
		AppVersion: "v2.8.0",
	}

	assert.Equal(t, "argocd", info.Name)
	assert.Equal(t, "argocd", info.Namespace)
	assert.Equal(t, "deployed", info.Status)
	assert.Equal(t, "1.0.0", info.Version)
	assert.Equal(t, "v2.8.0", info.AppVersion)
}

func TestChartType_Constants(t *testing.T) {
	assert.Equal(t, ChartType("argocd"), ChartTypeArgoCD)
	assert.Equal(t, ChartType("app-of-apps"), ChartTypeAppOfApps)
}

func TestChartType_StringConversion(t *testing.T) {
	assert.Equal(t, "argocd", string(ChartTypeArgoCD))
	assert.Equal(t, "app-of-apps", string(ChartTypeAppOfApps))
}