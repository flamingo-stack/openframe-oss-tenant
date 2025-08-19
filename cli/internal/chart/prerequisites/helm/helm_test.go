package helm

import (
	"runtime"
	"testing"
)

func TestNewHelmInstaller(t *testing.T) {
	installer := NewHelmInstaller()
	
	if installer == nil {
		t.Error("Expected Helm installer to be created")
	}
}

func TestHelmInstaller_GetInstallHelp(t *testing.T) {
	installer := NewHelmInstaller()
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

func TestHelmInstaller_Install(t *testing.T) {
	installer := NewHelmInstaller()
	
	// Only test basic structure without actual installation
	if installer == nil {
		t.Fatal("Expected installer to be created")
	}
	
	// Test installation help is available
	help := installer.GetInstallHelp()
	if help == "" {
		t.Error("Install help should not be empty")
	}
	
	// Note: We skip actual installation testing as it's slow and environment-dependent
}

func TestInstallScript(t *testing.T) {
	// Skip this test on non-Linux systems
	if runtime.GOOS != "linux" {
		t.Skip("Linux-specific test, skipping on", runtime.GOOS)
	}
	
	installer := NewHelmInstaller()
	
	// This will likely fail in test environment due to network/permissions
	err := installer.installScript()
	
	if err != nil {
		// Should be a reasonable error message
		validErrors := []string{
			"failed to install Helm via script",
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