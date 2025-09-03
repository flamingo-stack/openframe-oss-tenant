package k3d

import (
	"runtime"
	"testing"
)

func TestNewK3dInstaller(t *testing.T) {
	installer := NewK3dInstaller()
	
	if installer == nil {
		t.Error("Expected k3d installer to be created")
	}
}

func TestK3dInstaller_GetInstallHelp(t *testing.T) {
	installer := NewK3dInstaller()
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
		if !containsSubstring(help, "curl") && !containsSubstring(help, "https://") {
			t.Errorf("Linux help should contain curl or https reference: %s", help)
		}
	case "windows":
		if !containsSubstring(help, "https://") && !containsSubstring(help, "chocolatey") {
			t.Errorf("Windows help should contain https or chocolatey reference: %s", help)
		}
	}
}

func TestK3dInstaller_Install(t *testing.T) {
	installer := NewK3dInstaller()
	
	// We can't actually test installation in CI, but we can test error handling
	err := installer.Install()
	
	// On unsupported platforms, should return specific error
	if runtime.GOOS != "darwin" && runtime.GOOS != "linux" && runtime.GOOS != "windows" {
		expectedPrefix := "automatic k3d installation not supported on"
		if err == nil || !containsSubstring(err.Error(), expectedPrefix) {
			t.Errorf("Expected error containing '%s', got: %v", expectedPrefix, err)
		}
	}
	
	// On Windows, should suggest manual installation
	if runtime.GOOS == "windows" {
		expectedSubstring := "Please install from https://k3d.io"
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

func TestCommandExists(t *testing.T) {
	if !commandExists("echo") {
		t.Error("Expected 'echo' command to exist")
	}
	
	if commandExists("nonexistentcommand12345") {
		t.Error("Expected 'nonexistentcommand12345' to not exist")
	}
}

func TestInstallScript(t *testing.T) {
	// Skip this test on non-Linux systems
	if runtime.GOOS != "linux" {
		t.Skip("Linux-specific test, skipping on", runtime.GOOS)
	}
	
	installer := NewK3dInstaller()
	
	// This will likely fail in test environment due to network/permissions
	err := installer.installScript()
	
	if err != nil {
		// Should be a reasonable error message
		validErrors := []string{
			"failed to install k3d via script",
			"exit status",
			"executable file not found",
			"permission denied",
			"no such host",
		}
		
		hasValidError := false
		for _, validError := range validErrors {
			if containsSubstring(err.Error(), validError) {
				hasValidError = true
				break
			}
		}
		
		if !hasValidError {
			t.Errorf("Unexpected error type: %v", err)
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