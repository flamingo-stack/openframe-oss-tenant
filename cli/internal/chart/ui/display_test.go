package ui

import (
	"bytes"
	"testing"

	"github.com/flamingo/openframe/internal/chart/models"
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
		service.ShowInstallProgress(models.ChartTypeArgoCD, "Installing ArgoCD...")
	})

}

func TestDisplayService_ShowInstallSuccess(t *testing.T) {
	service := NewDisplayService()

	chartInfo := models.ChartInfo{
		Name:       "test-chart",
		Namespace:  "test-namespace",
		Status:     "deployed",
		Version:    "1.0.0",
		AppVersion: "1.0.0",
	}

	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowInstallSuccess(models.ChartTypeArgoCD, chartInfo)
	})

}

func TestDisplayService_ShowInstallError(t *testing.T) {
	service := NewDisplayService()

	testErr := assert.AnError

	// Should not panic
	assert.NotPanics(t, func() {
		service.ShowInstallError(models.ChartTypeArgoCD, testErr)
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
		"Would install ArgoCD v8.2.7",
		"Would create namespace argocd",
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
	assert.Equal(t, "argocd", string(models.ChartTypeArgoCD))
}

func TestDisplayService_getChartDisplayName(t *testing.T) {
	service := NewDisplayService()

	tests := []struct {
		name      string
		chartType models.ChartType
		expected  string
	}{
		{
			name:      "ArgoCD chart type",
			chartType: models.ChartTypeArgoCD,
			expected:  "ArgoCD",
		},
		{
			name:      "Unknown chart type",
			chartType: models.ChartType("unknown"),
			expected:  "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.getChartDisplayName(tt.chartType)
			assert.Equal(t, tt.expected, result)
		})
	}
}
