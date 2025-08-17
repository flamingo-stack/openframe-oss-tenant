package utils

import (
	"fmt"
	"strings"

	"github.com/pterm/pterm"
)


// HandleSpinnerError handles spinner failure with consistent messaging
func HandleSpinnerError(spinner *pterm.SpinnerPrinter, message string, err error) error {
	if spinner != nil {
		spinner.Fail(message)
	}
	return fmt.Errorf("%s: %w", strings.ToLower(message), err)
}

// ConfirmAction is a generic confirmation helper
func ConfirmAction(message string, force bool) (bool, error) {
	if force {
		return true, nil
	}
	
	// This should use the actual UI confirmation logic
	// For now, assuming there's a confirmation utility
	return false, fmt.Errorf("confirmation not implemented")
}

// ShowOperationCancelled displays a generic cancellation message
func ShowOperationCancelled(operation string) {
	pterm.Info.Printf("%s operation cancelled.\n", operation)
}