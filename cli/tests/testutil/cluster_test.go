package testutil

import (
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestTestCommandStructure(t *testing.T) {
	cmd := &cobra.Command{
		Use:   "test-cmd",
		Short: "Test command description",
		Long:  "This is a long description",
		RunE: func(cmd *cobra.Command, args []string) error {
			return nil
		},
	}

	assert.NotPanics(t, func() {
		TestCommandStructure(t, cmd, "test-cmd", "Test command description")
	})
}

func TestTestCLICommand_Success(t *testing.T) {
	cmd := &cobra.Command{
		Use: "test",
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.Print("Hello World")
			return nil
		},
	}

	assert.NotPanics(t, func() {
		TestCLICommand(t, cmd, []string{}, false, "Hello World")
	})
}

func TestTestFlags(t *testing.T) {
	flags := TestFlags()
	assert.NotNil(t, flags)
}

func TestIntegrationFlags(t *testing.T) {
	flags := IntegrationFlags()
	assert.NotNil(t, flags)
}