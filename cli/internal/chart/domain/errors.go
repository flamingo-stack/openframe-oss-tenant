package domain

import (
	"fmt"
)

// ChartError represents chart-related errors
type ChartError struct {
	Operation string
	Chart     string
	Err       error
}

func (e *ChartError) Error() string {
	return fmt.Sprintf("chart %s failed for %s: %v", e.Operation, e.Chart, e.Err)
}

func (e *ChartError) Unwrap() error {
	return e.Err
}

// NewChartError creates a new chart error
func NewChartError(operation, chart string, err error) *ChartError {
	return &ChartError{
		Operation: operation,
		Chart:     chart,
		Err:       err,
	}
}

// Common chart errors
var (
	ErrClusterNotFound = fmt.Errorf("cluster not found")
	ErrChartNotFound   = fmt.Errorf("chart not found")
	ErrHelmNotFound    = fmt.Errorf("helm command not found")
)