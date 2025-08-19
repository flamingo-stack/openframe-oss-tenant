package prerequisites

import (
	"testing"
)

func TestNewInstaller(t *testing.T) {
	installer := NewInstaller()
	
	if installer == nil {
		t.Error("Expected installer to be created")
	}
	
	if installer.checker == nil {
		t.Error("Expected installer to have a checker")
	}
}

func TestInstallTool(t *testing.T) {
	installer := NewInstaller()
	
	// Test memory tool (should always fail)
	err := installer.installTool("memory")
	if err == nil {
		t.Error("Expected error for memory tool")
	}
	
	expectedError := "memory cannot be automatically increased"
	if !containsSubstring(err.Error(), expectedError) {
		t.Errorf("Expected error containing '%s', got '%s'", expectedError, err.Error())
	}
	
	// Test unknown tool
	err = installer.installTool("unknown-tool")
	if err == nil {
		t.Error("Expected error for unknown tool")
	}
	
	expectedError = "unknown tool: unknown-tool"
	if err.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, err.Error())
	}
	
	// Note: We skip testing actual installation of git/helm/certificates
	// as these would be slow and unreliable in test environments
}

func TestRunCommand(t *testing.T) {
	installer := NewInstaller()
	
	// Test simple command that should work on all systems
	err := installer.runCommand("echo", "test")
	if err != nil {
		t.Errorf("Expected echo command to succeed, got error: %v", err)
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