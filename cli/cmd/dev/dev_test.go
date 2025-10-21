package dev

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestGetDevCmd(t *testing.T) {
	cmd := GetDevCmd()

	// Test command properties
	assert.Equal(t, "dev", cmd.Use)
	assert.Equal(t, []string{"d"}, cmd.Aliases)
	assert.Equal(t, "Development tools for local Kubernetes workflows", cmd.Short)
	assert.Contains(t, cmd.Long, "Telepresence")
	assert.Contains(t, cmd.Long, "skaffold")

	// Test subcommands exist
	subcommands := cmd.Commands()
	assert.Len(t, subcommands, 2) // intercept and skaffold commands

	var interceptCmd *cobra.Command
	var skaffoldCmd *cobra.Command
	for _, subcmd := range subcommands {
		switch subcmd.Name() {
		case "intercept":
			interceptCmd = subcmd
		case "skaffold":
			skaffoldCmd = subcmd
		}
	}

	assert.NotNil(t, interceptCmd, "intercept subcommand should exist")
	assert.NotNil(t, skaffoldCmd, "skaffold subcommand should exist")

	// Test that the dev command has the expected global flags by trying to get them
	_, err := cmd.PersistentFlags().GetBool("verbose")
	assert.NoError(t, err, "verbose flag should exist")

	_, err = cmd.PersistentFlags().GetBool("silent")
	assert.NoError(t, err, "silent flag should exist")

	_, err = cmd.PersistentFlags().GetBool("dry-run")
	assert.NoError(t, err, "dry-run flag should exist")
}

func TestDevCmd_Examples(t *testing.T) {
	cmd := GetDevCmd()

	// Check that examples are present in the long description
	assert.Contains(t, cmd.Long, "openframe dev intercept my-service")
	assert.Contains(t, cmd.Long, "openframe dev skaffold my-service")
}

func TestDevCmd_RunE(t *testing.T) {
	// Initialize test mode to avoid UI issues
	testutil.InitializeTestMode()

	cmd := GetDevCmd()

	// RunE should exist and show help when no subcommand is provided
	assert.NotNil(t, cmd.RunE)

	// Test that RunE doesn't error when called without args (should show help)
	// Note: This will show help and return nil, which is expected behavior
	err := cmd.RunE(cmd, []string{})
	assert.NoError(t, err)
}

func TestDevCmd_GlobalFlags(t *testing.T) {
	cmd := GetDevCmd()

	// Test global flag defaults
	verbose, err := cmd.PersistentFlags().GetBool("verbose")
	assert.NoError(t, err)
	assert.False(t, verbose)

	silent, err := cmd.PersistentFlags().GetBool("silent")
	assert.NoError(t, err)
	assert.False(t, silent)

	dryRun, err := cmd.PersistentFlags().GetBool("dry-run")
	assert.NoError(t, err)
	assert.False(t, dryRun)
}

func TestDevCmd_FlagInheritance(t *testing.T) {
	cmd := GetDevCmd()

	// Test that subcommands inherit global flags
	var interceptCmd *cobra.Command
	for _, subcmd := range cmd.Commands() {
		if subcmd.Name() == "intercept" {
			interceptCmd = subcmd
			break
		}
	}

	assert.NotNil(t, interceptCmd, "intercept command should exist")
	assert.Equal(t, "intercept", interceptCmd.Name())

	// Test inherited flags by trying to get them
	_, err := interceptCmd.InheritedFlags().GetBool("verbose")
	assert.NoError(t, err, "verbose flag should be inherited")

	_, err = interceptCmd.InheritedFlags().GetBool("silent")
	assert.NoError(t, err, "silent flag should be inherited")

	_, err = interceptCmd.InheritedFlags().GetBool("dry-run")
	assert.NoError(t, err, "dry-run flag should be inherited")
}
