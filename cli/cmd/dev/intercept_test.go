package dev

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestGetInterceptCmd(t *testing.T) {
	cmd := getInterceptCmd()

	// Test command properties
	assert.Contains(t, cmd.Use, "intercept")
	assert.Equal(t, "Intercept cluster traffic to local development environment", cmd.Short)
	assert.Contains(t, cmd.Long, "Telepresence")
	assert.NotNil(t, cmd.Args, "Args validation function should be set")

	// Test flags exist by trying to get them (nil error means flag exists)
	_, err := cmd.Flags().GetInt("port")
	assert.NoError(t, err, "port flag should exist")

	_, err = cmd.Flags().GetString("namespace")
	assert.NoError(t, err, "namespace flag should exist")

	_, err = cmd.Flags().GetString("mount")
	assert.NoError(t, err, "mount flag should exist")

	_, err = cmd.Flags().GetString("env-file")
	assert.NoError(t, err, "env-file flag should exist")

	_, err = cmd.Flags().GetBool("global")
	assert.NoError(t, err, "global flag should exist")

	_, err = cmd.Flags().GetStringSlice("header")
	assert.NoError(t, err, "header flag should exist")

	_, err = cmd.Flags().GetBool("replace")
	assert.NoError(t, err, "replace flag should exist")

	_, err = cmd.Flags().GetString("remote-port")
	assert.NoError(t, err, "remote-port flag should exist")

	// Test flag defaults
	port, err := cmd.Flags().GetInt("port")
	assert.NoError(t, err)
	assert.Equal(t, 8080, port)

	namespace, err := cmd.Flags().GetString("namespace")
	assert.NoError(t, err)
	assert.Equal(t, "default", namespace)

	global, err := cmd.Flags().GetBool("global")
	assert.NoError(t, err)
	assert.False(t, global)

	replace, err := cmd.Flags().GetBool("replace")
	assert.NoError(t, err)
	assert.False(t, replace)
}

func TestInterceptCmd_FlagBinding(t *testing.T) {
	cmd := getInterceptCmd()
	flags := &models.InterceptFlags{}

	// Simulate flag parsing
	cmd.Flags().Set("port", "9090")
	cmd.Flags().Set("namespace", "production")
	cmd.Flags().Set("mount", "/tmp/mount")
	cmd.Flags().Set("env-file", ".env.test")
	cmd.Flags().Set("global", "true")
	cmd.Flags().Set("header", "key1=value1,key2=value2")
	cmd.Flags().Set("replace", "true")
	cmd.Flags().Set("remote-port", "http")

	// Get flag values manually (simulating what the RunE function would do)
	port, _ := cmd.Flags().GetInt("port")
	namespace, _ := cmd.Flags().GetString("namespace")
	mount, _ := cmd.Flags().GetString("mount")
	envFile, _ := cmd.Flags().GetString("env-file")
	global, _ := cmd.Flags().GetBool("global")
	headers, _ := cmd.Flags().GetStringSlice("header")
	replace, _ := cmd.Flags().GetBool("replace")
	remotePort, _ := cmd.Flags().GetString("remote-port")

	// Populate flags struct
	flags.Port = port
	flags.Namespace = namespace
	flags.Mount = mount
	flags.EnvFile = envFile
	flags.Global = global
	flags.Header = headers
	flags.Replace = replace
	flags.RemotePortName = remotePort

	// Assert values are correctly bound
	assert.Equal(t, 9090, flags.Port)
	assert.Equal(t, "production", flags.Namespace)
	assert.Equal(t, "/tmp/mount", flags.Mount)
	assert.Equal(t, ".env.test", flags.EnvFile)
	assert.True(t, flags.Global)
	assert.Equal(t, []string{"key1=value1", "key2=value2"}, flags.Header)
	assert.True(t, flags.Replace)
	assert.Equal(t, "http", flags.RemotePortName)
}

func TestInterceptCmd_Examples(t *testing.T) {
	cmd := getInterceptCmd()

	// Check that examples are present in the long description
	assert.Contains(t, cmd.Long, "openframe dev intercept my-service --port 8080")
	assert.Contains(t, cmd.Long, "openframe dev intercept my-service --port 8080 --namespace my-namespace")
	assert.Contains(t, cmd.Long, "openframe dev intercept my-service --mount /tmp/volumes --env-file .env")
}

func TestInterceptCmd_PreRunE(t *testing.T) {
	// Initialize test mode to avoid UI issues
	testutil.InitializeTestMode()

	cmd := getInterceptCmd()

	// PreRunE should not exist on intercept cmd (handled by parent dev command)
	assert.Nil(t, cmd.PreRunE)

	// But the command should still be valid
	assert.NotNil(t, cmd.RunE)
}
