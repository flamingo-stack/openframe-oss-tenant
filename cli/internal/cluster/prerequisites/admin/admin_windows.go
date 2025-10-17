//go:build windows

package admin

import (
	"fmt"
	"os/exec"
	"strings"
)

// IsAdmin checks if the current process is running with Administrator privileges on Windows
func IsAdmin() bool {
	// Run 'net session' command which requires admin privileges
	cmd := exec.Command("net", "session")
	err := cmd.Run()
	return err == nil
}

// RequireAdmin checks if running as admin and returns an error if not
func RequireAdmin() error {
	if !IsAdmin() {
		return fmt.Errorf("administrator privileges required: please run this command in an elevated terminal (Run as Administrator)")
	}
	return nil
}

// GetElevationInstructions returns platform-specific instructions for running as admin
func GetElevationInstructions() string {
	var sb strings.Builder
	sb.WriteString("This operation requires Administrator privileges.\n")
	sb.WriteString("\nTo run this command with Administrator privileges:\n")
	sb.WriteString("1. Right-click on Command Prompt or PowerShell\n")
	sb.WriteString("2. Select 'Run as Administrator'\n")
	sb.WriteString("3. Run this command again\n")
	sb.WriteString("\nAlternatively, in PowerShell:\n")
	sb.WriteString("  Start-Process powershell -Verb RunAs\n")
	return sb.String()
}
