package errors

import (
	"fmt"
	"time"
)

// ChartError represents chart-specific errors with enhanced context
type ChartError struct {
	Operation   string
	Component   string
	ClusterName string
	Cause       error
	Timestamp   time.Time
	Recoverable bool
	RetryAfter  time.Duration
}

// Error implements the error interface
func (e *ChartError) Error() string {
	if e.ClusterName != "" {
		return fmt.Sprintf("chart %s failed for %s on cluster %s: %v", 
			e.Operation, e.Component, e.ClusterName, e.Cause)
	}
	return fmt.Sprintf("chart %s failed for %s: %v", e.Operation, e.Component, e.Cause)
}

// Unwrap returns the underlying error
func (e *ChartError) Unwrap() error {
	return e.Cause
}

// IsRecoverable returns whether this error can be retried
func (e *ChartError) IsRecoverable() bool {
	return e.Recoverable
}

// GetRetryAfter returns the suggested retry delay
func (e *ChartError) GetRetryAfter() time.Duration {
	return e.RetryAfter
}

// NewChartError creates a new chart error
func NewChartError(operation, component string, cause error) *ChartError {
	return &ChartError{
		Operation: operation,
		Component: component,
		Cause:     cause,
		Timestamp: time.Now(),
	}
}

// NewRecoverableChartError creates a recoverable chart error
func NewRecoverableChartError(operation, component string, cause error, retryAfter time.Duration) *ChartError {
	return &ChartError{
		Operation:   operation,
		Component:   component,
		Cause:       cause,
		Timestamp:   time.Now(),
		Recoverable: true,
		RetryAfter:  retryAfter,
	}
}

// WithCluster adds cluster context to the error
func (e *ChartError) WithCluster(clusterName string) *ChartError {
	e.ClusterName = clusterName
	return e
}

// WithRecovery marks the error as recoverable with retry delay
func (e *ChartError) WithRecovery(retryAfter time.Duration) *ChartError {
	e.Recoverable = true
	e.RetryAfter = retryAfter
	return e
}

// Chart Error Types
var (
	ErrChartNotFound        = fmt.Errorf("chart not found")
	ErrChartAlreadyInstalled = fmt.Errorf("chart already installed")
	ErrInvalidConfiguration = fmt.Errorf("invalid configuration")
	ErrClusterNotReady      = fmt.Errorf("cluster not ready")
	ErrHelmNotAvailable     = fmt.Errorf("helm not available")
	ErrKubectlNotAvailable  = fmt.Errorf("kubectl not available")
	ErrInsufficientResources = fmt.Errorf("insufficient cluster resources")
	ErrNetworkTimeout       = fmt.Errorf("network timeout")
	ErrAuthenticationFailed = fmt.Errorf("authentication failed")
	ErrPermissionDenied     = fmt.Errorf("permission denied")
)

// InstallationError represents installation-specific errors
type InstallationError struct {
	*ChartError
	Phase       string
	StepsFailed []string
	Suggestions []string
}

// Error implements error interface for InstallationError
func (e *InstallationError) Error() string {
	baseError := e.ChartError.Error()
	if e.Phase != "" {
		return fmt.Sprintf("%s during phase '%s'", baseError, e.Phase)
	}
	return baseError
}

// GetTroubleshootingSteps returns suggested troubleshooting steps
func (e *InstallationError) GetTroubleshootingSteps() []string {
	steps := []string{
		"Check cluster connectivity: kubectl cluster-info",
		"Verify cluster resources: kubectl top nodes",
		"Check helm installation: helm version",
	}
	
	// Add error-specific steps
	steps = append(steps, e.Suggestions...)
	
	return steps
}

// NewInstallationError creates a new installation error
func NewInstallationError(component, phase string, cause error) *InstallationError {
	return &InstallationError{
		ChartError: NewChartError("installation", component, cause),
		Phase:      phase,
	}
}

// WithSuggestions adds troubleshooting suggestions
func (e *InstallationError) WithSuggestions(suggestions []string) *InstallationError {
	e.Suggestions = suggestions
	return e
}

// ValidationError represents validation-specific errors  
type ValidationError struct {
	*ChartError
	Field       string
	Value       string
	Constraint  string
}

// Error implements error interface for ValidationError
func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("validation failed for field '%s': %s (value: '%s')", 
			e.Field, e.Constraint, e.Value)
	}
	return fmt.Sprintf("validation failed: %v", e.Cause)
}

// NewValidationError creates a new validation error
func NewValidationError(field, value, constraint string) *ValidationError {
	cause := fmt.Errorf("constraint violation: %s", constraint)
	return &ValidationError{
		ChartError: NewChartError("validation", "configuration", cause),
		Field:      field,
		Value:      value,
		Constraint: constraint,
	}
}

// ConfigurationError represents configuration-specific errors
type ConfigurationError struct {
	*ChartError
	ConfigFile  string
	Section     string
	MissingKeys []string
}

// Error implements error interface for ConfigurationError  
func (e *ConfigurationError) Error() string {
	if e.ConfigFile != "" {
		return fmt.Sprintf("configuration error in file '%s': %v", e.ConfigFile, e.Cause)
	}
	return fmt.Sprintf("configuration error: %v", e.Cause)
}

// GetMissingKeys returns list of missing configuration keys
func (e *ConfigurationError) GetMissingKeys() []string {
	return e.MissingKeys
}

// NewConfigurationError creates a new configuration error
func NewConfigurationError(configFile, section string, cause error) *ConfigurationError {
	return &ConfigurationError{
		ChartError: NewChartError("configuration", "validation", cause),
		ConfigFile: configFile,
		Section:    section,
	}
}

// WithMissingKeys adds missing keys information
func (e *ConfigurationError) WithMissingKeys(keys []string) *ConfigurationError {
	e.MissingKeys = keys
	return e
}

// Helper functions for common error patterns

// IsTimeout checks if an error is timeout-related
func IsTimeout(err error) bool {
	if chartErr, ok := err.(*ChartError); ok {
		return chartErr.Cause == ErrNetworkTimeout
	}
	return false
}

// IsRecoverable checks if an error is recoverable
func IsRecoverable(err error) bool {
	if chartErr, ok := err.(*ChartError); ok {
		return chartErr.IsRecoverable()
	}
	return false
}

// GetRetryDelay gets the retry delay for recoverable errors
func GetRetryDelay(err error) time.Duration {
	if chartErr, ok := err.(*ChartError); ok && chartErr.IsRecoverable() {
		return chartErr.GetRetryAfter()
	}
	return 0
}

// WrapAsChartError wraps a generic error as a chart error
func WrapAsChartError(operation, component string, err error) *ChartError {
	if chartErr, ok := err.(*ChartError); ok {
		return chartErr
	}
	return NewChartError(operation, component, err)
}

// SkippedInstallationError represents when installation is skipped (not an actual error)
type SkippedInstallationError struct {
	Component string
	Reason    string
}

// Error implements the error interface
func (e *SkippedInstallationError) Error() string {
	return fmt.Sprintf("%s installation skipped: %s", e.Component, e.Reason)
}

// IsSkipped returns true, indicating this is a skipped installation
func (e *SkippedInstallationError) IsSkipped() bool {
	return true
}

// CombineErrors combines multiple errors into a single error message
func CombineErrors(errors []error) error {
	if len(errors) == 0 {
		return nil
	}
	
	if len(errors) == 1 {
		return errors[0]
	}
	
	var messages []string
	for _, err := range errors {
		if err != nil {
			messages = append(messages, err.Error())
		}
	}
	
	return fmt.Errorf("multiple errors occurred: %v", messages)
}

// IsSkippedInstallation checks if an error is a skipped installation
func IsSkippedInstallation(err error) bool {
	_, ok := err.(*SkippedInstallationError)
	return ok
}