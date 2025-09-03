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
	
	// Test that install tool delegates to appropriate installers
	validTools := []string{"docker", "kubectl", "k3d"}
	
	for _, tool := range validTools {
		err := installer.installTool(tool)
		// We expect errors in test environment, but they should be reasonable
		if err != nil {
			// Should be installation-related errors, not logic errors
			errorStr := err.Error()
			invalidErrors := []string{
				"unknown tool",
				"panic",
			}
			
			for _, invalidError := range invalidErrors {
				if containsSubstring(errorStr, invalidError) {
					t.Errorf("Tool %s returned unexpected error: %v", tool, err)
				}
			}
		}
	}
	
	// Test unknown tool
	err := installer.installTool("unknown-tool")
	if err == nil {
		t.Error("Expected error for unknown tool")
	}
	
	expectedError := "unknown tool: unknown-tool"
	if err.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, err.Error())
	}
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