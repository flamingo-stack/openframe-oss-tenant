package git

import (
	"runtime"
	"testing"
)

func TestNewGitInstaller(t *testing.T) {
	installer := NewGitInstaller()
	
	if installer == nil {
		t.Error("Expected Git installer to be created")
	}
}

func TestGitInstaller_GetInstallHelp(t *testing.T) {
	installer := NewGitInstaller()
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
		if !containsSubstring(help, "https://") && !containsSubstring(help, "chocolatey") {
			t.Errorf("Windows help should contain https or chocolatey reference: %s", help)
		}
	}
}

func TestGitInstaller_Install(t *testing.T) {
	installer := NewGitInstaller()
	
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

func TestCommandExists(t *testing.T) {
	if !commandExists("echo") {
		t.Error("Expected 'echo' command to exist")
	}
	
	if commandExists("nonexistentcommand12345") {
		t.Error("Expected 'nonexistentcommand12345' to not exist")
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