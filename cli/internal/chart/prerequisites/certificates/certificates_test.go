package certificates

import (
	"runtime"
	"testing"
)

func TestNewCertificateInstaller(t *testing.T) {
	installer := NewCertificateInstaller()
	
	if installer == nil {
		t.Error("Expected Certificate installer to be created")
	}
}

func TestCertificateInstaller_GetInstallHelp(t *testing.T) {
	installer := NewCertificateInstaller()
	help := installer.GetInstallHelp()
	
	if help == "" {
		t.Error("Install help should not be empty")
	}
	
	// Should mention mkcert
	if !containsSubstring(help, "mkcert") {
		t.Errorf("Help should mention mkcert: %s", help)
	}
	
	switch runtime.GOOS {
	case "darwin":
		if !containsSubstring(help, "Homebrew") {
			t.Errorf("macOS help should mention Homebrew: %s", help)
		}
	case "linux":
		if !containsSubstring(help, "downloaded") {
			t.Errorf("Linux help should mention download: %s", help)
		}
	case "windows":
		if !containsSubstring(help, "manually") {
			t.Errorf("Windows help should mention manual installation: %s", help)
		}
	}
}

func TestCertificateInstaller_Install(t *testing.T) {
	installer := NewCertificateInstaller()
	
	// Only test basic structure without actual installation
	// Real installation testing should be done in integration tests
	
	// Test that the installer can be created and basic methods work
	if installer == nil {
		t.Fatal("Expected installer to be created")
	}
	
	// Test installation help is available
	help := installer.GetInstallHelp()
	if help == "" {
		t.Error("Install help should not be empty")
	}
	
	// Note: We skip actual installation testing as it's slow and environment-dependent
	// Integration tests should cover full installation flow
}

func TestAreCertificatesGenerated(t *testing.T) {
	// Test the certificate detection logic
	generated := areCertificatesGenerated()
	
	// This will likely be false in test environment, which is expected
	// We're just testing that the function doesn't crash
	_ = generated
}

func TestIsMkcertInstalled(t *testing.T) {
	// Test mkcert detection
	installed := isMkcertInstalled()
	
	// Should be equivalent to commandExists("mkcert")
	expected := commandExists("mkcert")
	if installed != expected {
		t.Errorf("isMkcertInstalled() = %v, expected %v", installed, expected)
	}
}

func TestInstallMkcert(t *testing.T) {
	installer := NewCertificateInstaller()
	
	// This will likely fail in test environment, but should handle errors gracefully
	err := installer.installMkcert()
	
	if err != nil {
		// Should be a reasonable error message
		validErrors := []string{
			"Homebrew is required",
			"failed to install mkcert",
			"failed to download mkcert",
			"automatic mkcert installation not supported",
			"exit status",
			"executable file not found",
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