//go:build !windows

package admin

// IsAdmin always returns true on Unix systems (we don't require root)
func IsAdmin() bool {
	return true
}

// RequireAdmin does nothing on Unix systems
func RequireAdmin() error {
	return nil
}

// GetElevationInstructions returns empty string on Unix systems
func GetElevationInstructions() string {
	return ""
}
