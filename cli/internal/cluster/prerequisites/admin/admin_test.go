package admin

import (
	"runtime"
	"testing"
)

func TestIsAdmin(t *testing.T) {
	result := IsAdmin()

	if runtime.GOOS == "windows" {
		t.Logf("Windows: IsAdmin() = %v", result)
		// On Windows, we can't assert the value since it depends on how tests are run
		// Just verify it doesn't panic
	} else {
		// On Unix systems, should always return true
		if !result {
			t.Error("Expected IsAdmin() to return true on Unix systems")
		}
	}
}

func TestRequireAdmin(t *testing.T) {
	err := RequireAdmin()

	if runtime.GOOS == "windows" {
		// On Windows, result depends on elevation
		if err != nil {
			t.Logf("Windows: RequireAdmin() returned error (not running as admin): %v", err)
		} else {
			t.Log("Windows: RequireAdmin() succeeded (running as admin)")
		}
	} else {
		// On Unix systems, should never return error
		if err != nil {
			t.Errorf("Expected RequireAdmin() to return nil on Unix systems, got: %v", err)
		}
	}
}

func TestGetElevationInstructions(t *testing.T) {
	instructions := GetElevationInstructions()

	if runtime.GOOS == "windows" {
		if instructions == "" {
			t.Error("Expected non-empty elevation instructions on Windows")
		}
		t.Logf("Windows elevation instructions:\n%s", instructions)
	} else {
		// On Unix systems, can be empty
		t.Logf("Unix elevation instructions: %q", instructions)
	}
}
