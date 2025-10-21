package prerequisites

import (
	"fmt"
	"os"
	"strings"

	clusterUtils "github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/jq"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/scaffold"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/telepresence"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
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

// CheckAndInstallSpecificTools checks specific tools and offers to install missing ones
func (i *Installer) CheckAndInstallSpecificTools(tools []string) error {
	// Skip prerequisite checks in test mode
	if ui.TestMode {
		return nil
	}

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

	if len(missing) == 0 {
		// All tools are installed, proceed
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
		// Tools are already installed, proceed
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
	return checkAndInstallInterceptTools()
}

// checkAndInstallInterceptTools checks and installs only telepresence and jq (no Skaffold)
func checkAndInstallInterceptTools() error {
	// Skip prerequisite checks in test mode
	if ui.TestMode {
		return nil
	}

	var missing []string
	var installers = map[string]ToolInstaller{
		"telepresence": telepresence.NewTelepresenceInstaller(),
		"jq":           jq.NewJqInstaller(),
	}

	// Only check telepresence and jq
	tools := []string{"telepresence", "jq"}
	for _, tool := range tools {
		if installer, exists := installers[strings.ToLower(tool)]; exists {
			if !installer.IsInstalled() {
				missing = append(missing, tool)
			}
		}
	}

	if len(missing) == 0 {
		// All tools are installed, proceed
		return nil
	}

	pterm.Warning.Printf("Missing Prerequisites: %s\n", strings.Join(missing, ", "))

	// Ask user if they want to auto-install
	confirmed, err := ui.ConfirmActionInteractive("Would you like me to install them automatically?", true)
	if err != nil {
		return fmt.Errorf("failed to get user confirmation: %w", err)
	}

	if confirmed {
		return installInterceptTools(missing, installers)
	} else {
		// Show manual installation instructions
		showInterceptInstallationInstructions(missing, installers)
		os.Exit(0) // Exit cleanly without continuing to cluster check
		return nil // Unreachable, but required by compiler
	}
}

// installInterceptTools installs only telepresence and jq with proper spinner
func installInterceptTools(missing []string, installers map[string]ToolInstaller) error {
	pterm.Info.Printf("Starting installation of %d tool(s): %s\n", len(missing), strings.Join(missing, ", "))

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

	return nil
}

// showInterceptInstallationInstructions shows installation instructions for telepresence and jq only
func showInterceptInstallationInstructions(missing []string, installers map[string]ToolInstaller) {
	pterm.Println() // Add blank line for spacing
	pterm.Info.Println("Installation skipped. Here are manual installation instructions:")

	tableData := pterm.TableData{{"Tool", "Installation Instructions"}}
	for _, tool := range missing {
		if installer, exists := installers[strings.ToLower(tool)]; exists {
			instruction := installer.GetInstallHelp()
			tableData = append(tableData, []string{pterm.Cyan(tool), instruction})
		}
	}

	pterm.DefaultTable.WithHasHeader().WithData(tableData).Render()
}

// CheckInterceptPrerequisites checks prerequisites for intercept command including cluster availability
func CheckInterceptPrerequisites() error {
	// First check telepresence and jq - if this fails, don't continue to cluster check
	if err := CheckTelepresenceAndJq(); err != nil {
		return err
	}

	// Only check clusters if telepresence and jq are available
	return checkClusterAvailability()
}

// CheckScaffoldPrerequisites checks prerequisites for scaffold command including cluster availability
func CheckScaffoldPrerequisites() error {
	// First check skaffold - if this fails, don't continue to cluster check
	if err := checkAndInstallSkaffold(); err != nil {
		return err
	}

	// Only check clusters if skaffold is available
	return checkClusterAvailability()
}

// checkAndInstallSkaffold checks and installs only skaffold (similar to intercept tools)
func checkAndInstallSkaffold() error {
	// Skip prerequisite checks in test mode
	if ui.TestMode {
		return nil
	}

	var missing []string
	var installers = map[string]ToolInstaller{
		"skaffold": scaffold.NewScaffoldInstaller(),
	}

	// Only check skaffold
	tools := []string{"skaffold"}
	for _, tool := range tools {
		if installer, exists := installers[strings.ToLower(tool)]; exists {
			if !installer.IsInstalled() {
				missing = append(missing, tool)
			}
		}
	}

	if len(missing) == 0 {
		// All tools are installed, proceed
		return nil
	}

	pterm.Warning.Printf("Missing Prerequisites: %s\n", strings.Join(missing, ", "))

	// Ask user if they want to auto-install
	confirmed, err := ui.ConfirmActionInteractive("Would you like me to install them automatically?", true)
	if err != nil {
		return fmt.Errorf("failed to get user confirmation: %w", err)
	}

	if confirmed {
		return installScaffoldTools(missing, installers)
	} else {
		// Show manual installation instructions
		showScaffoldInstallationInstructions(missing, installers)
		os.Exit(0) // Exit cleanly without continuing to cluster check
		return nil // Unreachable, but required by compiler
	}
}

// installScaffoldTools installs only skaffold with proper spinner
func installScaffoldTools(missing []string, installers map[string]ToolInstaller) error {
	pterm.Info.Printf("Starting installation of %d tool(s): %s\n", len(missing), strings.Join(missing, ", "))

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

	return nil
}

// showScaffoldInstallationInstructions shows installation instructions for skaffold only
func showScaffoldInstallationInstructions(missing []string, installers map[string]ToolInstaller) {
	pterm.Println() // Add blank line for spacing
	pterm.Info.Println("Installation skipped. Here are manual installation instructions:")

	tableData := pterm.TableData{{"Tool", "Installation Instructions"}}
	for _, tool := range missing {
		if installer, exists := installers[strings.ToLower(tool)]; exists {
			instruction := installer.GetInstallHelp()
			tableData = append(tableData, []string{pterm.Cyan(tool), instruction})
		}
	}

	pterm.DefaultTable.WithHasHeader().WithData(tableData).Render()
}

// checkClusterAvailability checks if clusters exist for intercept (similar to chart install)
func checkClusterAvailability() error {
	clusterService := clusterUtils.GetCommandService()

	clusters, err := clusterService.ListClusters()
	if err != nil || len(clusters) == 0 {
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		os.Exit(0) // Exit cleanly without showing technical error
	}

	return nil
}
