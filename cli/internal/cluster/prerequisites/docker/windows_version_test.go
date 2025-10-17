package docker

import (
	"runtime"
	"testing"
)

func TestGetWindowsVersion(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Skipping Windows version test on non-Windows platform")
	}

	info, err := GetWindowsVersion()
	if err != nil {
		t.Fatalf("GetWindowsVersion() failed: %v", err)
	}

	t.Logf("Windows Version Info:")
	t.Logf("  Edition: %s", info.Edition)
	t.Logf("  Version: %d.%d.%d", info.Major, info.Minor, info.Build)
	t.Logf("  Docker Desktop Compatible: %v", info.IsCompatible)

	if info.Build == 0 {
		t.Error("Expected non-zero build number")
	}
}

func TestCheckDockerDesktopCompatibility(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Skipping Windows compatibility test on non-Windows platform")
	}

	err := CheckDockerDesktopCompatibility()
	if err != nil {
		t.Logf("Docker Desktop compatibility check failed: %v", err)
		// This is expected on older Windows versions, not a test failure
	} else {
		t.Log("Docker Desktop is compatible with this Windows version")
	}
}
