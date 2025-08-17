package assertions

import (
	"testing"
	
	"github.com/stretchr/testify/assert"
)

// CommandOutput contains common assertions for command output testing
type CommandOutput struct {
	t      *testing.T
	stdout string
	stderr string
	err    error
}

// NewCommandOutput creates a new command output asserter
func NewCommandOutput(t *testing.T, stdout, stderr string, err error) *CommandOutput {
	return &CommandOutput{
		t:      t,
		stdout: stdout,
		stderr: stderr,
		err:    err,
	}
}

// NoError asserts no error occurred
func (a *CommandOutput) NoError() *CommandOutput {
	assert.NoError(a.t, a.err, "Unexpected error occurred")
	return a
}

// HasError asserts an error occurred
func (a *CommandOutput) HasError() *CommandOutput {
	assert.Error(a.t, a.err, "Expected error but got none")
	return a
}

// ErrorContains asserts error contains specific text
func (a *CommandOutput) ErrorContains(text string) *CommandOutput {
	if a.err != nil {
		assert.Contains(a.t, a.err.Error(), text, "Error should contain: %s", text)
	}
	return a
}

// StdoutContains asserts stdout contains specific text
func (a *CommandOutput) StdoutContains(text string) *CommandOutput {
	assert.Contains(a.t, a.stdout, text, "Stdout should contain: %s", text)
	return a
}

// StdoutEmpty asserts stdout is empty
func (a *CommandOutput) StdoutEmpty() *CommandOutput {
	assert.Empty(a.t, a.stdout, "Stdout should be empty")
	return a
}

// StderrContains asserts stderr contains specific text
func (a *CommandOutput) StderrContains(text string) *CommandOutput {
	assert.Contains(a.t, a.stderr, text, "Stderr should contain: %s", text)
	return a
}

// StderrEmpty asserts stderr is empty
func (a *CommandOutput) StderrEmpty() *CommandOutput {
	assert.Empty(a.t, a.stderr, "Stderr should be empty")
	return a
}

// OutputContains asserts either stdout or stderr contains specific text
func (a *CommandOutput) OutputContains(text string) *CommandOutput {
	combined := a.stdout + a.stderr
	assert.Contains(a.t, combined, text, "Combined output should contain: %s", text)
	return a
}

// ContainsAll asserts stdout contains all specified texts
func (a *CommandOutput) ContainsAll(texts ...string) *CommandOutput {
	for _, text := range texts {
		a.StdoutContains(text)
	}
	return a
}

// Helper functions for common patterns
func AssertSuccess(t *testing.T, stdout, stderr string, err error) *CommandOutput {
	return NewCommandOutput(t, stdout, stderr, err).NoError().StderrEmpty()
}

func AssertFailure(t *testing.T, stdout, stderr string, err error) *CommandOutput {
	return NewCommandOutput(t, stdout, stderr, err).HasError()
}