package windows

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"
)

type WindowsPrerequisitesInstaller struct{}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func NewWindowsPrerequisitesInstaller() *WindowsPrerequisitesInstaller {
	return &WindowsPrerequisitesInstaller{}
}

func (w *WindowsPrerequisitesInstaller) IsInstalled() bool {
	// Check if we're on Windows
	if runtime.GOOS != "windows" {
		return true // Not needed on other platforms
	}

	// Check if .NET is installed
	return w.isDotNetInstalled() && w.isVCRedistInstalled()
}

func (w *WindowsPrerequisitesInstaller) GetInstallHelp() string {
	return "Windows Prerequisites: .NET Runtime and Visual C++ Redistributables will be installed automatically"
}

func (w *WindowsPrerequisitesInstaller) Install() error {
	if runtime.GOOS != "windows" {
		return nil // Skip on non-Windows
	}

	fmt.Println("Installing Windows prerequisites...")

	// Install .NET Runtime
	if !w.isDotNetInstalled() {
		fmt.Println("Installing .NET Runtime...")
		if err := w.installDotNet(); err != nil {
			fmt.Printf("Warning: Failed to install .NET Runtime: %v\n", err)
			fmt.Println("Note: .NET Runtime is optional. Docker Desktop may still work without it.")
			fmt.Println("If you encounter issues, install .NET manually from https://dotnet.microsoft.com/download")
		} else {
			fmt.Println(".NET Runtime installed successfully")
		}
	} else {
		fmt.Println(".NET Runtime is already installed")
	}

	// Install Visual C++ Redistributables
	if !w.isVCRedistInstalled() {
		fmt.Println("Installing Visual C++ Redistributables...")
		if err := w.installVCRedist(); err != nil {
			fmt.Printf("Warning: Failed to install Visual C++ Redistributables: %v\n", err)
			fmt.Println("Note: Visual C++ Redistributables are optional. Most tools will work without them.")
		} else {
			fmt.Println("Visual C++ Redistributables installed successfully")
		}
	} else {
		fmt.Println("Visual C++ Redistributables are already installed")
	}

	// Always return nil - these are optional dependencies
	// Even if they fail, we want to continue with the main tool installation
	return nil
}

func (w *WindowsPrerequisitesInstaller) isDotNetInstalled() bool {
	// Check if dotnet command exists
	cmd := exec.Command("dotnet", "--version")
	err := cmd.Run()
	return err == nil
}

func (w *WindowsPrerequisitesInstaller) isVCRedistInstalled() bool {
	// Check common VC Redist registry location or files
	// For simplicity, check if common DLL exists
	paths := []string{
		"C:\\Windows\\System32\\msvcp140.dll",
		"C:\\Windows\\System32\\vcruntime140.dll",
	}

	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			return true
		}
	}
	return false
}

func (w *WindowsPrerequisitesInstaller) installDotNet() error {
	// Only use winget - Chocolatey has dependency issues with .NET Framework 4.8
	if !commandExists("winget") {
		fmt.Println("\nwinget is not installed. Attempting to install winget automatically...")
		if err := w.installWinget(); err != nil {
			fmt.Printf("Failed to install winget automatically: %v\n", err)
			w.showWingetInstallHelp()
			fmt.Println("\nAlternatively, install .NET Runtime manually:")
			fmt.Println("  https://dotnet.microsoft.com/download/dotnet/8.0")
			return fmt.Errorf("winget not found - .NET Runtime requires manual installation")
		}
		fmt.Println("winget installed successfully! Continuing with .NET Runtime installation...")
	}

	fmt.Println("Installing .NET Runtime via winget...")
	cmd := exec.Command("winget", "install", "-e", "--id", "Microsoft.DotNet.Runtime.8", "--accept-package-agreements", "--accept-source-agreements")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		// Try .NET 6 as fallback
		fmt.Println("Trying .NET 6 Runtime as fallback...")
		cmd = exec.Command("winget", "install", "-e", "--id", "Microsoft.DotNet.Runtime.6", "--accept-package-agreements", "--accept-source-agreements")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			fmt.Println("\nFailed to install .NET Runtime via winget.")
			fmt.Println("Please install .NET Runtime manually from:")
			fmt.Println("  https://dotnet.microsoft.com/download")
			return fmt.Errorf("failed to install .NET Runtime: %w", err)
		}
	}
	return nil
}


func (w *WindowsPrerequisitesInstaller) installVCRedist() error {
	// Only use winget - Chocolatey has dependency issues
	if !commandExists("winget") {
		fmt.Println("\nwinget is not installed. Attempting to install winget automatically...")
		if err := w.installWinget(); err != nil {
			fmt.Printf("Failed to install winget automatically: %v\n", err)
			w.showWingetInstallHelp()
			fmt.Println("\nAlternatively, install Visual C++ Redistributables manually:")
			fmt.Println("  https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist")
			return fmt.Errorf("winget not found - Visual C++ Redistributables require manual installation")
		}
		fmt.Println("winget installed successfully! Continuing with VC++ Redistributables installation...")
	}

	fmt.Println("Installing Visual C++ Redistributables via winget...")
	cmd := exec.Command("winget", "install", "-e", "--id", "Microsoft.VCRedist.2015+.x64", "--accept-package-agreements", "--accept-source-agreements")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Println("\nFailed to install Visual C++ Redistributables via winget.")
		fmt.Println("Please install Visual C++ Redistributables manually from:")
		fmt.Println("  https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist")
		return fmt.Errorf("failed to install Visual C++ Redistributables: %w", err)
	}
	return nil
}

// installWinget attempts to install or update winget via Microsoft Store
func (w *WindowsPrerequisitesInstaller) installWinget() error {
	fmt.Println("\nwinget is not available. Installing via Microsoft Store...")

	// Try to open Microsoft Store to the App Installer page
	// This is the most reliable way to install/update winget
	storeURL := "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1"

	fmt.Println("\nOpening Microsoft Store to install 'App Installer' (winget)...")
	fmt.Println("Please click 'Get' or 'Update' in the Microsoft Store window that opens.")
	fmt.Println("After installation completes:")
	fmt.Println("  1. Close Microsoft Store")
	fmt.Println("  2. Restart this terminal")
	fmt.Println("  3. Run the bootstrap command again")

	cmd := exec.Command("cmd", "/c", "start", storeURL)
	if err := cmd.Run(); err != nil {
		fmt.Printf("\nFailed to open Microsoft Store: %v\n", err)
		w.showWingetInstallHelp()
		return fmt.Errorf("winget installation requires Microsoft Store")
	}

	fmt.Println("\nWaiting for you to complete the installation in Microsoft Store...")
	fmt.Println("Press Enter after you've installed App Installer to continue, or Ctrl+C to exit...")

	// Wait for user to press Enter
	fmt.Scanln()

	// Verify installation
	if commandExists("winget") {
		fmt.Println("✓ winget is now available!")
		return nil
	}

	fmt.Println("\nwinget is still not available. This usually means:")
	fmt.Println("  1. The installation is still in progress")
	fmt.Println("  2. You need to restart your terminal")
	fmt.Println("\nPlease restart your terminal and run the bootstrap command again.")

	return fmt.Errorf("winget not yet available - restart terminal required")
}

// isRunningAsAdmin checks if the current process is running with Administrator privileges
func (w *WindowsPrerequisitesInstaller) isRunningAsAdmin() bool {
	// Use a more reliable method: try to write to a system directory
	// This is a practical check - if we can't write to system dirs, we can't install winget
	cmd := exec.Command("powershell", "-NoProfile", "-Command",
		`$identity = [Security.Principal.WindowsIdentity]::GetCurrent(); $principal = New-Object Security.Principal.WindowsPrincipal($identity); $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)`)
	output, err := cmd.Output()
	if err != nil {
		// If we can't even run the check, assume not admin
		return false
	}
	result := strings.TrimSpace(string(output))
	return result == "True"
}

// showWingetInstallHelp provides instructions for installing winget
func (w *WindowsPrerequisitesInstaller) showWingetInstallHelp() {
	// Check Windows version
	cmd := exec.Command("cmd", "/c", "ver")
	output, err := cmd.Output()
	versionInfo := ""
	if err == nil {
		versionInfo = strings.TrimSpace(string(output))
	}

	fmt.Println("\nTo install winget manually:")

	// Check if they might have winget but it's not in PATH
	appDataLocal := os.Getenv("LOCALAPPDATA")
	possibleWingetPaths := []string{
		appDataLocal + "\\Microsoft\\WindowsApps\\winget.exe",
		"C:\\Program Files\\WindowsApps\\Microsoft.DesktopAppInstaller_*\\winget.exe",
	}

	wingetFound := false
	for _, path := range possibleWingetPaths {
		if _, err := os.Stat(path); err == nil {
			wingetFound = true
			fmt.Printf("  Note: winget appears to be installed at: %s\n", path)
			fmt.Println("  You may need to restart your terminal.")
			break
		}
	}

	if !wingetFound {
		fmt.Println("  1. Open Microsoft Store")
		fmt.Println("  2. Search for 'App Installer'")
		fmt.Println("  3. Install or update 'App Installer'")
		fmt.Println("  4. Restart your terminal")
		fmt.Println("\n  Or download directly from:")
		fmt.Println("    https://aka.ms/getwinget")

		if strings.Contains(versionInfo, "Windows 10") || strings.Contains(versionInfo, "Windows 11") {
			fmt.Println("\n  winget is included with Windows 10 (version 1809+) and Windows 11")
		}
	}
}

