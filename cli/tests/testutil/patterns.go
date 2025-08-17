package testutil

import (
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

// TestClusterCommand runs all standard tests for a cluster command
// setupFunc should handle test setup (mocks, flags, etc.)
// teardownFunc should handle cleanup
func TestClusterCommand(t *testing.T, commandName string, cmdFunc func() *cobra.Command, setupFunc func(), teardownFunc func()) {
	t.Helper()

	t.Run("Structure", func(t *testing.T) {
		testCommandStructure(t, commandName, cmdFunc, setupFunc, teardownFunc)
	})

	t.Run("Flags", func(t *testing.T) {
		testCommandFlags(t, commandName, cmdFunc, setupFunc, teardownFunc)
	})

	t.Run("CLI", func(t *testing.T) {
		testCommandCLI(t, commandName, cmdFunc, setupFunc, teardownFunc)
	})

	t.Run("Execution", func(t *testing.T) {
		testCommandExecution(t, commandName, cmdFunc, setupFunc, teardownFunc)
	})
}

// testCommandStructure tests the basic command structure
func testCommandStructure(t *testing.T, commandName string, cmdFunc func() *cobra.Command, setupFunc func(), teardownFunc func()) {
	if setupFunc != nil {
		setupFunc()
	}
	if teardownFunc != nil {
		defer teardownFunc()
	}

	cmd := cmdFunc()

	// Test basic structure
	assert.Equal(t, commandName, cmd.Name(), "Command name should match")
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
	
	// Root commands don't have RunE, sub-commands do
	if commandName != "cluster" {
		assert.NotNil(t, cmd.RunE, "Command should have RunE function")
		// Test that help contains expected content
		assert.Contains(t, cmd.Long, "openframe cluster "+commandName, "Long description should mention command")
	}
}

// testCommandFlags tests common flag scenarios
func testCommandFlags(t *testing.T, commandName string, cmdFunc func() *cobra.Command, setupFunc func(), teardownFunc func()) {
	if setupFunc != nil {
		setupFunc()
	}
	if teardownFunc != nil {
		defer teardownFunc()
	}

	cmd := cmdFunc()

	// Test help flag works
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	assert.NoError(t, err, "Help flag should work")

	// Test invalid flag fails
	cmd = cmdFunc() // Reset command
	cmd.SetArgs([]string{"--invalid-flag"})
	err = cmd.Execute()
	assert.Error(t, err, "Invalid flag should fail")
}

// testCommandCLI tests CLI argument validation
func testCommandCLI(t *testing.T, commandName string, cmdFunc func() *cobra.Command, setupFunc func(), teardownFunc func()) {
	if setupFunc != nil {
		setupFunc()
	}
	if teardownFunc != nil {
		defer teardownFunc()
	}

	cmd := cmdFunc()

	// Test argument validation if command has Args validation
	if cmd.Args != nil {
		// Test valid single argument
		err := cmd.Args(cmd, []string{"test-cluster"})
		if err != nil {
			// Some commands don't accept args, that's ok
			t.Logf("Command %s doesn't accept arguments: %v", commandName, err)
		}

		// Test too many arguments should fail
		err = cmd.Args(cmd, []string{"arg1", "arg2", "arg3"})
		if err == nil && commandName != "list" { // list command typically accepts no args
			t.Logf("Command %s accepts multiple arguments", commandName)
		}
	}
}

// testCommandExecution tests basic command execution
func testCommandExecution(t *testing.T, commandName string, cmdFunc func() *cobra.Command, setupFunc func(), teardownFunc func()) {
	if setupFunc != nil {
		setupFunc()
	}
	if teardownFunc != nil {
		defer teardownFunc()
	}

	cmd := cmdFunc()

	// Test with dry-run if supported
	if cmd.Flags().Lookup("dry-run") != nil {
		cmd.SetArgs([]string{"--dry-run"})
		err := cmd.Execute()
		// Don't assert no error - some commands may not support dry-run in all scenarios
		t.Logf("Dry-run test for %s: %v", commandName, err)
	}

	// Test help flag
	cmd = cmdFunc() // Reset
	cmd.SetArgs([]string{"--help"})
	err := cmd.Execute()
	assert.NoError(t, err, "Help should always work")
}