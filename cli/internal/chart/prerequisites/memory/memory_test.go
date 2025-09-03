package memory

import (
	"runtime"
	"testing"
)

func TestNewMemoryChecker(t *testing.T) {
	checker := NewMemoryChecker()

	if checker == nil {
		t.Error("Expected Memory checker to be created")
	}
}

func TestMemoryChecker_GetMemoryInfo(t *testing.T) {
	checker := NewMemoryChecker()
	current, recommended, sufficient := checker.GetMemoryInfo()

	if current <= 0 {
		t.Error("Current memory should be greater than 0")
	}

	if recommended != RecommendedMemoryMB {
		t.Errorf("Expected recommended memory to be %d, got %d", RecommendedMemoryMB, recommended)
	}

	expectedSufficient := current >= recommended
	if sufficient != expectedSufficient {
		t.Errorf("Expected sufficient to be %v, got %v", expectedSufficient, sufficient)
	}
}

func TestMemoryChecker_GetInstallHelp(t *testing.T) {
	checker := NewMemoryChecker()
	help := checker.GetInstallHelp()

	if help == "" {
		t.Error("Install help should not be empty")
	}

	// Should contain memory information
	if !containsSubstring(help, "MB") {
		t.Errorf("Help should contain memory information in MB: %s", help)
	}

	if !containsSubstring(help, "recommended") {
		t.Errorf("Help should mention recommended memory: %s", help)
	}
}

func TestMemoryChecker_Install(t *testing.T) {
	checker := NewMemoryChecker()

	// Memory cannot be automatically installed
	err := checker.Install()
	if err == nil {
		t.Error("Expected error when trying to install memory")
	}

	expectedSubstring := "cannot be automatically installed"
	if !containsSubstring(err.Error(), expectedSubstring) {
		t.Errorf("Expected error containing '%s', got: %v", expectedSubstring, err)
	}
}

func TestGetTotalMemoryMB(t *testing.T) {
	checker := NewMemoryChecker()
	memory := checker.getTotalMemoryMB()

	// Should return a reasonable value (at least 1GB) on most systems
	if memory < 1024 && memory != 0 {
		t.Errorf("Expected memory to be at least 1GB or 0 (if detection failed), got %d MB", memory)
	}

	// Test platform-specific methods
	switch runtime.GOOS {
	case "darwin":
		macMemory := checker.getMacOSMemory()
		if macMemory != memory {
			t.Errorf("Platform-specific method should match getTotalMemoryMB: %d vs %d", macMemory, memory)
		}
	case "linux":
		linuxMemory := checker.getLinuxMemory()
		if linuxMemory != memory {
			t.Errorf("Platform-specific method should match getTotalMemoryMB: %d vs %d", linuxMemory, memory)
		}
	case "windows":
		winMemory := checker.getWindowsMemory()
		if winMemory != memory {
			t.Errorf("Platform-specific method should match getTotalMemoryMB: %d vs %d", winMemory, memory)
		}
	}
}

func TestHasSufficientMemory(t *testing.T) {
	checker := NewMemoryChecker()

	// Test the logic
	sufficient := checker.HasSufficientMemory()
	totalMemory := checker.getTotalMemoryMB()
	expectedSufficient := totalMemory >= RecommendedMemoryMB

	if sufficient != expectedSufficient {
		t.Errorf("HasSufficientMemory() = %v, expected %v (total: %d MB, recommended: %d MB)",
			sufficient, expectedSufficient, totalMemory, RecommendedMemoryMB)
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
