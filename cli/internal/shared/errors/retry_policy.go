package errors

import (
	"context"
	"math"
	"math/rand"
	"time"

	"github.com/pterm/pterm"
)

// RetryPolicy defines retry behavior for recoverable errors
type RetryPolicy interface {
	ShouldRetry(err error, attempt int) bool
	GetDelay(attempt int) time.Duration
	GetMaxAttempts() int
}

// RecoverableError interface for errors that can be retried
type RecoverableError interface {
	IsRecoverable() bool
	GetRetryAfter() time.Duration
}

// ExponentialBackoffPolicy implements exponential backoff retry policy
type ExponentialBackoffPolicy struct {
	MaxAttempts   int
	BaseDelay     time.Duration
	MaxDelay      time.Duration
	Multiplier    float64
	Jitter        bool
	RetryableErrs map[string]bool
}

// NewExponentialBackoffPolicy creates a new exponential backoff policy
func NewExponentialBackoffPolicy(maxAttempts int, baseDelay time.Duration) *ExponentialBackoffPolicy {
	return &ExponentialBackoffPolicy{
		MaxAttempts: maxAttempts,
		BaseDelay:   baseDelay,
		MaxDelay:    5 * time.Minute,
		Multiplier:  2.0,
		Jitter:      true,
		RetryableErrs: map[string]bool{
			"network timeout":       true,
			"connection refused":    true,
			"temporary failure":     true,
			"resource not ready":    true,
			"cluster not ready":     true,
			"service unavailable":   true,
		},
	}
}

// ShouldRetry determines if an error should be retried
func (p *ExponentialBackoffPolicy) ShouldRetry(err error, attempt int) bool {
	if attempt >= p.MaxAttempts {
		return false
	}

	// Check if it's a recoverable error
	if recoverableErr, ok := err.(RecoverableError); ok {
		return recoverableErr.IsRecoverable()
	}

	// Check if error message indicates it's retryable
	errMsg := err.Error()
	for retryablePattern := range p.RetryableErrs {
		if contains(errMsg, retryablePattern) {
			return true
		}
	}

	return false
}

// GetDelay calculates the delay for the next retry attempt
func (p *ExponentialBackoffPolicy) GetDelay(attempt int) time.Duration {
	if attempt <= 0 {
		return p.BaseDelay
	}

	delay := time.Duration(float64(p.BaseDelay) * math.Pow(p.Multiplier, float64(attempt-1)))
	
	if delay > p.MaxDelay {
		delay = p.MaxDelay
	}

	// Add jitter to prevent thundering herd
	if p.Jitter {
		jitterAmount := float64(delay) * 0.1 // 10% jitter
		jitter := time.Duration(jitterAmount * (2.0*rand.Float64() - 1.0))
		delay = delay + jitter
	}

	return delay
}

// GetMaxAttempts returns the maximum number of retry attempts
func (p *ExponentialBackoffPolicy) GetMaxAttempts() int {
	return p.MaxAttempts
}

// LinearBackoffPolicy implements linear backoff retry policy
type LinearBackoffPolicy struct {
	MaxAttempts int
	BaseDelay   time.Duration
	Increment   time.Duration
}

// NewLinearBackoffPolicy creates a new linear backoff policy
func NewLinearBackoffPolicy(maxAttempts int, baseDelay, increment time.Duration) *LinearBackoffPolicy {
	return &LinearBackoffPolicy{
		MaxAttempts: maxAttempts,
		BaseDelay:   baseDelay,
		Increment:   increment,
	}
}

// ShouldRetry determines if an error should be retried
func (p *LinearBackoffPolicy) ShouldRetry(err error, attempt int) bool {
	if attempt >= p.MaxAttempts {
		return false
	}
	return IsRecoverable(err)
}

// GetDelay calculates linear delay
func (p *LinearBackoffPolicy) GetDelay(attempt int) time.Duration {
	return p.BaseDelay + time.Duration(attempt)*p.Increment
}

// GetMaxAttempts returns maximum attempts
func (p *LinearBackoffPolicy) GetMaxAttempts() int {
	return p.MaxAttempts
}

// RetryExecutor handles retry logic with policies
type RetryExecutor struct {
	policy RetryPolicy
	onRetry func(err error, attempt int, delay time.Duration)
}

// NewRetryExecutor creates a new retry executor with the given policy
func NewRetryExecutor(policy RetryPolicy) *RetryExecutor {
	return &RetryExecutor{
		policy: policy,
	}
}

// WithRetryCallback sets a callback function called on each retry
func (r *RetryExecutor) WithRetryCallback(callback func(err error, attempt int, delay time.Duration)) *RetryExecutor {
	r.onRetry = callback
	return r
}

// Execute executes a function with retry logic
func (r *RetryExecutor) Execute(ctx context.Context, operation func() error) error {
	var lastErr error
	
	for attempt := 0; attempt < r.policy.GetMaxAttempts(); attempt++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		// Execute the operation
		err := operation()
		if err == nil {
			return nil // Success
		}

		lastErr = err

		// Check if we should retry
		if !r.policy.ShouldRetry(err, attempt) {
			break
		}

		// This is our last attempt
		if attempt == r.policy.GetMaxAttempts()-1 {
			break
		}

		// Calculate delay
		delay := r.policy.GetDelay(attempt + 1)

		// Call retry callback if set
		if r.onRetry != nil {
			r.onRetry(err, attempt+1, delay)
		}

		// Wait for the delay period or context cancellation
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay):
			// Continue to next attempt
		}
	}

	return lastErr
}

// ExecuteWithResult executes a function returning a result with retry logic
func (r *RetryExecutor) ExecuteWithResult(ctx context.Context, operation func() (interface{}, error)) (interface{}, error) {
	var lastErr error
	var lastResult interface{}
	
	for attempt := 0; attempt < r.policy.GetMaxAttempts(); attempt++ {
		// Check context cancellation
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}

		// Execute the operation
		result, err := operation()
		if err == nil {
			return result, nil // Success
		}

		lastErr = err
		lastResult = result

		// Check if we should retry
		if !r.policy.ShouldRetry(err, attempt) {
			break
		}

		// This is our last attempt
		if attempt == r.policy.GetMaxAttempts()-1 {
			break
		}

		// Calculate delay
		delay := r.policy.GetDelay(attempt + 1)

		// Call retry callback if set
		if r.onRetry != nil {
			r.onRetry(err, attempt+1, delay)
		}

		// Wait for the delay period or context cancellation
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(delay):
			// Continue to next attempt
		}
	}

	return lastResult, lastErr
}

// DefaultRetryCallback provides a standard retry callback with progress indication
func DefaultRetryCallback(operation string) func(error, int, time.Duration) {
	return func(err error, attempt int, delay time.Duration) {
		pterm.Warning.Printf("⚠️  %s failed (attempt %d): %v\n", operation, attempt, err)
		pterm.Info.Printf("🔄 Retrying in %s...\n", delay.Round(time.Second))
	}
}

// QuietRetryCallback provides a minimal retry callback
func QuietRetryCallback() func(error, int, time.Duration) {
	return func(err error, attempt int, delay time.Duration) {
		pterm.Debug.Printf("Retry attempt %d after %v: %v\n", attempt, delay, err)
	}
}

// VerboseRetryCallback provides detailed retry information
func VerboseRetryCallback() func(error, int, time.Duration) {
	return func(err error, attempt int, delay time.Duration) {
		pterm.Warning.Printf("Operation failed on attempt %d: %v\n", attempt, err)
		pterm.Info.Printf("Waiting %s before retry attempt %d...\n", delay.Round(time.Millisecond), attempt+1)
		
		if recoverableErr, ok := err.(RecoverableError); ok && recoverableErr.IsRecoverable() {
			pterm.Debug.Printf("Error is recoverable with suggested retry after %v\n", recoverableErr.GetRetryAfter())
		}
	}
}

// Predefined retry policies for common scenarios

// NetworkRetryPolicy for network-related operations
func NetworkRetryPolicy() RetryPolicy {
	policy := NewExponentialBackoffPolicy(5, 2*time.Second)
	policy.MaxDelay = 30 * time.Second
	policy.RetryableErrs = map[string]bool{
		"network timeout":        true,
		"connection refused":     true,
		"connection reset":       true,
		"no route to host":       true,
		"dns resolution failed":  true,
		"tls handshake timeout": true,
	}
	return policy
}

// ResourceRetryPolicy for resource availability operations
func ResourceRetryPolicy() RetryPolicy {
	policy := NewExponentialBackoffPolicy(10, 5*time.Second)
	policy.MaxDelay = 2 * time.Minute
	policy.RetryableErrs = map[string]bool{
		"resource not ready":     true,
		"cluster not ready":      true,
		"service unavailable":    true,
		"temporarily unavailable": true,
		"resource busy":          true,
	}
	return policy
}

// InstallationRetryPolicy for installation operations
func InstallationRetryPolicy() RetryPolicy {
	policy := NewExponentialBackoffPolicy(3, 10*time.Second)
	policy.MaxDelay = 5 * time.Minute
	policy.RetryableErrs = map[string]bool{
		"helm not ready":         true,
		"tiller not ready":       true,
		"resource conflict":      true,
		"temporary failure":      true,
		"rate limited":           true,
	}
	return policy
}

// Helper functions

// IsRecoverable checks if an error is recoverable
func IsRecoverable(err error) bool {
	if recoverableErr, ok := err.(RecoverableError); ok {
		return recoverableErr.IsRecoverable()
	}
	return false
}

// contains checks if a string contains a substring (case-insensitive)
func contains(str, substr string) bool {
	return len(str) >= len(substr) && 
		   (str == substr || 
		   (len(str) > len(substr) && 
		    (str[:len(substr)] == substr || 
		     str[len(str)-len(substr):] == substr ||
		     containsSubstring(str, substr))))
}

func containsSubstring(str, substr string) bool {
	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}