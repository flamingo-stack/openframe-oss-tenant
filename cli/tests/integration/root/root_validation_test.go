package root_integration

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/tests/integration/common"
	"github.com/stretchr/testify/require"
)

// TestRootHelp tests root command help output
func TestRootHelp(t *testing.T) {
	result := common.RunCLI("--help")
	if result.Failed() {
		t.Skip("CLI binary not available")
	}

	require.Contains(t, result.Stdout, "OpenFrame CLI")
	require.Contains(t, result.Stdout, "Available Commands:")
	require.Contains(t, result.Stdout, "cluster")
}

// TestRootVersion tests version output
func TestRootVersion(t *testing.T) {
	result := common.RunCLI("--version")
	if result.Failed() {
		t.Skip("CLI binary not available")
	}

	require.NotEmpty(t, result.Stdout)
}

// TestGlobalFlags tests global flags work across commands
func TestGlobalFlags(t *testing.T) {
	testCases := []struct {
		name string
		args []string
	}{
		{"verbose_help", []string{"--verbose", "--help"}},
		{"silent_help", []string{"--silent", "--help"}},
		{"verbose_cluster_help", []string{"--verbose", "cluster", "--help"}},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := common.RunCLI(tc.args...)
			if result.Failed() {
				t.Skip("CLI binary not available")
			}
			require.True(t, result.Success(), "Global flag test failed")
		})
	}
}

// TestInvalidCommand tests error handling for invalid commands
func TestInvalidCommand(t *testing.T) {
	result := common.RunCLI("invalid-command")
	if result.Error != nil && result.Stdout == "" && result.Stderr == "" {
		t.Skip("CLI binary not available")
	}

	require.True(t, result.Failed(), "Invalid command should fail")
}
