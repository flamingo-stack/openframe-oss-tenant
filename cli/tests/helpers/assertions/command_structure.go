package assertions

import (
	"testing"
	
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

// CommandStructure provides a standard test for command structure
type CommandStructure struct {
	Name         string
	Use          string
	Short        string
	Aliases      []string
	HasRunE      bool
	HasArgs      bool
	LongContains []string
}

// TestCommand runs standard structure tests for a command
func (cs CommandStructure) TestCommand(t *testing.T, cmd *cobra.Command) {
	t.Helper()
	
	// Basic properties
	assert.Equal(t, cs.Use, cmd.Use, "Command Use mismatch")
	assert.Equal(t, cs.Short, cmd.Short, "Command Short description mismatch")
	if len(cs.Aliases) > 0 {
		assert.Equal(t, cs.Aliases, cmd.Aliases, "Command aliases mismatch")
	}
	
	// Structure
	if cs.HasRunE {
		assert.NotNil(t, cmd.RunE, "Command should have RunE function")
	}
	if cs.HasArgs {
		assert.NotNil(t, cmd.Args, "Command should have Args validation")
	}
	
	// Content
	for _, content := range cs.LongContains {
		assert.Contains(t, cmd.Long, content, "Long description missing expected content: %s", content)
	}
	
	// Common validations
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
}