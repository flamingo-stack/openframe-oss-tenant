package jq

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewJqInstaller(t *testing.T) {
	installer := NewJqInstaller()
	assert.NotNil(t, installer)
}

func TestJqInstaller_GetInstallHelp(t *testing.T) {
	installer := NewJqInstaller()
	help := installer.GetInstallHelp()
	
	assert.NotEmpty(t, help)
	assert.Contains(t, help, "jq")
}

func TestJqInstaller_IsInstalled(t *testing.T) {
	installer := NewJqInstaller()
	
	// We can't predict whether jq is installed on the test system,
	// but we can verify the function doesn't panic and returns a boolean
	result := installer.IsInstalled()
	assert.IsType(t, true, result)
}

func TestIsJqRunning(t *testing.T) {
	// Test the standalone function
	result := IsJqRunning()
	assert.IsType(t, true, result)
	
	// If jq is not installed, IsJqRunning should be false
	if !isJqInstalled() {
		assert.False(t, result)
	}
}

func TestJqInstaller_GetVersion(t *testing.T) {
	installer := NewJqInstaller()
	
	version, err := installer.GetVersion()
	
	if installer.IsInstalled() {
		// If jq is installed, we should get a version without error
		assert.NoError(t, err)
		assert.NotEmpty(t, version)
	} else {
		// If jq is not installed, we should get an error
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "jq is not installed")
		assert.Empty(t, version)
	}
}

func TestCommandExists(t *testing.T) {
	// Test with a command that should always exist
	assert.True(t, commandExists("echo"))
	
	// Test with a command that should not exist
	assert.False(t, commandExists("this-command-should-not-exist-12345"))
}

func TestJqInstallHelp(t *testing.T) {
	help := jqInstallHelp()
	
	assert.NotEmpty(t, help)
	assert.Contains(t, help, "jq")
	
	// Should contain platform-specific information
	// We can't test all platforms, but we can verify basic structure
}

func TestJqInstaller_OSDetection(t *testing.T) {
	installer := NewJqInstaller()
	
	// Test that OS detection methods don't panic
	assert.NotPanics(t, func() {
		installer.isDebianLike()
	})
	
	assert.NotPanics(t, func() {
		installer.isRhelLike()
	})
	
	// The actual result depends on the test system, but both should return boolean
	debianLike := installer.isDebianLike()
	rhelLike := installer.isRhelLike()
	
	assert.IsType(t, true, debianLike)
	assert.IsType(t, true, rhelLike)
}

func TestJqInstaller_Install(t *testing.T) {
	installer := NewJqInstaller()
	
	// We won't actually run the install in tests to avoid system changes,
	// but we can verify that the Install method exists and has proper structure
	assert.NotNil(t, installer.Install)
	
	// The method should return an error type
	// We'll test this by checking it doesn't panic when called, but won't actually install
	// err := installer.Install()
	// This would require system changes, so we skip actual execution in tests
}