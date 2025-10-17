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
			fmt.Println("You may need to install .NET manually from https://dotnet.microsoft.com/download")
		}
	}

	// Install Visual C++ Redistributables
	if !w.isVCRedistInstalled() {
		fmt.Println("Installing Visual C++ Redistributables...")
		if err := w.installVCRedist(); err != nil {
			fmt.Printf("Warning: Failed to install Visual C++ Redistributables: %v\n", err)
			fmt.Println("You may need to install Visual C++ Redistributables manually")
		}
	}

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
	// Try winget first
	if commandExists("winget") {
		fmt.Println("Installing .NET Runtime via winget...")
		cmd := exec.Command("winget", "install", "-e", "--id", "Microsoft.DotNet.Runtime.8", "--accept-package-agreements", "--accept-source-agreements")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			// Try .NET 6 as fallback
			cmd = exec.Command("winget", "install", "-e", "--id", "Microsoft.DotNet.Runtime.6", "--accept-package-agreements", "--accept-source-agreements")
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr

			if err := cmd.Run(); err != nil {
				return w.installDotNetChoco()
			}
		}
		return nil
	}

	// Fall back to chocolatey
	if commandExists("choco") {
		return w.installDotNetChoco()
	}

	return fmt.Errorf("neither winget nor chocolatey found")
}

func (w *WindowsPrerequisitesInstaller) installDotNetChoco() error {
	fmt.Println("Installing .NET Runtime via Chocolatey...")
	cmd := exec.Command("choco", "install", "dotnet-runtime", "-y")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install .NET Runtime: %w", err)
	}

	return nil
}

func (w *WindowsPrerequisitesInstaller) installVCRedist() error {
	// Try winget first
	if commandExists("winget") {
		fmt.Println("Installing Visual C++ Redistributables via winget...")
		cmd := exec.Command("winget", "install", "-e", "--id", "Microsoft.VCRedist.2015+.x64", "--accept-package-agreements", "--accept-source-agreements")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		if err := cmd.Run(); err != nil {
			return w.installVCRedistChoco()
		}
		return nil
	}

	// Fall back to chocolatey
	if commandExists("choco") {
		return w.installVCRedistChoco()
	}

	return fmt.Errorf("neither winget nor chocolatey found")
}

func (w *WindowsPrerequisitesInstaller) installVCRedistChoco() error {
	fmt.Println("Installing Visual C++ Redistributables via Chocolatey...")
	cmd := exec.Command("choco", "install", "vcredist-all", "-y")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to install Visual C++ Redistributables: %w", err)
	}

	return nil
}
