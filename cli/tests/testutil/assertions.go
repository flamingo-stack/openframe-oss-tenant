package testutil

import (
	"strings"
	"testing"
	
	"github.com/stretchr/testify/assert"
)

// AssertCommandOutput contains common assertions for command output testing
type AssertCommandOutput struct {
	t      *testing.T
	stdout string
	stderr string
	err    error
}

// NewAssertCommandOutput creates a new command output asserter
func NewAssertCommandOutput(t *testing.T, stdout, stderr string, err error) *AssertCommandOutput {
	return &AssertCommandOutput{
		t:      t,
		stdout: stdout,
		stderr: stderr,
		err:    err,
	}
}

// NoError asserts no error occurred
func (a *AssertCommandOutput) NoError() *AssertCommandOutput {
	assert.NoError(a.t, a.err, "Unexpected error occurred")
	return a
}

// HasError asserts an error occurred
func (a *AssertCommandOutput) HasError() *AssertCommandOutput {
	assert.Error(a.t, a.err, "Expected error but got none")
	return a
}

// ErrorContains asserts error contains specific text
func (a *AssertCommandOutput) ErrorContains(text string) *AssertCommandOutput {
	if a.err != nil {
		assert.Contains(a.t, a.err.Error(), text, "Error should contain: %s", text)
	}
	return a
}

// StdoutContains asserts stdout contains specific text
func (a *AssertCommandOutput) StdoutContains(text string) *AssertCommandOutput {
	assert.Contains(a.t, a.stdout, text, "Stdout should contain: %s", text)
	return a
}

// StdoutEmpty asserts stdout is empty
func (a *AssertCommandOutput) StdoutEmpty() *AssertCommandOutput {
	assert.Empty(a.t, a.stdout, "Stdout should be empty")
	return a
}

// StderrContains asserts stderr contains specific text
func (a *AssertCommandOutput) StderrContains(text string) *AssertCommandOutput {
	assert.Contains(a.t, a.stderr, text, "Stderr should contain: %s", text)
	return a
}

// StderrContainsAny asserts stderr contains any of the specified texts
func (a *AssertCommandOutput) StderrContainsAny(texts ...string) *AssertCommandOutput {
	found := false
	for _, text := range texts {
		if strings.Contains(a.stderr, text) {
			found = true
			break
		}
	}
	assert.True(a.t, found, "Stderr should contain any of: %v", texts)
	return a
}

// StderrEmpty asserts stderr is empty
func (a *AssertCommandOutput) StderrEmpty() *AssertCommandOutput {
	assert.Empty(a.t, a.stderr, "Stderr should be empty")
	return a
}

// OutputContains asserts either stdout or stderr contains specific text
func (a *AssertCommandOutput) OutputContains(text string) *AssertCommandOutput {
	combined := a.stdout + a.stderr
	assert.Contains(a.t, combined, text, "Combined output should contain: %s", text)
	return a
}

// ContainsAll asserts stdout contains all specified texts
func (a *AssertCommandOutput) ContainsAll(texts ...string) *AssertCommandOutput {
	for _, text := range texts {
		a.StdoutContains(text)
	}
	return a
}

// Helper function for common pattern of checking command execution
func AssertCommandSuccess(t *testing.T, stdout, stderr string, err error) *AssertCommandOutput {
	return NewAssertCommandOutput(t, stdout, stderr, err).NoError().StderrEmpty()
}

func AssertCommandFailure(t *testing.T, stdout, stderr string, err error) *AssertCommandOutput {
	return NewAssertCommandOutput(t, stdout, stderr, err).HasError()
}