package errors

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewChartError(t *testing.T) {
	cause := errors.New("test error")
	chartErr := NewChartError("installation", "ArgoCD", cause)

	assert.NotNil(t, chartErr)
	assert.Equal(t, "installation", chartErr.Operation)
	assert.Equal(t, "ArgoCD", chartErr.Component)
	assert.Equal(t, cause, chartErr.Cause)
	assert.False(t, chartErr.Recoverable)
	assert.Equal(t, time.Duration(0), chartErr.RetryAfter)
	assert.Empty(t, chartErr.ClusterName)
}

func TestNewRecoverableChartError(t *testing.T) {
	cause := errors.New("recoverable error")
	retryAfter := 30 * time.Second
	chartErr := NewRecoverableChartError("installation", "Helm", cause, retryAfter)

	assert.NotNil(t, chartErr)
	assert.Equal(t, "installation", chartErr.Operation)
	assert.Equal(t, "Helm", chartErr.Component)
	assert.Equal(t, cause, chartErr.Cause)
	assert.True(t, chartErr.Recoverable)
	assert.Equal(t, retryAfter, chartErr.RetryAfter)
	assert.True(t, chartErr.IsRecoverable())
	assert.Equal(t, retryAfter, chartErr.GetRetryAfter())
}

func TestChartError_Error(t *testing.T) {
	cause := errors.New("test error")
	chartErr := NewChartError("installation", "ArgoCD", cause)

	errorMsg := chartErr.Error()
	assert.Contains(t, errorMsg, "installation")
	assert.Contains(t, errorMsg, "ArgoCD")
	assert.Contains(t, errorMsg, "test error")
}

func TestChartError_ErrorWithCluster(t *testing.T) {
	cause := errors.New("test error")
	chartErr := NewChartError("installation", "ArgoCD", cause).WithCluster("test-cluster")

	errorMsg := chartErr.Error()
	assert.Contains(t, errorMsg, "installation")
	assert.Contains(t, errorMsg, "ArgoCD")
	assert.Contains(t, errorMsg, "test-cluster")
	assert.Contains(t, errorMsg, "test error")
}

func TestChartError_WithCluster(t *testing.T) {
	cause := errors.New("test error")
	chartErr := NewChartError("installation", "ArgoCD", cause)
	
	result := chartErr.WithCluster("test-cluster")
	
	assert.Equal(t, chartErr, result) // Should return same instance
	assert.Equal(t, "test-cluster", chartErr.ClusterName)
}

func TestChartError_WithRecovery(t *testing.T) {
	cause := errors.New("test error")
	chartErr := NewChartError("installation", "ArgoCD", cause)
	retryAfter := 45 * time.Second
	
	result := chartErr.WithRecovery(retryAfter)
	
	assert.Equal(t, chartErr, result) // Should return same instance
	assert.True(t, chartErr.Recoverable)
	assert.Equal(t, retryAfter, chartErr.RetryAfter)
}

func TestChartError_Unwrap(t *testing.T) {
	cause := errors.New("original error")
	chartErr := NewChartError("installation", "ArgoCD", cause)

	unwrapped := chartErr.Unwrap()
	assert.Equal(t, cause, unwrapped)
}

func TestNewInstallationError(t *testing.T) {
	cause := errors.New("installation failed")
	instErr := NewInstallationError("ArgoCD", "helm-install", cause)

	assert.NotNil(t, instErr)
	assert.NotNil(t, instErr.ChartError)
	assert.Equal(t, "installation", instErr.ChartError.Operation)
	assert.Equal(t, "ArgoCD", instErr.ChartError.Component)
	assert.Equal(t, "helm-install", instErr.Phase)
	assert.Equal(t, cause, instErr.ChartError.Cause)
}

func TestInstallationError_Error(t *testing.T) {
	cause := errors.New("installation failed")
	instErr := NewInstallationError("ArgoCD", "helm-install", cause)

	errorMsg := instErr.Error()
	assert.Contains(t, errorMsg, "installation")
	assert.Contains(t, errorMsg, "ArgoCD")
	assert.Contains(t, errorMsg, "helm-install")
}

func TestInstallationError_GetTroubleshootingSteps(t *testing.T) {
	cause := errors.New("installation failed")
	instErr := NewInstallationError("ArgoCD", "helm-install", cause)
	
	steps := instErr.GetTroubleshootingSteps()
	assert.NotEmpty(t, steps)
	assert.Contains(t, steps[0], "kubectl cluster-info")
	assert.Contains(t, steps[1], "kubectl top nodes")
	assert.Contains(t, steps[2], "helm version")
}

func TestInstallationError_WithSuggestions(t *testing.T) {
	cause := errors.New("installation failed")
	instErr := NewInstallationError("ArgoCD", "helm-install", cause)
	suggestions := []string{"Check network connectivity", "Verify permissions"}
	
	result := instErr.WithSuggestions(suggestions)
	
	assert.Equal(t, instErr, result)
	assert.Equal(t, suggestions, instErr.Suggestions)
	
	steps := instErr.GetTroubleshootingSteps()
	assert.Contains(t, steps, "Check network connectivity")
	assert.Contains(t, steps, "Verify permissions")
}

func TestNewValidationError(t *testing.T) {
	valErr := NewValidationError("github-repo", "", "URL is required")

	assert.NotNil(t, valErr)
	assert.Equal(t, "validation", valErr.ChartError.Operation)
	assert.Equal(t, "configuration", valErr.ChartError.Component)
	assert.Equal(t, "github-repo", valErr.Field)
	assert.Equal(t, "", valErr.Value)
	assert.Equal(t, "URL is required", valErr.Constraint)
}

func TestValidationError_Error(t *testing.T) {
	valErr := NewValidationError("github-repo", "invalid-url", "must be valid URL")

	errorMsg := valErr.Error()
	assert.Contains(t, errorMsg, "validation failed")
	assert.Contains(t, errorMsg, "github-repo")
	assert.Contains(t, errorMsg, "invalid-url")
	assert.Contains(t, errorMsg, "must be valid URL")
}

func TestNewConfigurationError(t *testing.T) {
	cause := errors.New("missing key")
	configErr := NewConfigurationError("values.yaml", "database", cause)

	assert.NotNil(t, configErr)
	assert.Equal(t, "configuration", configErr.ChartError.Operation)
	assert.Equal(t, "validation", configErr.ChartError.Component)
	assert.Equal(t, "values.yaml", configErr.ConfigFile)
	assert.Equal(t, "database", configErr.Section)
	assert.Equal(t, cause, configErr.ChartError.Cause)
}

func TestConfigurationError_WithMissingKeys(t *testing.T) {
	cause := errors.New("missing keys")
	configErr := NewConfigurationError("values.yaml", "database", cause)
	missingKeys := []string{"host", "port", "password"}
	
	result := configErr.WithMissingKeys(missingKeys)
	
	assert.Equal(t, configErr, result)
	assert.Equal(t, missingKeys, configErr.GetMissingKeys())
}

func TestIsTimeout(t *testing.T) {
	timeoutErr := NewChartError("network", "connection", ErrNetworkTimeout)
	normalErr := NewChartError("installation", "helm", errors.New("normal error"))

	assert.True(t, IsTimeout(timeoutErr))
	assert.False(t, IsTimeout(normalErr))
	assert.False(t, IsTimeout(errors.New("regular error")))
}

func TestIsRecoverable(t *testing.T) {
	recoverableErr := NewRecoverableChartError("installation", "helm", errors.New("temporary"), 10*time.Second)
	normalErr := NewChartError("installation", "helm", errors.New("permanent"))

	assert.True(t, IsRecoverable(recoverableErr))
	assert.False(t, IsRecoverable(normalErr))
	assert.False(t, IsRecoverable(errors.New("regular error")))
}

func TestGetRetryDelay(t *testing.T) {
	retryAfter := 15 * time.Second
	recoverableErr := NewRecoverableChartError("installation", "helm", errors.New("temporary"), retryAfter)
	normalErr := NewChartError("installation", "helm", errors.New("permanent"))

	assert.Equal(t, retryAfter, GetRetryDelay(recoverableErr))
	assert.Equal(t, time.Duration(0), GetRetryDelay(normalErr))
	assert.Equal(t, time.Duration(0), GetRetryDelay(errors.New("regular error")))
}

func TestWrapAsChartError(t *testing.T) {
	// Test wrapping regular error
	normalErr := errors.New("test error")
	wrapped := WrapAsChartError("installation", "helm", normalErr)

	assert.IsType(t, &ChartError{}, wrapped)
	assert.Equal(t, "installation", wrapped.Operation)
	assert.Equal(t, "helm", wrapped.Component)
	assert.Equal(t, normalErr, wrapped.Cause)

	// Test wrapping existing ChartError
	chartErr := NewChartError("existing", "component", normalErr)
	wrapped2 := WrapAsChartError("new", "new-component", chartErr)

	assert.Equal(t, chartErr, wrapped2) // Should return same instance
}

func TestCombineErrors(t *testing.T) {
	// Test with no errors
	result := CombineErrors([]error{})
	assert.Nil(t, result)

	// Test with single error
	err1 := errors.New("error 1")
	result = CombineErrors([]error{err1})
	assert.Equal(t, err1, result)

	// Test with multiple errors
	err2 := errors.New("error 2")
	err3 := errors.New("error 3")
	result = CombineErrors([]error{err1, err2, err3})
	assert.NotNil(t, result)
	assert.Contains(t, result.Error(), "multiple errors occurred")
	assert.Contains(t, result.Error(), "error 1")
	assert.Contains(t, result.Error(), "error 2")
	assert.Contains(t, result.Error(), "error 3")

	// Test with nil errors mixed in
	result = CombineErrors([]error{err1, nil, err2})
	assert.NotNil(t, result)
	assert.Contains(t, result.Error(), "error 1")
	assert.Contains(t, result.Error(), "error 2")
}