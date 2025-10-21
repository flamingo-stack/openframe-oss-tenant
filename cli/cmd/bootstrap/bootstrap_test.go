package bootstrap

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func init() {
	testutil.InitializeTestMode()
}

func TestBootstrapCommand(t *testing.T) {
	// Test bootstrap command structure manually since it's not a cluster subcommand
	cmd := GetBootstrapCmd()

	// Test basic structure
	assert.Equal(t, "bootstrap", cmd.Name(), "Command name should match")
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
	assert.NotNil(t, cmd.RunE, "Bootstrap command should have RunE function")
}

func TestBootstrapCommandStructure(t *testing.T) {
	cmd := GetBootstrapCmd()

	// Test bootstrap-specific structure
	assert.Equal(t, "bootstrap [cluster-name]", cmd.Use)
	assert.Empty(t, cmd.Aliases, "Bootstrap doesn't have aliases currently")

	// Test that command has no subcommands (it's a leaf command)
	assert.Empty(t, cmd.Commands(), "Bootstrap command should have no subcommands")

	// Test bootstrap-specific content
	assert.Contains(t, cmd.Short, "Bootstrap complete OpenFrame environment")
	assert.Contains(t, cmd.Long, "This command performs a complete OpenFrame setup")
	assert.Contains(t, cmd.Long, "openframe cluster create")
	assert.Contains(t, cmd.Long, "openframe chart install")

	// Test examples are present
	assert.Contains(t, cmd.Long, "Examples:")
	assert.Contains(t, cmd.Long, "openframe bootstrap")

	// Test that it has RunE function (it's an executable command)
	assert.NotNil(t, cmd.RunE, "Bootstrap command should have RunE function")
}

func TestBootstrapArgumentValidation(t *testing.T) {
	cmd := GetBootstrapCmd()

	// Test argument validation - should accept 0 or 1 argument
	if cmd.Args != nil {
		// Test valid cases
		err := cmd.Args(cmd, []string{})
		assert.NoError(t, err, "Should accept no arguments")

		err = cmd.Args(cmd, []string{"test-cluster"})
		assert.NoError(t, err, "Should accept one argument")

		// Test invalid case - too many arguments
		err = cmd.Args(cmd, []string{"arg1", "arg2"})
		assert.Error(t, err, "Should reject more than one argument")
	}
}
