package models

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestChartError_Error(t *testing.T) {
	tests := []struct {
		name      string
		operation string
		chart     string
		err       error
		expected  string
	}{
		{
			name:      "basic error",
			operation: "install",
			chart:     "argocd",
			err:       errors.New("connection failed"),
			expected:  "chart install failed for argocd: connection failed",
		},
		{
			name:      "uninstall error",
			operation: "uninstall",
			chart:     "app-of-apps",
			err:       errors.New("chart not found"),
			expected:  "chart uninstall failed for app-of-apps: chart not found",
		},
		{
			name:      "status error",
			operation: "status",
			chart:     "custom-chart",
			err:       errors.New("helm command failed"),
			expected:  "chart status failed for custom-chart: helm command failed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			chartErr := &ChartError{
				Operation: tt.operation,
				Chart:     tt.chart,
				Err:       tt.err,
			}
			
			assert.Equal(t, tt.expected, chartErr.Error())
		})
	}
}

func TestNewChartError(t *testing.T) {
	operation := "install"
	chart := "test-chart"
	originalErr := errors.New("test error")

	chartErr := NewChartError(operation, chart, originalErr)

	assert.Equal(t, operation, chartErr.Operation)
	assert.Equal(t, chart, chartErr.Chart)
	assert.Equal(t, originalErr, chartErr.Err)
	assert.Equal(t, "chart install failed for test-chart: test error", chartErr.Error())
}

func TestCommonErrors(t *testing.T) {
	assert.Equal(t, "cluster not found", ErrClusterNotFound.Error())
	assert.Equal(t, "chart not found", ErrChartNotFound.Error())
	assert.Equal(t, "helm command not found", ErrHelmNotFound.Error())
}

func TestChartError_Unwrap(t *testing.T) {
	originalErr := errors.New("original error")
	chartErr := NewChartError("install", "test-chart", originalErr)

	// Test that we can unwrap to get the original error
	assert.Equal(t, originalErr, chartErr.Err)
	assert.ErrorIs(t, chartErr, originalErr)
}