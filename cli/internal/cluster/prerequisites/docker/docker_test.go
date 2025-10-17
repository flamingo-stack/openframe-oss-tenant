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
	t.Skip("Skipping actual installation test - would require network and admin permissions")
}

func TestFormatBytes(t *testing.T) {
	tests := []struct {
		name     string
		bytes    uint64
		expected string
	}{
		{"Zero bytes", 0, "0 B"},
		{"Bytes", 500, "500 B"},
		{"Kilobytes", 1536, "1.5 KB"},
		{"Megabytes", 1048576, "1.0 MB"},
		{"Gigabytes", 1073741824, "1.0 GB"},
		{"Large file", 524288000, "500.0 MB"},
		{"Very large file", 5368709120, "5.0 GB"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatBytes(tt.bytes)
			if result != tt.expected {
				t.Errorf("formatBytes(%d) = %s; expected %s", tt.bytes, result, tt.expected)
			}
		})
	}
}

func TestWriteCounter(t *testing.T) {
	wc := &writeCounter{
		Total:      1024 * 1024, // 1 MB
		Downloaded: 0,
	}

	// Simulate writing 512 KB
	data := make([]byte, 512*1024)
	n, err := wc.Write(data)

	if err != nil {
		t.Errorf("Write() returned error: %v", err)
	}

	if n != len(data) {
		t.Errorf("Write() returned %d; expected %d", n, len(data))
	}

	if wc.Downloaded != uint64(len(data)) {
		t.Errorf("Downloaded = %d; expected %d", wc.Downloaded, len(data))
	}
}

func TestClearLine(t *testing.T) {
	result := clearLine()
	expected := "\033[2K"
	if result != expected {
		t.Errorf("clearLine() = %q; expected %q", result, expected)
	}
}

func TestCommandExists(t *testing.T) {
	// Test with a command that should exist on all systems
	tests := []struct {
		name     string
		command  string
		shouldExist bool
	}{
		{"Go command", "go", true}, // Should exist in test environment
		{"Nonexistent command", "this-command-definitely-does-not-exist-12345", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exists := commandExists(tt.command)
			if tt.shouldExist && !exists {
				t.Logf("Warning: Command %q expected to exist but not found", tt.command)
			}
			t.Logf("Command %q exists: %v", tt.command, exists)
		})
	}
}

func TestIsDockerInstalled(t *testing.T) {
	// This test will pass or fail based on whether docker is actually installed
	// We're just verifying the function doesn't panic
	result := isDockerInstalled()
	t.Logf("Docker installed: %v", result)
}

func TestIsDockerRunning(t *testing.T) {
	// This test will pass or fail based on whether docker is actually running
	// We're just verifying the function doesn't panic
	result := IsDockerRunning()
	t.Logf("Docker running: %v", result)
}

func TestIsDockerInstalledButNotRunning(t *testing.T) {
	result := IsDockerInstalledButNotRunning()
	t.Logf("Docker installed but not running: %v", result)
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