//go:build !windows

package docker

import "fmt"

// installWindows is a stub for non-Windows platforms
func (d *DockerInstaller) installWindows() error {
	return fmt.Errorf("Windows installation is only supported on Windows")
}

// startDockerWindows is a stub for non-Windows platforms
func startDockerWindows() error {
	return fmt.Errorf("startDockerWindows is only supported on Windows")
}

// waitForDockerWindows is a stub for non-Windows platforms
func waitForDockerWindows(maxAttempts int) error {
	return fmt.Errorf("waitForDockerWindows is only supported on Windows")
}
