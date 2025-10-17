//go:build !windows

package docker

// WindowsVersionInfo holds Windows version information (stub for non-Windows)
type WindowsVersionInfo struct {
	Major        int
	Minor        int
	Build        int
	Edition      string
	IsServer     bool
	IsCompatible bool
}

// GetWindowsVersion stub for non-Windows platforms
func GetWindowsVersion() (*WindowsVersionInfo, error) {
	return &WindowsVersionInfo{IsCompatible: true, IsServer: false}, nil
}

// CheckDockerCompatibility stub for non-Windows platforms
func CheckDockerCompatibility() error {
	return nil
}

// CheckDockerDesktopCompatibility stub for non-Windows platforms
func CheckDockerDesktopCompatibility() error {
	return nil
}

// IsWindowsServer stub for non-Windows platforms
func IsWindowsServer() (bool, error) {
	return false, nil
}
