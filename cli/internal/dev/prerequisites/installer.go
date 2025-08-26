package prerequisites

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/dev/prerequisites/jq"
	"github.com/flamingo/openframe/internal/dev/prerequisites/scaffold"
	"github.com/flamingo/openframe/internal/dev/prerequisites/telepresence"
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

func (i *Installer) CheckAndInstall() error {
	pterm.Info.Println("Checking development tools prerequisites...")
	
	allPresent, missing := i.checker.CheckAll()
	
	if allPresent {
		pterm.Success.Println("All required development tools are installed")
		return nil
	}

	pterm.Warning.Printf("Missing tools: %s\n", strings.Join(missing, ", "))
	
	// Ask user if they want to auto-install
	if i.shouldAutoInstall(missing) {
		return i.installMissingTools(missing)
	}
	
	// Show manual installation instructions
	i.showInstallationInstructions(missing)
	return fmt.Errorf("required development tools are not installed")
}

func (i *Installer) shouldAutoInstall(missing []string) bool {
	// For now, return false to always show manual instructions
	// This can be enhanced later with user prompts
	return false
}

func (i *Installer) installMissingTools(missing []string) error {
	pterm.Info.Println("Installing missing development tools...")
	
	var installers = map[string]ToolInstaller{
		"Telepresence": telepresence.NewTelepresenceInstaller(),
		"jq":           jq.NewJqInstaller(),
		"Skaffold":     scaffold.NewScaffoldInstaller(),
	}
	
	for _, toolName := range missing {
		if installer, exists := installers[toolName]; exists {
			pterm.Info.Printf("Installing %s...\n", toolName)
			
			if err := installer.Install(); err != nil {
				pterm.Error.Printf("Failed to install %s: %v\n", toolName, err)
				pterm.Info.Printf("Please install %s manually: %s\n", toolName, installer.GetInstallHelp())
				return fmt.Errorf("failed to install %s: %w", toolName, err)
			}
			
			pterm.Success.Printf("%s installed successfully\n", toolName)
		}
	}
	
	// Verify installation
	allPresent, stillMissing := i.checker.CheckAll()
	if !allPresent {
		pterm.Error.Printf("Some tools are still missing after installation: %s\n", strings.Join(stillMissing, ", "))
		return fmt.Errorf("installation verification failed")
	}
	
	pterm.Success.Println("All development tools are now installed")
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

// For backward compatibility with existing intercept service pattern
func CheckTelepresenceAndJq() error {
	installer := NewInstaller()
	return installer.CheckSpecificTools([]string{"telepresence", "jq"})
}