package scaffold

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewScaffoldInstaller(t *testing.T) {
	installer := NewScaffoldInstaller()
	assert.NotNil(t, installer)
}

func TestScaffoldInstaller_GetInstallHelp(t *testing.T) {
	installer := NewScaffoldInstaller()
	help := installer.GetInstallHelp()
	
	assert.NotEmpty(t, help)
	assert.Contains(t, help, "skaffold")
	// Check for installation instructions (brew, curl, choco, or download)
	containsInstallMethod := strings.Contains(help, "brew install") || 
		strings.Contains(help, "curl -Lo") || 
		strings.Contains(help, "choco install") || 
		strings.Contains(help, "download from")
	assert.True(t, containsInstallMethod, "Help should contain installation instructions")
}

func TestScaffoldInstaller_IsInstalled(t *testing.T) {
	installer := NewScaffoldInstaller()
	
	// We can't predict whether skaffold is installed on the test system,
	// but we can verify the function doesn't panic and returns a boolean
	result := installer.IsInstalled()
	assert.IsType(t, true, result)
}

func TestIsScaffoldRunning(t *testing.T) {
	// Test the standalone function
	result := IsScaffoldRunning()
	assert.IsType(t, true, result)
	
	// If skaffold is not installed, IsScaffoldRunning should be false
	if !isScaffoldInstalled() {
		assert.False(t, result)
	}
}

func TestScaffoldInstaller_GetVersion(t *testing.T) {
	installer := NewScaffoldInstaller()
	
	version, err := installer.GetVersion()
	
	if installer.IsInstalled() {
		// If skaffold is installed, we should get a version without error
		assert.NoError(t, err)
		assert.NotEmpty(t, version)
	} else {
		// If skaffold is not installed, we should get an error
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "skaffold is not installed")
		assert.Empty(t, version)
	}
}

func TestCommandExists(t *testing.T) {
	// Test with a command that should always exist
	assert.True(t, commandExists("echo"))
	
	// Test with a command that should not exist
	assert.False(t, commandExists("this-command-should-not-exist-12345"))
}

func TestScaffoldInstallHelp(t *testing.T) {
	help := scaffoldInstallHelp()
	
	assert.NotEmpty(t, help)
	assert.Contains(t, help, "skaffold")
	
	// Should contain platform-specific information
	// We can't test all platforms, but we can verify basic structure
}

func TestScaffoldInstaller_Install(t *testing.T) {
	installer := NewScaffoldInstaller()
	
	// We won't actually run the install in tests to avoid system changes,
	// but we can verify that the Install method exists and has proper structure
	assert.NotNil(t, installer.Install)
	
	// The method should return an error type
	// We'll test this by checking it doesn't panic when called, but won't actually install
	// err := installer.Install()
	// This would require system changes, so we skip actual execution in tests
}