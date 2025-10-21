package chart

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func init() {
	testutil.InitializeTestMode()
}

func TestChartRootCommand(t *testing.T) {
	// Test the root chart command - using basic structure test since TestClusterCommand
	// is designed specifically for cluster commands
	cmd := GetChartCmd()

	// Test basic structure
	assert.Equal(t, "chart", cmd.Name(), "Command name should match")
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
	assert.NotNil(t, cmd.RunE, "Chart root command should have RunE function")

	// Test that help contains expected content
	assert.Contains(t, cmd.Short, "Manage Helm charts")
	assert.Contains(t, cmd.Long, "chart lifecycle management")
}
