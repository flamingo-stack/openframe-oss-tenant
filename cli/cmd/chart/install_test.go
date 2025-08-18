package chart

import (
	"testing"

	"github.com/flamingo/openframe/internal/chart/utils"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func init() {
	testutil.InitializeTestMode()
}

func TestInstallCommand(t *testing.T) {
	// Initialize global flags for testing
	utils.InitGlobalFlags()
	
	cmd := getInstallCmd()
	
	// Test basic structure
	assert.Equal(t, "install", cmd.Name(), "Command name should match")
	assert.NotEmpty(t, cmd.Short, "Command should have short description")
	assert.NotEmpty(t, cmd.Long, "Command should have long description")
	assert.NotNil(t, cmd.RunE, "Install command should have RunE function")
}

func TestInstallCommandFlags(t *testing.T) {
	cmd := getInstallCmd()
	
	// Test that required flags exist
	assert.NotNil(t, cmd.Flags().Lookup("force"), "Should have force flag")
	assert.NotNil(t, cmd.Flags().Lookup("dry-run"), "Should have dry-run flag")
	
	// Test flag shorthand
	forceFlag := cmd.Flags().Lookup("force")
	assert.Equal(t, "f", forceFlag.Shorthand, "Force flag should have 'f' shorthand")
}

func TestInstallCommandHelp(t *testing.T) {
	cmd := getInstallCmd()
	
	// Test that help contains expected content
	assert.Contains(t, cmd.Short, "Install ArgoCD and app-of-apps")
	assert.Contains(t, cmd.Long, "ArgoCD (version 8.1.4)")
	assert.Contains(t, cmd.Long, "App-of-Apps pattern")
}