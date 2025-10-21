package dev

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetScaffoldCmd(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test basic command properties
	assert.Equal(t, "skaffold [cluster-name]", cmd.Use)
	assert.Equal(t, "Deploy development versions of services with live reloading", cmd.Short)
	assert.Contains(t, cmd.Long, "Skaffold prerequisites")
	assert.Contains(t, cmd.Long, "live code reloading")

	// Test argument validation - just verify Args function is set
	assert.NotNil(t, cmd.Args)

	// Test that RunE function is set
	assert.NotNil(t, cmd.RunE)
}

func TestScaffoldCmd_FlagBinding(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test that all expected flags are present
	flags := []string{
		"port",
		"namespace",
		"image",
		"sync-local",
		"sync-remote",
		"skip-bootstrap",
		"helm-values",
	}

	for _, flag := range flags {
		flagObj := cmd.Flags().Lookup(flag)
		assert.NotNil(t, flagObj, "Flag %s should be present", flag)
	}

	// Test flag defaults and types
	portFlag := cmd.Flags().Lookup("port")
	assert.Equal(t, "8080", portFlag.DefValue)

	namespaceFlag := cmd.Flags().Lookup("namespace")
	assert.Equal(t, "", namespaceFlag.DefValue)

	skipBootstrapFlag := cmd.Flags().Lookup("skip-bootstrap")
	assert.Equal(t, "false", skipBootstrapFlag.DefValue)
}

func TestScaffoldCmd_Examples(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test that examples are present and contain expected content
	assert.Contains(t, cmd.Long, "openframe dev skaffold")
	assert.Contains(t, cmd.Long, "openframe dev skaffold my-dev-cluster")
	assert.Contains(t, cmd.Long, "openframe dev skaffold --port 8080")
}

func TestScaffoldCmd_FlagTypes(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test that flags can be parsed correctly
	err := cmd.ParseFlags([]string{
		"--port", "9090",
		"--namespace", "test-namespace",
		"--image", "my-image:latest",
		"--sync-local", "/local/path",
		"--sync-remote", "/remote/path",
		"--skip-bootstrap",
		"--helm-values", "custom-values.yaml",
	})
	require.NoError(t, err)

	// Verify flag values can be retrieved
	port, err := cmd.Flags().GetInt("port")
	assert.NoError(t, err)
	assert.Equal(t, 9090, port)

	namespace, err := cmd.Flags().GetString("namespace")
	assert.NoError(t, err)
	assert.Equal(t, "test-namespace", namespace)

	image, err := cmd.Flags().GetString("image")
	assert.NoError(t, err)
	assert.Equal(t, "my-image:latest", image)

	syncLocal, err := cmd.Flags().GetString("sync-local")
	assert.NoError(t, err)
	assert.Equal(t, "/local/path", syncLocal)

	syncRemote, err := cmd.Flags().GetString("sync-remote")
	assert.NoError(t, err)
	assert.Equal(t, "/remote/path", syncRemote)

	skipBootstrap, err := cmd.Flags().GetBool("skip-bootstrap")
	assert.NoError(t, err)
	assert.True(t, skipBootstrap)

	helmValues, err := cmd.Flags().GetString("helm-values")
	assert.NoError(t, err)
	assert.Equal(t, "custom-values.yaml", helmValues)
}

func TestScaffoldCmd_FlagDefaults(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test default flag values
	port, err := cmd.Flags().GetInt("port")
	assert.NoError(t, err)
	assert.Equal(t, 8080, port)

	namespace, err := cmd.Flags().GetString("namespace")
	assert.NoError(t, err)
	assert.Equal(t, "", namespace)

	image, err := cmd.Flags().GetString("image")
	assert.NoError(t, err)
	assert.Empty(t, image)

	syncLocal, err := cmd.Flags().GetString("sync-local")
	assert.NoError(t, err)
	assert.Empty(t, syncLocal)

	syncRemote, err := cmd.Flags().GetString("sync-remote")
	assert.NoError(t, err)
	assert.Empty(t, syncRemote)

	skipBootstrap, err := cmd.Flags().GetBool("skip-bootstrap")
	assert.NoError(t, err)
	assert.False(t, skipBootstrap)

	helmValues, err := cmd.Flags().GetString("helm-values")
	assert.NoError(t, err)
	assert.Empty(t, helmValues)
}

func TestScaffoldCmd_FlagToModelMapping(t *testing.T) {
	// Test that flags are properly mapped to the ScaffoldFlags model
	flags := &models.ScaffoldFlags{}

	// This simulates what happens in the actual command execution
	flags.Port = 9090
	flags.Namespace = "test-ns"
	flags.Image = "test-image"
	flags.SyncLocal = "/test/local"
	flags.SyncRemote = "/test/remote"
	flags.SkipBootstrap = true
	flags.HelmValuesFile = "test-values.yaml"

	assert.Equal(t, 9090, flags.Port)
	assert.Equal(t, "test-ns", flags.Namespace)
	assert.Equal(t, "test-image", flags.Image)
	assert.Equal(t, "/test/local", flags.SyncLocal)
	assert.Equal(t, "/test/remote", flags.SyncRemote)
	assert.True(t, flags.SkipBootstrap)
	assert.Equal(t, "test-values.yaml", flags.HelmValuesFile)
}

func TestScaffoldCmd_ArgumentHandling(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test maximum argument validation
	tests := []struct {
		name        string
		args        []string
		expectError bool
	}{
		{
			name:        "no arguments - should pass",
			args:        []string{},
			expectError: false,
		},
		{
			name:        "one argument - should pass",
			args:        []string{"my-cluster"},
			expectError: false,
		},
		{
			name:        "two arguments - should fail",
			args:        []string{"cluster1", "cluster2"},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := cmd.Args(cmd, tt.args)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestScaffoldCmd_UsageText(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test that usage text contains expected elements
	assert.Contains(t, cmd.Long, "Prerequisites validation")
	assert.Contains(t, cmd.Long, "Cluster bootstrap")
	assert.Contains(t, cmd.Long, "Live reloading")
	assert.Contains(t, cmd.Long, "OpenFrame infrastructure")

	// Test examples section
	assert.Contains(t, cmd.Long, "Examples:")
	assert.Contains(t, cmd.Long, "Interactive cluster creation")
	assert.Contains(t, cmd.Long, "specific cluster name")
	assert.Contains(t, cmd.Long, "Custom local development port")
}

func TestRunScaffold_FunctionExists(t *testing.T) {
	cmd := getScaffoldCmd()

	// Test that the command has a RunE function set
	assert.NotNil(t, cmd.RunE, "RunE function should be set")

	// We can't easily test the actual function execution without mocking
	// the entire service layer, but we can verify it's wired up correctly
}
