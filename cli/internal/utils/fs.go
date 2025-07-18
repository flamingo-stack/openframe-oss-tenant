package utils

import (
	"fmt"
	"os"
	"path/filepath"
)

// FindRootDir finds the project root directory
func FindRootDir() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if IsProjectRoot(dir) {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("project root not found")
		}
		dir = parent
	}
}

// IsProjectRoot checks if a directory is the project root
func IsProjectRoot(dir string) bool {
	// First, check for the actual project structure
	// services should be in openframe/services
	// integrated-tools should be at the current level
	servicesDir := filepath.Join(dir, "openframe", "services")
	integratedToolsDir := filepath.Join(dir, "integrated-tools")

	// Alternative: check if we're in the openframe subdirectory
	openframeServicesDir := filepath.Join(dir, "services")
	openframeIntegratedToolsDir := filepath.Join(dir, "..", "integrated-tools")

	// Check both possible structures first
	if (DirectoryExists(servicesDir) && DirectoryExists(integratedToolsDir)) ||
		(DirectoryExists(openframeServicesDir) && DirectoryExists(openframeIntegratedToolsDir)) {
		return true
	}

	// Only if the actual structure isn't found, check for common project root indicators
	// But we need to be more careful - the CLI directory has these indicators but isn't the root
	indicators := []string{
		"openframe",
		"manifests",
		"scripts",
		"docs",
	}

	// Check if this directory has ALL the indicators (not just one)
	allIndicatorsPresent := true
	for _, indicator := range indicators {
		path := filepath.Join(dir, indicator)
		if !DirectoryExists(path) {
			allIndicatorsPresent = false
			break
		}
	}

	// Only return true if ALL indicators are present AND we don't have the actual service structure
	// This prevents the CLI directory from being identified as root
	return allIndicatorsPresent && !DirectoryExists(filepath.Join(dir, "openframe", "services"))
}

// DirectoryExists checks if a directory exists
func DirectoryExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}
