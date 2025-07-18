package utils

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFindRootDir(t *testing.T) {
	// Test FindRootDir function
	rootDir, err := FindRootDir()
	if err != nil {
		t.Logf("FindRootDir() returned error (may be expected if not in project root): %v", err)
		return
	}

	if rootDir == "" {
		t.Error("FindRootDir() should not return empty string")
	}

	// Check that the returned directory exists
	if _, err := os.Stat(rootDir); os.IsNotExist(err) {
		t.Errorf("FindRootDir() returned non-existent directory: %s", rootDir)
	}
}

func TestIsProjectRoot(t *testing.T) {
	// Test IsProjectRoot function
	// This will likely return false since we're not in the actual project root
	isRoot := IsProjectRoot(".")
	if isRoot {
		t.Log("IsProjectRoot() returned true for current directory")
	} else {
		t.Log("IsProjectRoot() returned false for current directory")
	}

	// Test with a non-existent directory
	isRoot = IsProjectRoot("/non/existent/directory")
	if isRoot {
		t.Error("IsProjectRoot() should return false for non-existent directory")
	}
}

func TestDirectoryExists(t *testing.T) {
	// Test DirectoryExists function
	// Test with current directory (should exist)
	exists := DirectoryExists(".")
	if !exists {
		t.Error("DirectoryExists() should return true for current directory")
	}

	// Test with non-existent directory
	exists = DirectoryExists("/non/existent/directory")
	if exists {
		t.Error("DirectoryExists() should return false for non-existent directory")
	}

	// Test with a file (should return false)
	tempFile, err := os.CreateTemp("", "test-file")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	exists = DirectoryExists(tempFile.Name())
	if exists {
		t.Error("DirectoryExists() should return false for files")
	}
}

func TestIsProjectRootWithIndicators(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-project-root")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Test with different project root indicators
	indicators := []string{"openframe", "manifests", "scripts", "docs"}

	for _, indicator := range indicators {
		t.Run("indicator_"+indicator, func(t *testing.T) {
			// Create the indicator directory
			indicatorDir := filepath.Join(tempDir, indicator)
			err := os.Mkdir(indicatorDir, 0755)
			if err != nil {
				t.Fatalf("Failed to create indicator directory %s: %v", indicator, err)
			}

			// Test that IsProjectRoot returns true
			isRoot := IsProjectRoot(tempDir)
			if !isRoot {
				t.Errorf("IsProjectRoot() should return true for directory with %s indicator", indicator)
			}

			// Clean up for next test
			err = os.Remove(indicatorDir)
			if err != nil {
				t.Fatalf("Failed to remove indicator directory %s: %v", indicator, err)
			}
		})
	}
}

func TestIsProjectRootWithOpenframeStructure(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-openframe-structure")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create openframe/services directory
	servicesDir := filepath.Join(tempDir, "openframe", "services")
	err = os.MkdirAll(servicesDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create services directory: %v", err)
	}

	// Create integrated-tools directory
	integratedToolsDir := filepath.Join(tempDir, "integrated-tools")
	err = os.Mkdir(integratedToolsDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create integrated-tools directory: %v", err)
	}

	// Test that IsProjectRoot returns true
	isRoot := IsProjectRoot(tempDir)
	if !isRoot {
		t.Error("IsProjectRoot() should return true for directory with openframe/services and integrated-tools")
	}
}

func TestIsProjectRootWithLegacyStructure(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-legacy-structure")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create services directory (legacy structure)
	servicesDir := filepath.Join(tempDir, "services")
	err = os.Mkdir(servicesDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create services directory: %v", err)
	}

	// Create integrated-tools directory
	integratedToolsDir := filepath.Join(tempDir, "..", "integrated-tools")
	err = os.MkdirAll(integratedToolsDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create integrated-tools directory: %v", err)
	}
	defer os.RemoveAll(filepath.Dir(integratedToolsDir))

	// Test that IsProjectRoot returns true
	isRoot := IsProjectRoot(tempDir)
	if !isRoot {
		t.Error("IsProjectRoot() should return true for directory with services and ../integrated-tools")
	}
}

func TestDirectoryExistsWithSpecialCases(t *testing.T) {
	// Test DirectoryExists with special cases
	testCases := []struct {
		name     string
		path     string
		expected bool
	}{
		{"current directory", ".", true},
		{"parent directory", "..", true},
		{"root directory", "/", true},
		{"non-existent path", "/non/existent/path", false},
		{"empty string", "", false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			exists := DirectoryExists(tc.path)
			if exists != tc.expected {
				t.Errorf("DirectoryExists(%s) = %v, expected %v", tc.path, exists, tc.expected)
			}
		})
	}
}

func TestFindRootDirWithMockStructure(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-find-root")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a mock project structure
	openframeDir := filepath.Join(tempDir, "openframe")
	err = os.Mkdir(openframeDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create openframe directory: %v", err)
	}

	// Create a subdirectory
	subDir := filepath.Join(tempDir, "subdir")
	err = os.Mkdir(subDir, 0755)
	if err != nil {
		t.Fatalf("Failed to create subdir: %v", err)
	}

	// Change to the subdirectory
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir(subDir)
	if err != nil {
		t.Fatalf("Failed to change to subdir: %v", err)
	}

	// Test FindRootDir from subdirectory
	rootDir, err := FindRootDir()
	if err != nil {
		t.Errorf("FindRootDir() failed: %v", err)
	} else {
		// Use filepath.EvalSymlinks to resolve any symlinks (like /private/var -> /var on macOS)
		expectedDir, err := filepath.EvalSymlinks(tempDir)
		if err != nil {
			expectedDir = filepath.Clean(tempDir)
		}
		actualDir, err := filepath.EvalSymlinks(rootDir)
		if err != nil {
			actualDir = filepath.Clean(rootDir)
		}
		if actualDir != expectedDir {
			t.Errorf("FindRootDir() returned %s, expected %s", actualDir, expectedDir)
		}
	}
}

func TestFindRootDirWithNoRoot(t *testing.T) {
	// Create a temporary directory without project indicators
	tempDir, err := os.MkdirTemp("", "test-no-root")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Change to the temporary directory
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get current directory: %v", err)
	}
	defer os.Chdir(originalDir)

	err = os.Chdir(tempDir)
	if err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Test FindRootDir with no project root
	_, err = FindRootDir()
	if err == nil {
		t.Error("FindRootDir() should return error when no project root is found")
	}
}
