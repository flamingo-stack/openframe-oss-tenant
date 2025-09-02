package models

import (
	"fmt"
	"testing"

	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func TestInterceptFlags_DefaultValues(t *testing.T) {
	flags := &InterceptFlags{}
	
	// Test default values
	assert.Equal(t, 0, flags.Port, "Port should default to 0")
	assert.Equal(t, "", flags.Namespace, "Namespace should default to empty string")
	assert.Equal(t, "", flags.Mount, "Mount should default to empty string")
	assert.Equal(t, "", flags.EnvFile, "EnvFile should default to empty string")
	assert.False(t, flags.Global, "Global should default to false")
	assert.Nil(t, flags.Header, "Header should default to nil")
	assert.False(t, flags.Replace, "Replace should default to false")
	assert.Equal(t, "", flags.RemotePortName, "RemotePortName should default to empty string")
}

func TestInterceptFlags_WithValues(t *testing.T) {
	flags := &InterceptFlags{
		Port:           8080,
		Namespace:      "production",
		Mount:          "/tmp/mount",
		EnvFile:        ".env",
		Global:         true,
		Header:         []string{"key1=value1", "key2=value2"},
		Replace:        true,
		RemotePortName: "http",
	}
	
	// Test all values are set correctly
	assert.Equal(t, 8080, flags.Port)
	assert.Equal(t, "production", flags.Namespace)
	assert.Equal(t, "/tmp/mount", flags.Mount)
	assert.Equal(t, ".env", flags.EnvFile)
	assert.True(t, flags.Global)
	assert.Equal(t, []string{"key1=value1", "key2=value2"}, flags.Header)
	assert.True(t, flags.Replace)
	assert.Equal(t, "http", flags.RemotePortName)
}

func TestScaffoldFlags_DefaultValues(t *testing.T) {
	flags := &ScaffoldFlags{}
	
	// Test default values
	assert.Equal(t, "", flags.Image, "Image should default to empty string")
	assert.Equal(t, 0, flags.Port, "Port should default to 0")
	assert.Equal(t, "", flags.Namespace, "Namespace should default to empty string")
	assert.Equal(t, "", flags.SyncLocal, "SyncLocal should default to empty string")
	assert.Equal(t, "", flags.SyncRemote, "SyncRemote should default to empty string")
	assert.Equal(t, "", flags.ConfigMap, "ConfigMap should default to empty string")
	assert.Equal(t, "", flags.Secret, "Secret should default to empty string")
	assert.Equal(t, "", flags.ClusterName, "ClusterName should default to empty string")
	assert.False(t, flags.SkipBootstrap, "SkipBootstrap should default to false")
	assert.Equal(t, "", flags.HelmValuesFile, "HelmValuesFile should default to empty string")
}

func TestScaffoldFlags_WithValues(t *testing.T) {
	flags := &ScaffoldFlags{
		Image:           "my-app:v1.0.0",
		Port:            9090,
		Namespace:       "staging",
		SyncLocal:       "./src",
		SyncRemote:      "/app/src",
		ConfigMap:       "my-config",
		Secret:          "my-secret",
		ClusterName:     "dev-cluster",
		SkipBootstrap:   true,
		HelmValuesFile:  "values.yaml",
	}
	
	// Test all values are set correctly
	assert.Equal(t, "my-app:v1.0.0", flags.Image)
	assert.Equal(t, 9090, flags.Port)
	assert.Equal(t, "staging", flags.Namespace)
	assert.Equal(t, "./src", flags.SyncLocal)
	assert.Equal(t, "/app/src", flags.SyncRemote)
	assert.Equal(t, "my-config", flags.ConfigMap)
	assert.Equal(t, "my-secret", flags.Secret)
	assert.Equal(t, "dev-cluster", flags.ClusterName)
	assert.True(t, flags.SkipBootstrap)
	assert.Equal(t, "values.yaml", flags.HelmValuesFile)
}

func TestAddGlobalFlags(t *testing.T) {
	cmd := &cobra.Command{
		Use: "test",
	}
	
	// Test that AddGlobalFlags doesn't panic
	assert.NotPanics(t, func() {
		AddGlobalFlags(cmd)
	}, "AddGlobalFlags should not panic")
	
	// Test that flags are added
	_, err := cmd.PersistentFlags().GetBool("verbose")
	assert.NoError(t, err, "verbose flag should exist")
	
	_, err = cmd.PersistentFlags().GetBool("silent")
	assert.NoError(t, err, "silent flag should exist")
	
	_, err = cmd.PersistentFlags().GetBool("dry-run")
	assert.NoError(t, err, "dry-run flag should exist")
	
	// Test flag defaults
	verbose, err := cmd.PersistentFlags().GetBool("verbose")
	assert.NoError(t, err)
	assert.False(t, verbose, "verbose should default to false")
	
	silent, err := cmd.PersistentFlags().GetBool("silent")
	assert.NoError(t, err)
	assert.False(t, silent, "silent should default to false")
	
	dryRun, err := cmd.PersistentFlags().GetBool("dry-run")
	assert.NoError(t, err)
	assert.False(t, dryRun, "dry-run should default to false")
}

func TestFlags_EdgeCases(t *testing.T) {
	t.Run("InterceptFlags with empty header slice", func(t *testing.T) {
		flags := &InterceptFlags{
			Header: []string{},
		}
		assert.NotNil(t, flags.Header, "Header slice should not be nil")
		assert.Len(t, flags.Header, 0, "Header slice should be empty")
	})
	
	t.Run("InterceptFlags with single header", func(t *testing.T) {
		flags := &InterceptFlags{
			Header: []string{"single=header"},
		}
		assert.Len(t, flags.Header, 1, "Header slice should have one element")
		assert.Equal(t, "single=header", flags.Header[0])
	})
	
	t.Run("ScaffoldFlags with zero port", func(t *testing.T) {
		flags := &ScaffoldFlags{
			Port: 0,
		}
		assert.Equal(t, 0, flags.Port, "Port can be zero")
	})
	
	t.Run("ScaffoldFlags with negative port", func(t *testing.T) {
		flags := &ScaffoldFlags{
			Port: -1,
		}
		assert.Equal(t, -1, flags.Port, "Port can be negative (validation happens elsewhere)")
	})
}

func TestFlags_StringRepresentation(t *testing.T) {
	t.Run("InterceptFlags string format", func(t *testing.T) {
		flags := &InterceptFlags{
			Port:      8080,
			Namespace: "default",
		}
		
		// Test that the struct can be used in string formatting
		str := fmt.Sprintf("%+v", flags)
		assert.Contains(t, str, "Port:8080", "String representation should contain Port")
		assert.Contains(t, str, "Namespace:default", "String representation should contain Namespace")
	})
	
	t.Run("ScaffoldFlags string format", func(t *testing.T) {
		flags := &ScaffoldFlags{
			Image: "test:latest",
			Port:  9000,
		}
		
		// Test that the struct can be used in string formatting
		str := fmt.Sprintf("%+v", flags)
		assert.Contains(t, str, "Image:test:latest", "String representation should contain Image")
		assert.Contains(t, str, "Port:9000", "String representation should contain Port")
	})
}