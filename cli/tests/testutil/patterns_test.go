package testutil

import (
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestTestClusterCommand(t *testing.T) {
	setupCalled := false
	teardownCalled := false

	setupFunc := func() {
		setupCalled = true
	}

	teardownFunc := func() {
		teardownCalled = true
	}

	cmdFunc := func() *cobra.Command {
		return &cobra.Command{
			Use:   "test-cmd",
			Short: "A test command",
			Long:  "This is a test command for openframe cluster test-cmd",
			RunE: func(cmd *cobra.Command, args []string) error {
				return nil
			},
		}
	}

	TestClusterCommand(t, "test-cmd", cmdFunc, setupFunc, teardownFunc)

	assert.True(t, setupCalled)
	assert.True(t, teardownCalled)
}