package ui

import (
	"fmt"

	"github.com/pterm/pterm"
)

// ShowNoResourcesMessage displays a friendly message when no resources are available
func ShowNoResourcesMessage(resourceType, operation, createCommand, listCommand string) {
	pterm.Warning.Printf("No %s found for %s operation\n", resourceType, operation)
	fmt.Println()
	
	boxContent := fmt.Sprintf(
		"No %s are currently available.\n\n"+
		"To get started:\n"+
		"  • Create a new %s: %s\n"+
		"  • List existing %s: %s\n\n"+
		"Need help? Try: %s",
		resourceType,
		resourceType,
		pterm.Green(createCommand),
		resourceType,
		pterm.Cyan(listCommand), 
		pterm.Gray("--help"),
	)
	
	pterm.DefaultBox.
		WithTitle(fmt.Sprintf(" No %s Available ", resourceType)).
		WithTitleTopCenter().
		Println(boxContent)
	fmt.Println()
}

// ShowOperationStart displays a friendly message when starting an operation
func ShowOperationStart(operation, resourceName string, customMessages map[string]string) {
	message, exists := customMessages[operation]
	if !exists {
		message = fmt.Sprintf("Processing '%s' for %s...", operation, pterm.Cyan(resourceName))
	}
	
	pterm.Info.Println(message)
}

// ShowOperationSuccess displays a friendly success message
func ShowOperationSuccess(operation, resourceName string, customMessages map[string]string) {
	message, exists := customMessages[operation]
	if !exists {
		message = fmt.Sprintf("Operation '%s' completed for %s", operation, pterm.Cyan(resourceName))
	}
	
	pterm.Success.Println(message)
	fmt.Println()
}

// ShowOperationError displays a friendly error message with troubleshooting tips
func ShowOperationError(operation, resourceName string, err error, troubleshootingTips []TroubleshootingTip) {
	pterm.Error.Printf("Operation '%s' failed for %s\n", operation, pterm.Cyan(resourceName))
	pterm.Printf("Error details: %s\n\n", pterm.Red(err.Error()))
	
	if len(troubleshootingTips) > 0 {
		// Show helpful suggestions
		tableData := pterm.TableData{}
		
		for i, tip := range troubleshootingTips {
			tableData = append(tableData, []string{
				fmt.Sprintf("%d.", i+1),
				pterm.Gray(tip.Description) + " " + pterm.Cyan(tip.Command),
			})
		}
		
		pterm.Info.Println("Troubleshooting Tips:")
		if err := pterm.DefaultTable.WithData(tableData).Render(); err != nil {
			pterm.Printf("Troubleshooting:\n")
			for i, tip := range troubleshootingTips {
				pterm.Printf("  %d. %s: %s\n", i+1, tip.Description, pterm.Cyan(tip.Command))
			}
		}
	}
	fmt.Println()
}

// TroubleshootingTip represents a troubleshooting suggestion
type TroubleshootingTip struct {
	Description string
	Command     string
}