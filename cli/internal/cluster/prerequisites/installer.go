package prerequisites

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/flamingo/openframe/internal/cluster/prerequisites/docker"
	"github.com/flamingo/openframe/internal/cluster/prerequisites/k3d"
	"github.com/flamingo/openframe/internal/cluster/prerequisites/kubectl"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

type Installer struct {
	checker *PrerequisiteChecker
}

func NewInstaller() *Installer {
	return &Installer{
		checker: NewPrerequisiteChecker(),
	}
}

func (i *Installer) InstallMissingPrerequisites() error {
	allPresent, missing := i.checker.CheckAll()
	if allPresent {
		pterm.Success.Println("All prerequisites are already installed.")
		return nil
	}

	pterm.Info.Printf("Starting installation of %d tool(s): %s\n", len(missing), strings.Join(missing, ", "))

	for idx, tool := range missing {
		// Create a spinner for the installation process
		spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("[%d/%d] Installing %s...", idx+1, len(missing), tool))

		if err := i.installTool(tool); err != nil {
			spinner.Fail(fmt.Sprintf("Failed to install %s: %v", tool, err))
			return fmt.Errorf("failed to install %s: %w", tool, err)
		}

		spinner.Success(fmt.Sprintf("%s installed successfully", tool))
	}

	// Verify all tools are now installed
	allPresent, stillMissing := i.checker.CheckAll()
	if !allPresent {
		pterm.Warning.Printf("Some tools are still missing: %s\n", strings.Join(stillMissing, ", "))
		return fmt.Errorf("installation completed but some tools are still missing: %s", strings.Join(stillMissing, ", "))
	}

	pterm.Success.Println("All prerequisites installed successfully!")
	return nil
}

func (i *Installer) installTool(tool string) error {
	switch strings.ToLower(tool) {
	case "docker":
		installer := docker.NewDockerInstaller()
		return installer.Install()
	case "kubectl":
		installer := kubectl.NewKubectlInstaller()
		return installer.Install()
	case "k3d":
		installer := k3d.NewK3dInstaller()
		return installer.Install()
	default:
		return fmt.Errorf("unknown tool: %s", tool)
	}
}

func (i *Installer) runCommand(name string, args ...string) error {
	// Handle shell commands with pipes
	if strings.Contains(strings.Join(args, " "), "|") {
		fullCmd := name + " " + strings.Join(args, " ")
		cmd := exec.Command("bash", "-c", fullCmd)
		// Completely silence output during installation
		return cmd.Run()
	}

	cmd := exec.Command(name, args...)
	// Completely silence output during installation
	return cmd.Run()
}

func (i *Installer) CheckAndInstall() error {
	allPresent, missing := i.checker.CheckAll()
	if allPresent {
		return nil
	}

	// Show missing prerequisites with nice formatting
	pterm.Warning.Printf("Missing Prerequisites: %s\n", strings.Join(missing, ", "))
	fmt.Println()

	// Single confirmation using shared UI
	confirmed, err := ui.ConfirmAction("Would you like me to install them automatically?")
	if err != nil {
		return fmt.Errorf("failed to get user confirmation: %w", err)
	}

	if confirmed {
		return i.InstallMissingPrerequisites()
	}

	// Show manual installation instructions for ALL prerequisites (not just missing ones)
	fmt.Println()
	pterm.Info.Println("Installation skipped. Here are manual installation instructions:")
	fmt.Println()

	// Get instructions for all prerequisites, not just the missing ones
	allInstructions := []string{
		docker.NewDockerInstaller().GetInstallHelp(),
		kubectl.NewKubectlInstaller().GetInstallHelp(),
		k3d.NewK3dInstaller().GetInstallHelp(),
	}

	tableData := pterm.TableData{{"Tool", "Installation Instructions"}}
	for _, instruction := range allInstructions {
		parts := strings.SplitN(instruction, ": ", 2)
		if len(parts) == 2 {
			tableData = append(tableData, []string{pterm.Cyan(parts[0]), parts[1]})
		} else {
			tableData = append(tableData, []string{"", instruction})
		}
	}

	pterm.DefaultTable.WithHasHeader().WithData(tableData).Render()

	// Exit cleanly without showing usage help
	os.Exit(1)
	return nil // This line will never be reached, but Go requires it
}
