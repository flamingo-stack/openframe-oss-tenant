package ui

import (
	"bytes"
	"testing"

	"github.com/flamingo/openframe/internal/chart/domain"
	"github.com/stretchr/testify/assert"
)

func TestNewDisplayService(t *testing.T) {
	service := NewDisplayService()
	assert.NotNil(t, service)
}

func TestDisplayService_ShowInstallProgress(t *testing.T) {
	// This test validates the method exists and can be called
	// Since it uses pterm for output, we can't easily capture the output
	service := NewDisplayService()
	
	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowInstallProgress(domain.ChartTypeArgoCD, "Installing ArgoCD...")
	})
	
	assert.NotPanics(t, func() {
		service.ShowInstallProgress(domain.ChartTypeAppOfApps, "Installing app-of-apps...")
	})
}

func TestDisplayService_ShowInstallSuccess(t *testing.T) {
	service := NewDisplayService()
	
	chartInfo := domain.ChartInfo{
		Name:       "test-chart",
		Namespace:  "test-namespace",
		Status:     "deployed",
		Version:    "1.0.0",
		AppVersion: "1.0.0",
	}
	
	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowInstallSuccess(domain.ChartTypeArgoCD, chartInfo)
	})
	
	assert.NotPanics(t, func() {
		service.ShowInstallSuccess(domain.ChartTypeAppOfApps, chartInfo)
	})
}

func TestDisplayService_ShowInstallError(t *testing.T) {
	service := NewDisplayService()
	
	testErr := assert.AnError
	
	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowInstallError(domain.ChartTypeArgoCD, testErr)
	})
	
	assert.NotPanics(t, func() {
		service.ShowInstallError(domain.ChartTypeAppOfApps, testErr)
	})
}

func TestDisplayService_ShowPreInstallCheck(t *testing.T) {
	service := NewDisplayService()
	
	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowPreInstallCheck("Checking Helm installation...")
	})
	
	assert.NotPanics(t, func() {
		service.ShowPreInstallCheck("Validating cluster connectivity...")
	})
}

func TestDisplayService_ShowDryRunResults(t *testing.T) {
	service := NewDisplayService()
	
	var buf bytes.Buffer
	results := []string{
		"Would install ArgoCD v8.1.4",
		"Would create namespace argocd",
		"Would install app-of-apps",
	}
	
	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowDryRunResults(&buf, results)
	})
	
	output := buf.String()
	
	// Verify that all results are included in the output (written to the buffer)
	for _, result := range results {
		assert.Contains(t, output, result)
	}
	
	// Note: The header "Dry Run Results:" is printed via pterm.Info.Println 
	// which goes to stdout, not the provided writer, so we can't test for it in the buffer
}

func TestDisplayService_ShowDryRunResults_EmptyResults(t *testing.T) {
	service := NewDisplayService()
	
	var buf bytes.Buffer
	results := []string{}
	
	assert.NotPanics(t, func() {
		service.ShowDryRunResults(&buf, results)
	})
	
	output := buf.String()
	
	// With empty results, only the newline should be written to the buffer
	assert.Equal(t, "\n", output)
}

func TestDisplayService_ShowDryRunResults_SingleResult(t *testing.T) {
	service := NewDisplayService()
	
	var buf bytes.Buffer
	results := []string{"Would install single chart"}
	
	assert.NotPanics(t, func() {
		service.ShowDryRunResults(&buf, results)
	})
	
	output := buf.String()
	
	// Should contain the single result written to the buffer
	assert.Contains(t, output, "Would install single chart")
}

func TestChartTypeStrings(t *testing.T) {
	// Test that chart types can be converted to strings properly
	assert.Equal(t, "argocd", string(domain.ChartTypeArgoCD))
	assert.Equal(t, "app-of-apps", string(domain.ChartTypeAppOfApps))
}