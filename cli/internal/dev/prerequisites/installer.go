package prerequisites

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/dev/prerequisites/jq"
	"github.com/flamingo/openframe/internal/dev/prerequisites/scaffold"
	"github.com/flamingo/openframe/internal/dev/prerequisites/telepresence"
	"github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

type Installer struct {
	checker *PrerequisiteChecker
}

type ToolInstaller interface {
	IsInstalled() bool
	GetInstallHelp() string
	Install() error
}

func NewInstaller() *Installer {
	return &Installer{
		checker: NewPrerequisiteChecker(),
	}
}


func (i *Installer) installMissingTools(missing []string) error {
	pterm.Info.Printf("Starting installation of %d tool(s): %s\n", len(missing), strings.Join(missing, ", "))
	
	var installers = map[string]ToolInstaller{
		"telepresence": telepresence.NewTelepresenceInstaller(),
		"jq":           jq.NewJqInstaller(),
		"skaffold":     scaffold.NewScaffoldInstaller(),
	}
	
	for idx, toolName := range missing {
		// Create a spinner for the installation process
		spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("[%d/%d] Installing %s...", idx+1, len(missing), toolName))
		
		// Use lowercase key for lookup
		if installer, exists := installers[strings.ToLower(toolName)]; exists {
			if err := installer.Install(); err != nil {
				spinner.Fail(fmt.Sprintf("Failed to install %s: %v", toolName, err))
				pterm.Info.Printf("Please install %s manually: %s\n", toolName, installer.GetInstallHelp())
				return fmt.Errorf("failed to install %s: %w", toolName, err)
			}
			
			spinner.Success(fmt.Sprintf("%s installed successfully", toolName))
		} else {
			spinner.Fail(fmt.Sprintf("Unknown tool: %s", toolName))
			return fmt.Errorf("unknown tool: %s", toolName)
		}
	}
	
	// Verify installation
	allPresent, stillMissing := i.CheckSilent()
	if !allPresent {
		pterm.Warning.Printf("Some tools failed to install: %s\n", strings.Join(stillMissing, ", "))
		i.showInstallationInstructions(stillMissing)
		return fmt.Errorf("installation failed for: %s", strings.Join(stillMissing, ", "))
	}
	
	pterm.Success.Println("All development tools are now installed!")
	return nil
}

func (i *Installer) showInstallationInstructions(missing []string) {
	pterm.Error.Println("Please install the following required tools:")
	fmt.Println()
	
	instructions := i.checker.GetInstallInstructions(missing)
	for _, instruction := range instructions {
		pterm.Info.Printf("  • %s\n", instruction)
	}
	
	fmt.Println()
	pterm.Info.Println("After installation, run the command again")
}

// CheckSpecificTools checks only specific tools (useful for individual commands)
func (i *Installer) CheckSpecificTools(tools []string) error {
	pterm.Info.Printf("Checking required tools: %s\n", strings.Join(tools, ", "))
	
	var missing []string
	var installers = map[string]ToolInstaller{
		"telepresence": telepresence.NewTelepresenceInstaller(),
		"jq":           jq.NewJqInstaller(),
		"skaffold":     scaffold.NewScaffoldInstaller(),
	}
	
	for _, tool := range tools {
		if installer, exists := installers[strings.ToLower(tool)]; exists {
			if !installer.IsInstalled() {
				missing = append(missing, tool)
			}
		}
	}
	
	if len(missing) > 0 {
		pterm.Warning.Printf("Missing tools: %s\n", strings.Join(missing, ", "))
		i.showInstallationInstructions(missing)
		return fmt.Errorf("required tools are not installed: %s", strings.Join(missing, ", "))
	}
	
	pterm.Success.Println("All required tools are installed")
	return nil
}

// Silent check without output
func (i *Installer) CheckSilent() (bool, []string) {
	return i.checker.CheckAll()
}

// CheckAndInstall checks prerequisites and offers to install missing tools (like cluster commands)
func (i *Installer) CheckAndInstall() error {
	// Skip prerequisite checks in test mode
	if ui.TestMode {
		return nil
	}
	
	
	allPresent, missing := i.CheckSilent()
	
	if allPresent {
		pterm.Success.Println("All required development tools are installed")
		return nil
	}

	pterm.Warning.Printf("Missing Prerequisites: %s\n", strings.Join(missing, ", "))
	
	// Ask user if they want to auto-install
	confirmed, err := ui.ConfirmActionInteractive("Would you like me to install them automatically?", true)
	if err != nil {
		return fmt.Errorf("failed to get user confirmation: %w", err)
	}

	if confirmed {
		return i.installMissingTools(missing)
	} else {
		// Show manual installation instructions
		i.showInstallationInstructions(missing)
		return fmt.Errorf("required development tools are not installed")
	}
}

// For backward compatibility with existing intercept service pattern
func CheckTelepresenceAndJq() error {
	installer := NewInstaller()
	return installer.CheckAndInstall()
}