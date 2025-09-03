package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDependency_IsAvailable(t *testing.T) {
	// Test with a command that should exist
	dep := &Dependency{
		Name:     "echo command",
		CheckCmd: []string{"echo", "test"},
	}
	
	assert.True(t, dep.IsAvailable())
	
	// Test with a command that shouldn't exist
	dep = &Dependency{
		Name:     "nonexistent command",
		CheckCmd: []string{"this-command-does-not-exist"},
	}
	
	assert.False(t, dep.IsAvailable())
}

func TestDependency_RequireOrSkip(t *testing.T) {
	// Test with available dependency
	dep := &Dependency{
		Name:       "echo command",
		CheckCmd:   []string{"echo", "test"},
		InstallMsg: "Install echo",
	}
	
	// Should not skip
	assert.NotPanics(t, func() {
		dep.RequireOrSkip(t, "skip message")
	})
}

func TestPredefinedDependencies(t *testing.T) {
	// Just verify they exist and have proper structure
	assert.NotNil(t, Docker)
	assert.Equal(t, "Docker not running", Docker.Name)
	assert.Equal(t, []string{"docker", "info"}, Docker.CheckCmd)
	
	assert.NotNil(t, K3d)
	assert.Equal(t, "k3d not available", K3d.Name)
}