package testutil

import (
	"bytes"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

// TestCommandStructure validates basic command properties
func TestCommandStructure(t *testing.T, cmd *cobra.Command, use, short string) {
	t.Helper()
	assert.Equal(t, use, cmd.Use, "Command Use mismatch")
	assert.Equal(t, short, cmd.Short, "Command Short description mismatch")
	assert.NotNil(t, cmd.RunE, "Command should have RunE function")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
}

// TestCLICommand executes a command and validates output
func TestCLICommand(t *testing.T, cmd *cobra.Command, args []string, expectErr bool, contains ...string) {
	t.Helper()
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs(args)

	err := cmd.Execute()
	if expectErr {
		assert.Error(t, err)
	} else {
		assert.NoError(t, err)
	}

	output := out.String()
	for _, content := range contains {
		assert.Contains(t, output, content)
	}
}

// TestFlags creates a flag container for testing
func TestFlags() *cluster.FlagContainer {
	return CreateStandardTestFlags()
}

// IntegrationFlags creates a flag container for integration tests
func IntegrationFlags() *cluster.FlagContainer {
	return CreateIntegrationTestFlags()
}
