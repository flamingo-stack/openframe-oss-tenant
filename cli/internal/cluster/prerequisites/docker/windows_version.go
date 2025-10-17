//go:build windows

package docker

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// WindowsVersionInfo holds Windows version information
type WindowsVersionInfo struct {
	Major        int
	Minor        int
	Build        int
	Edition      string
	IsServer     bool
	IsCompatible bool
}

// GetWindowsVersion gets the current Windows version information
func GetWindowsVersion() (*WindowsVersionInfo, error) {
	// Get Windows version using wmic
	cmd := exec.Command("wmic", "os", "get", "Caption,Version", "/value")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get Windows version: %w", err)
	}

	info := &WindowsVersionInfo{}
	lines := strings.Split(string(output), "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "Caption=") {
			info.Edition = strings.TrimPrefix(line, "Caption=")
			// Check if this is Windows Server
			info.IsServer = strings.Contains(strings.ToLower(info.Edition), "server")
		} else if strings.HasPrefix(line, "Version=") {
			versionStr := strings.TrimPrefix(line, "Version=")
			parts := strings.Split(versionStr, ".")
			if len(parts) >= 3 {
				info.Major, _ = strconv.Atoi(parts[0])
				info.Minor, _ = strconv.Atoi(parts[1])
				info.Build, _ = strconv.Atoi(parts[2])
			}
		}
	}

	// Docker compatibility check
	if info.IsServer {
		// Windows Server 2016 (build 14393) or later supports Docker Engine
		// Windows Server 2019 (build 17763) is recommended
		info.IsCompatible = info.Build >= 14393
	} else {
		// Desktop: Requires Windows 10/11 build 19044 or higher for Docker Desktop
		info.IsCompatible = info.Build >= 19044
	}

	return info, nil
}

// CheckDockerCompatibility checks if the system can run Docker
func CheckDockerCompatibility() error {
	info, err := GetWindowsVersion()
	if err != nil {
		return fmt.Errorf("could not determine Windows version: %w", err)
	}

	if !info.IsCompatible {
		if info.IsServer {
			return fmt.Errorf(
				"Docker requires Windows Server 2016 (build 14393) or above.\n"+
					"Current version: %s (Build %d)\n\n"+
					"Please update your Windows Server version.",
				info.Edition, info.Build,
			)
		} else {
			return fmt.Errorf(
				"Docker Desktop requires Windows 10 Pro/Enterprise/Home version 19044 or above.\n"+
					"Current version: %s (Build %d)\n\n"+
					"Options:\n"+
					"1. Update Windows to version 19044 or higher\n"+
					"2. Use WSL 2 with Docker installed in Linux\n\n"+
					"To check for Windows updates: Settings > Update & Security > Windows Update",
				info.Edition, info.Build,
			)
		}
	}

	return nil
}

// CheckDockerDesktopCompatibility checks if the system can run Docker Desktop
// Deprecated: Use CheckDockerCompatibility instead
func CheckDockerDesktopCompatibility() error {
	return CheckDockerCompatibility()
}

// IsWindowsServer returns true if running on Windows Server
func IsWindowsServer() (bool, error) {
	info, err := GetWindowsVersion()
	if err != nil {
		return false, err
	}
	return info.IsServer, nil
}
