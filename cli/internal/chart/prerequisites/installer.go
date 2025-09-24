package prerequisites

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/flamingo/openframe/internal/chart/prerequisites/certificates"
	"github.com/flamingo/openframe/internal/chart/prerequisites/git"
	"github.com/flamingo/openframe/internal/chart/prerequisites/helm"
	"github.com/flamingo/openframe/internal/chart/prerequisites/memory"
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

	return i.installMissingTools(missing)
}

func (i *Installer) installMissingTools(tools []string) error {
	return i.installMissingToolsNonInteractive(tools, false)
}

// installMissingToolsNonInteractive installs missing tools with optional non-interactive mode
func (i *Installer) installMissingToolsNonInteractive(tools []string, nonInteractive bool) error {
	if len(tools) == 0 {
		pterm.Success.Println("All prerequisites are already installed.")
		return nil
	}

	pterm.Info.Printf("Starting installation of %d prerequisite(s): %s\n", len(tools), strings.Join(tools, ", "))

	for idx, tool := range tools {
		// Skip memory as it can't be installed
		if strings.ToLower(tool) == "memory" {
			continue
		}

		// Create a spinner for the installation process
		spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("[%d/%d] Installing %s...", idx+1, len(tools), tool))

		if err := i.installToolNonInteractive(tool, nonInteractive); err != nil {
			// In non-interactive mode, log error but continue with next tool
			if nonInteractive {
				spinner.Warning(fmt.Sprintf("Skipped %s: %v", tool, err))
				continue
			}
			spinner.Fail(fmt.Sprintf("Failed to install %s: %v", tool, err))
			return fmt.Errorf("failed to install %s: %w", tool, err)
		}

		spinner.Success(fmt.Sprintf("%s installed successfully", tool))
	}

	// Verify all tools are now installed
	_, stillMissing := i.checker.CheckAll()

	// Filter out memory from verification (we only care about installable tools)
	stillMissingInstallable := []string{}
	for _, tool := range stillMissing {
		if strings.ToLower(tool) != "memory" {
			stillMissingInstallable = append(stillMissingInstallable, tool)
		}
	}

	if len(stillMissingInstallable) > 0 {
		// In non-interactive mode, just warn and continue
		if nonInteractive {
			pterm.Warning.Printf("Some tools are still missing: %s\n", strings.Join(stillMissingInstallable, ", "))
			pterm.Info.Println("Continuing with available tools (non-interactive mode)...")
			return nil
		}
		pterm.Warning.Printf("Some tools are still missing: %s\n", strings.Join(stillMissingInstallable, ", "))
		return fmt.Errorf("installation completed but some tools are still missing: %s", strings.Join(stillMissingInstallable, ", "))
	}

	pterm.Success.Println("All prerequisites installed successfully!")
	return nil
}

func (i *Installer) installTool(tool string) error {
	return i.installToolNonInteractive(tool, false)
}

// installToolNonInteractive installs a single tool with optional non-interactive mode
func (i *Installer) installToolNonInteractive(tool string, nonInteractive bool) error {
	switch strings.ToLower(tool) {
	case "git":
		checker := git.NewGitChecker()
		if checker.IsInstalled() {
			return nil // Already installed
		}
		return fmt.Errorf("git is not installed. %s", checker.GetInstallInstructions())
	case "helm":
		installer := helm.NewHelmInstaller()
		return installer.Install()
	case "memory":
		// Memory cannot be automatically installed
		return fmt.Errorf("memory cannot be automatically increased. Please add more physical RAM or increase virtual memory allocation")
	case "certificates":
		if nonInteractive {
			// In non-interactive mode (CI/CD), skip certificate generation
			pterm.Info.Println("Skipping certificate generation in non-interactive mode (not needed for CI/CD)")
			return nil
		}
		installer := certificates.NewCertificateInstaller()
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
	_, missing := i.checker.CheckAll()

	// Check memory separately for warning
	memChecker := memory.NewMemoryChecker()
	current, recommended, sufficient := memChecker.GetMemoryInfo()

	// Show memory warning if insufficient (but don't block)
	if !sufficient {
		pterm.Warning.Printf("⚠️  Memory Warning: %d MB available, %d MB recommended\n", current, recommended)
		pterm.Info.Println("Charts may not deploy successfully with insufficient memory. Consider adding more RAM.")
		fmt.Println()
	}

	// Filter out memory from missing tools (we handle it as warning only)
	installableMissing := []string{}
	for _, tool := range missing {
		if strings.ToLower(tool) != "memory" {
			installableMissing = append(installableMissing, tool)
		}
	}

	if len(installableMissing) > 0 {
		// Show missing prerequisites with nice formatting
		pterm.Warning.Printf("Missing Prerequisites: %s\n", strings.Join(installableMissing, ", "))

		var confirmed bool
		if nonInteractive {
			// Auto-approve in non-interactive mode
			pterm.Info.Println("Auto-installing prerequisites (non-interactive mode)...")
			confirmed = true
		} else {
			// Single confirmation using shared UI
			var err error
			confirmed, err = ui.ConfirmActionInteractive("Would you like me to install them automatically?", true)
			if err := errors.WrapConfirmationError(err, "failed to get user confirmation"); err != nil {
				return err
			}
		}

		if confirmed {
			if err := i.installMissingToolsNonInteractive(installableMissing, nonInteractive); err != nil {
				// In non-interactive mode, log error but continue
				if nonInteractive {
					pterm.Warning.Printf("Failed to install some prerequisites: %v\n", err)
					pterm.Info.Println("Continuing anyway (non-interactive mode)...")
					return nil
				}
				return err
			}
		} else {
			// Show manual installation instructions and exit
			fmt.Println()
			pterm.Info.Println("Installation skipped. Here are manual installation instructions:")

			// Get instructions for all prerequisites
			allInstructions := []string{
				git.NewGitChecker().GetInstallInstructions(),
				helm.NewHelmInstaller().GetInstallHelp(),
				memory.NewMemoryChecker().GetInstallHelp(),
				certificates.NewCertificateInstaller().GetInstallHelp(),
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
			os.Exit(1)
		}
	}

	return nil
}

// RegenerateCertificatesOnly just regenerates certificates without checking other prerequisites
// This should be used for the install command only
func (i *Installer) RegenerateCertificatesOnly() error {
	certInstaller := certificates.NewCertificateInstaller()
	spinner, _ := pterm.DefaultSpinner.Start("Refreshing certificates...")
	if err := certInstaller.ForceRegenerate(); err != nil {
		if strings.Contains(err.Error(), "user cancelled") {
			spinner.Warning("Certificate trust skipped (deployment would be unsecure)")
		} else {
			spinner.Warning(fmt.Sprintf("Could not refresh certificates: %v", err))
		}
		// Non-fatal - continue anyway
	} else {
		spinner.Info("Certificates refreshed")
	}

	return nil
}
