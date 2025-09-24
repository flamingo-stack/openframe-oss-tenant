package prerequisites

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/flamingo/openframe/internal/cluster/prerequisites/docker"
	"github.com/flamingo/openframe/internal/cluster/prerequisites/k3d"
	"github.com/flamingo/openframe/internal/cluster/prerequisites/kubectl"
	"github.com/flamingo/openframe/internal/shared/errors"
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

func (i *Installer) installSpecificTools(tools []string) error {
	pterm.Info.Printf("Starting installation of %d tool(s): %s\n", len(tools), strings.Join(tools, ", "))

	for idx, tool := range tools {
		// Create a spinner for the installation process
		spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("[%d/%d] Installing %s...", idx+1, len(tools), tool))

		if err := i.installTool(tool); err != nil {
			spinner.Fail(fmt.Sprintf("Failed to install %s: %v", tool, err))
			return fmt.Errorf("failed to install %s: %w", tool, err)
		}

		spinner.Success(fmt.Sprintf("%s installed successfully", tool))
	}

	// Verify only the installed tools are actually installed (don't check Docker running state)
	var stillMissing []string
	for _, tool := range tools {
		switch strings.ToLower(tool) {
		case "docker":
			if !docker.NewDockerInstaller().IsInstalled() {
				stillMissing = append(stillMissing, "Docker")
			}
		case "kubectl":
			if !kubectl.NewKubectlInstaller().IsInstalled() {
				stillMissing = append(stillMissing, "kubectl")
			}
		case "k3d":
			if !k3d.NewK3dInstaller().IsInstalled() {
				stillMissing = append(stillMissing, "k3d")
			}
		}
	}

	if len(stillMissing) > 0 {
		pterm.Warning.Printf("Some tools failed to install: %s\n", strings.Join(stillMissing, ", "))
		return fmt.Errorf("installation failed for: %s", strings.Join(stillMissing, ", "))
	}

	// Don't show success here, let the main flow handle it
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
	return i.CheckAndInstallNonInteractive(false)
}

// CheckAndInstallNonInteractive checks and installs prerequisites with optional non-interactive mode
func (i *Installer) CheckAndInstallNonInteractive(nonInteractive bool) error {
	// PHASE 1: Check what's actually missing vs what's not running
	allPresent, missing := i.checker.CheckAll()
	if allPresent {
		return nil
	}

	// Separate into truly missing tools vs Docker not running
	var missingTools []string
	var dockerNotRunning bool

	for _, tool := range missing {
		switch strings.ToLower(tool) {
		case "docker":
			if docker.NewDockerInstaller().IsInstalled() {
				// Docker is installed but not running - handle later
				dockerNotRunning = true
			} else {
				// Docker is not installed - needs installation
				missingTools = append(missingTools, "Docker")
			}
		default:
			// All other tools are truly missing if they show up in missing list
			missingTools = append(missingTools, tool)
		}
	}

	// PHASE 2: Install missing tools FIRST
	if len(missingTools) > 0 {
		pterm.Warning.Printf("Missing Prerequisites: %s\n", strings.Join(missingTools, ", "))

		var confirmed bool
		if nonInteractive {
			// Auto-approve in non-interactive mode
			pterm.Info.Println("Auto-installing prerequisites (non-interactive mode)...")
			confirmed = true
		} else {
			var err error
			confirmed, err = ui.ConfirmActionInteractive("Would you like me to install them automatically?", true)
			if err := errors.WrapConfirmationError(err, "failed to get user confirmation"); err != nil {
				return err
			}
		}

		if confirmed {
			if err := i.installSpecificTools(missingTools); err != nil {
				// In non-interactive mode, log error but continue
				if nonInteractive {
					pterm.Warning.Printf("Failed to install some prerequisites: %v\n", err)
					pterm.Info.Println("Continuing anyway (non-interactive mode)...")
				} else {
					return err
				}
			} else {
				pterm.Success.Println("All missing tools installed successfully!")
			}
		} else {
			i.showManualInstructions()
			os.Exit(1)
		}
	}

	// PHASE 3: Now check if Docker needs to be started (after all tools are installed)
	if dockerNotRunning {
		if nonInteractive {
			// In non-interactive mode, try to start Docker automatically
			pterm.Warning.Println("Docker is not running.")
			pterm.Info.Println("Attempting to start Docker automatically (non-interactive mode)...")

			if err := docker.StartDocker(); err != nil {
				pterm.Warning.Printf("Could not start Docker automatically: %v\n", err)
				pterm.Info.Println("Docker must be started manually. Continuing anyway...")
				// Don't exit in non-interactive mode, let it fail later if needed
				return nil
			}

			spinner, _ := pterm.DefaultSpinner.Start("Waiting for Docker to start...")
			if err := docker.WaitForDocker(); err != nil {
				spinner.Warning("Docker failed to start automatically")
				pterm.Info.Println("Please ensure Docker is running before cluster operations.")
				// Don't exit in non-interactive mode
				return nil
			}
			spinner.Success("Docker started successfully")
		} else {
			// Interactive mode - prompt user
			pterm.Warning.Println("Docker is not running.")
			confirmed, err := ui.ConfirmActionInteractive("Would you like me to start Docker for you?", true)
			if errors.HandleConfirmationError(err) {
				return nil // Won't be reached due to os.Exit in handler
			}
			if err != nil {
				return fmt.Errorf("failed to get Docker start confirmation: %w", err)
			}
			if confirmed {
				if err := docker.StartDocker(); err != nil {
					pterm.Error.Printf("Failed to start Docker: %v\n", err)
					pterm.Info.Println("Please start Docker Desktop manually and try again.")
					os.Exit(1)
				}
				spinner, _ := pterm.DefaultSpinner.Start("Waiting for Docker to start...")
				if err := docker.WaitForDocker(); err != nil {
					spinner.Fail("Docker failed to start")
					pterm.Info.Println("Please start Docker Desktop manually and try again.")
					os.Exit(1)
				}
				spinner.Success("Docker started successfully")
			} else {
				i.showDockerStartInstructions()
				os.Exit(1)
			}
		}
	}

	return nil
}

func (i *Installer) showManualInstructions() {
	fmt.Println()
	pterm.Info.Println("Installation skipped. Here are manual installation instructions:")

	// Get instructions for all prerequisites
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
}

func (i *Installer) showDockerStartInstructions() {
	fmt.Println()
	pterm.Info.Println("Please start Docker manually and try again:")
	switch runtime.GOOS {
	case "darwin":
		pterm.Printf("• Open Docker Desktop from Applications or Launchpad\n")
		pterm.Printf("• Or run: %s\n", pterm.Cyan("open -a Docker"))
		pterm.Printf("• Wait for Docker to fully start (whale icon in menu bar should be steady)\n")
	case "linux":
		pterm.Printf("• Start Docker daemon:\n")
		pterm.Printf("  %s\n", pterm.Cyan("sudo systemctl start docker"))
		pterm.Printf("• Or if using Docker Desktop:\n")
		pterm.Printf("  %s\n", pterm.Cyan("systemctl --user start docker-desktop"))
		pterm.Printf("• Enable Docker to start on boot (optional):\n")
		pterm.Printf("  %s\n", pterm.Cyan("sudo systemctl enable docker"))
	case "windows":
		pterm.Printf("• Start Docker Desktop from Start Menu or Desktop shortcut\n")
		pterm.Printf("• Or run from Command Prompt:\n")
		pterm.Printf("  %s\n", pterm.Cyan(`"C:\Program Files\Docker\Docker\Docker Desktop.exe"`))
		pterm.Printf("• Wait for Docker to fully start (system tray icon should show running)\n")
	default:
		pterm.Printf("• Start Docker Desktop or Docker daemon according to your system\n")
		pterm.Printf("• Verify Docker is running: %s\n", pterm.Cyan("docker ps"))
	}
}
