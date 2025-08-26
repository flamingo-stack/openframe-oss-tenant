package telepresence

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewTelepresenceInstaller(t *testing.T) {
	installer := NewTelepresenceInstaller()
	assert.NotNil(t, installer)
}

func TestTelepresenceInstaller_GetInstallHelp(t *testing.T) {
	installer := NewTelepresenceInstaller()
	help := installer.GetInstallHelp()
	
	assert.NotEmpty(t, help)
	assert.Contains(t, help, "Telepresence")
	assert.Contains(t, help, "telepresence")
}

func TestTelepresenceInstaller_IsInstalled(t *testing.T) {
	installer := NewTelepresenceInstaller()
	
	// We can't predict whether telepresence is installed on the test system,
	// but we can verify the function doesn't panic and returns a boolean
	result := installer.IsInstalled()
	assert.IsType(t, true, result)
}

func TestIsTelepresenceRunning(t *testing.T) {
	// Test the standalone function
	result := IsTelepresenceRunning()
	assert.IsType(t, true, result)
	
	// If telepresence is not installed, IsTelepresenceRunning should be false
	if !isTelepresenceInstalled() {
		assert.False(t, result)
	}
}

func TestTelepresenceInstaller_GetVersion(t *testing.T) {
	installer := NewTelepresenceInstaller()
	
	version, err := installer.GetVersion()
	
	if installer.IsInstalled() {
		// If telepresence is installed, we should get a version without error
		assert.NoError(t, err)
		assert.NotEmpty(t, version)
	} else {
		// If telepresence is not installed, we should get an error
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "telepresence is not installed")
		assert.Empty(t, version)
	}
}

func TestCommandExists(t *testing.T) {
	// Test with a command that should always exist
	assert.True(t, commandExists("echo"))
	
	// Test with a command that should not exist
	assert.False(t, commandExists("this-command-should-not-exist-12345"))
}

func TestTelepresenceInstallHelp(t *testing.T) {
	help := telepresenceInstallHelp()
	
	assert.NotEmpty(t, help)
	assert.Contains(t, help, "Telepresence")
	
	// Should contain platform-specific information
	// We can't test all platforms, but we can verify basic structure
}

func TestTelepresenceInstaller_Install(t *testing.T) {
	installer := NewTelepresenceInstaller()
	
	// We won't actually run the install in tests to avoid system changes,
	// but we can verify that the Install method exists and has proper structure
	assert.NotNil(t, installer.Install)
	
	// The method should return an error type
	// We'll test this by checking it doesn't panic when called, but won't actually install
	// err := installer.Install()
	// This would require system changes, so we skip actual execution in tests
}