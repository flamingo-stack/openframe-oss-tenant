package common

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInitializeCLI(t *testing.T) {
	err := InitializeCLI()
	defer CleanupCLI()
	
	require.NoError(t, err)
	assert.NotEmpty(t, cliBinary)
	
	// Verify binary exists
	_, err = os.Stat(cliBinary)
	assert.NoError(t, err)
}

func TestRunCLI_Help(t *testing.T) {
	err := InitializeCLI()
	require.NoError(t, err)
	defer CleanupCLI()
	
	result := RunCLI("--help")
	
	assert.True(t, result.Success())
	assert.Contains(t, result.Stdout, "OpenFrame CLI")
}

func TestRunCLI_Error(t *testing.T) {
	err := InitializeCLI()
	require.NoError(t, err)
	defer CleanupCLI()
	
	result := RunCLI("--invalid-flag")
	
	assert.True(t, result.Failed())
	assert.NotZero(t, result.ExitCode)
}

func TestCLIResult_Methods(t *testing.T) {
	result := &CLIResult{
		Stdout:   "test output",
		Stderr:   "test error",
		ExitCode: 1,
		Error:    assert.AnError,
	}
	
	assert.False(t, result.Success())
	assert.True(t, result.Failed())
	assert.Equal(t, "test outputtest error", result.Output())
}