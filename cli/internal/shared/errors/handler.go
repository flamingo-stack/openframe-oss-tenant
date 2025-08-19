package errors

import (
	"fmt"
	"os"

	"github.com/pterm/pterm"
)

// HandleConfirmationError handles errors from user confirmation prompts
// Returns true if the error was handled (program should exit), false if it should be returned up
func HandleConfirmationError(err error) bool {
	if err == nil {
		return false
	}
	
	// Handle both old style "interrupted" and pterm style interruptions
	if err.Error() == "interrupted" || err.Error() == "interrupt" {
		fmt.Println()
		pterm.Info.Println("Operation cancelled by user.")
		os.Exit(1)
		return true // This won't be reached due to os.Exit, but for clarity
	}
	
	return false // Error was not handled, should be returned up the call stack
}

// WrapConfirmationError wraps confirmation errors with context, but handles interruption gracefully
func WrapConfirmationError(err error, context string) error {
	if HandleConfirmationError(err) {
		return nil // Won't be reached due to os.Exit in HandleConfirmationError
	}
	
	if err != nil {
		return fmt.Errorf("%s: %w", context, err)
	}
	
	return nil
}