package docker

import (
	"runtime"
	"testing"
)

func TestNewDockerInstaller(t *testing.T) {
	installer := NewDockerInstaller()
	
	if installer == nil {
		t.Error("Expected Docker installer to be created")
	}
}

func TestDockerInstaller_GetInstallHelp(t *testing.T) {
	installer := NewDockerInstaller()
	help := installer.GetInstallHelp()
	
	if help == "" {
		t.Error("Install help should not be empty")
	}
	
	switch runtime.GOOS {
	case "darwin":
		if !containsSubstring(help, "brew") && !containsSubstring(help, "https://") {
			t.Errorf("macOS help should contain brew or https reference: %s", help)
		}
	case "linux":
		if !containsSubstring(help, "package manager") && !containsSubstring(help, "https://") {
			t.Errorf("Linux help should contain package manager or https reference: %s", help)
		}
	case "windows":
		if !containsSubstring(help, "https://") {
			t.Errorf("Windows help should contain https reference: %s", help)
		}
	}
}

func TestDockerInstaller_Install(t *testing.T) {
	installer := NewDockerInstaller()
	
	// We can't actually test installation in CI, but we can test error handling
	err := installer.Install()
	
	// On unsupported platforms, should return specific error
	if runtime.GOOS != "darwin" && runtime.GOOS != "linux" && runtime.GOOS != "windows" {
		expectedPrefix := "automatic Docker installation not supported on"
		if err == nil || !containsSubstring(err.Error(), expectedPrefix) {
			t.Errorf("Expected error containing '%s', got: %v", expectedPrefix, err)
		}
	}
	
	// On Windows, should suggest manual installation
	if runtime.GOOS == "windows" {
		expectedSubstring := "Please install Docker Desktop"
		if err == nil || !containsSubstring(err.Error(), expectedSubstring) {
			t.Errorf("Expected error containing '%s', got: %v", expectedSubstring, err)
		}
	}
	
	// On macOS without brew, should suggest installing brew
	if runtime.GOOS == "darwin" && !commandExists("brew") {
		expectedSubstring := "Homebrew is required"
		if err == nil || !containsSubstring(err.Error(), expectedSubstring) {
			t.Errorf("Expected error containing '%s', got: %v", expectedSubstring, err)
		}
	}
}

// Helper function to check if a string contains a substring
func containsSubstring(str, substr string) bool {
	return len(str) >= len(substr) && 
		   func() bool {
			   for i := 0; i <= len(str)-len(substr); i++ {
				   if str[i:i+len(substr)] == substr {
					   return true
				   }
			   }
			   return false
		   }()
}