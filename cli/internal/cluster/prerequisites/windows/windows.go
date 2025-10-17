package windows

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
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
		fmt.Println("\nwinget is required to install .NET Runtime automatically.")
		fmt.Println("Please install .NET Runtime manually from:")
		fmt.Println("  https://dotnet.microsoft.com/download/dotnet/8.0")
		fmt.Println("or install winget (comes with Windows 10+ version 1809 or later)")
		return fmt.Errorf("winget not found - .NET Runtime requires manual installation")
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
		fmt.Println("\nwinget is required to install Visual C++ Redistributables automatically.")
		fmt.Println("Please install Visual C++ Redistributables manually from:")
		fmt.Println("  https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist")
		fmt.Println("or install winget (comes with Windows 10+ version 1809 or later)")
		return fmt.Errorf("winget not found - Visual C++ Redistributables require manual installation")
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

