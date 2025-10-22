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
	// Try PowerShell first (works on all Windows versions including Windows 11)
	info, err := getWindowsVersionPowerShell()
	if err == nil {
		return info, nil
	}

	// Fallback to wmic if PowerShell fails
	info, err = getWindowsVersionWMIC()
	if err == nil {
		return info, nil
	}

	return nil, fmt.Errorf("failed to get Windows version using both PowerShell and wmic: %w", err)
}

// getWindowsVersionPowerShell uses PowerShell to get Windows version (preferred method)
func getWindowsVersionPowerShell() (*WindowsVersionInfo, error) {
	// Use PowerShell to get OS information
	psScript := `$os = Get-CimInstance Win32_OperatingSystem; "$($os.Caption)|$($os.Version)"`
	cmd := exec.Command("powershell", "-NoProfile", "-Command", psScript)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to run PowerShell command: %w", err)
	}

	result := strings.TrimSpace(string(output))
	parts := strings.Split(result, "|")
	if len(parts) != 2 {
		return nil, fmt.Errorf("unexpected PowerShell output format: %s", result)
	}

	info := &WindowsVersionInfo{}
	info.Edition = parts[0]
	info.IsServer = strings.Contains(strings.ToLower(info.Edition), "server")

	// Parse version string (e.g., "10.0.19045")
	versionParts := strings.Split(parts[1], ".")
	if len(versionParts) >= 3 {
		info.Major, _ = strconv.Atoi(versionParts[0])
		info.Minor, _ = strconv.Atoi(versionParts[1])
		info.Build, _ = strconv.Atoi(versionParts[2])
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

// getWindowsVersionWMIC uses wmic to get Windows version (fallback for older systems)
func getWindowsVersionWMIC() (*WindowsVersionInfo, error) {
	// Get Windows version using wmic
	cmd := exec.Command("wmic", "os", "get", "Caption,Version", "/value")
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get Windows version via wmic: %w", err)
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
					"Please update Windows to version 19044 or higher:\n"+
					"  Settings > Update & Security > Windows Update\n\n"+
					"Or install Windows Server to use Docker Engine instead.",
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

// CheckHyperVCapability checks if the hardware supports Hyper-V virtualization
func CheckHyperVCapability() (bool, error) {
	// Use systeminfo to check for Hyper-V requirements
	cmd := exec.Command("systeminfo")
	output, err := cmd.Output()
	if err != nil {
		return false, fmt.Errorf("failed to run systeminfo: %w", err)
	}

	outputStr := string(output)

	// Look for Hyper-V Requirements section
	if !strings.Contains(outputStr, "Hyper-V Requirements") {
		return false, fmt.Errorf("unable to determine Hyper-V capability from systeminfo output")
	}

	// Check each requirement
	requirements := []string{
		"VM Monitor Mode Extensions:",
		"Virtualization Enabled In Firmware:",
		"Second Level Address Translation:",
		"Data Execution Prevention Available:",
	}

	for _, req := range requirements {
		// Find the line with this requirement
		lines := strings.Split(outputStr, "\n")
		for _, line := range lines {
			if strings.Contains(line, req) {
				// Check if it says "Yes"
				if !strings.Contains(line, "Yes") {
					// Extract the requirement name for error message
					reqName := strings.TrimSuffix(req, ":")
					return false, fmt.Errorf("hardware requirement not met: %s", reqName)
				}
				break
			}
		}
	}

	return true, nil
}

// GetHyperVCapabilityMessage returns a user-friendly message about Hyper-V capability
func GetHyperVCapabilityMessage() string {
	capable, err := CheckHyperVCapability()

	if err != nil {
		return fmt.Sprintf("Unable to determine Hyper-V capability: %v", err)
	}

	if !capable {
		return `OpenFrame CLI is not supported on this system due to lack of virtualization features.

Your hardware does not support the virtualization features required for Docker Desktop and Hyper-V.

Requirements:
  • Hardware virtualization support (Intel VT-x or AMD-V)
  • Virtualization enabled in BIOS/UEFI firmware
  • Second Level Address Translation (SLAT)
  • Data Execution Prevention (DEP)

To enable virtualization:
  1. Restart your computer and enter BIOS/UEFI settings (usually F2, F10, Del, or Esc during boot)
  2. Find the virtualization setting (may be under CPU, Advanced, or Security settings)
  3. Enable Intel VT-x (Intel) or AMD-V (AMD) virtualization
  4. Enable VT-d or AMD-Vi if available
  5. Save changes and exit

If your hardware does not support virtualization, you will need a different computer to run OpenFrame CLI.`
	}

	return "Hyper-V virtualization is supported on this system."
}
