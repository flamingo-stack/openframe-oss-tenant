package testutil

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAssertCommandSuccess(t *testing.T) {
	result := AssertCommandSuccess(t, "success output", "", nil)
	assert.NotNil(t, result)
	assert.IsType(t, &AssertCommandOutput{}, result)
}

func TestAssertCommandFailure(t *testing.T) {
	result := AssertCommandFailure(t, "output", "error", errors.New("failed"))
	assert.NotNil(t, result)
	assert.IsType(t, &AssertCommandOutput{}, result)
}

func TestAssertCommandOutput_StdoutContains(t *testing.T) {
	output := &AssertCommandOutput{
		t:      t,
		stdout: "Hello World",
		stderr: "",
	}

	result := output.StdoutContains("Hello")
	assert.Equal(t, output, result)
}

func TestAssertCommandOutput_StderrContains(t *testing.T) {
	output := &AssertCommandOutput{
		t:      t,
		stdout: "",
		stderr: "error message",
	}

	result := output.StderrContains("error")
	assert.Equal(t, output, result)
}

func TestAssertCommandOutput_OutputContains(t *testing.T) {
	output := &AssertCommandOutput{
		t:      t,
		stdout: "stdout",
		stderr: "stderr",
	}

	result := output.OutputContains("stdout")
	assert.Equal(t, output, result)
}