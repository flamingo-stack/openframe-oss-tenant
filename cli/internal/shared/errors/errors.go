package errors

import (
	"fmt"
	"os"
	"strings"

	"github.com/pterm/pterm"
)

// ValidationError represents validation failures
type ValidationError struct {
	Field   string
	Value   string
	Message string
}

func (e *ValidationError) Error() string {
	if e.Value != "" {
		return fmt.Sprintf("validation failed for %s '%s': %s", e.Field, e.Value, e.Message)
	}
	return fmt.Sprintf("validation failed for %s: %s", e.Field, e.Message)
}

// CommandError represents command execution errors
type CommandError struct {
	Command string
	Args    []string
	Err     error
}

// AlreadyHandledError wraps errors that have already been displayed to the user
type AlreadyHandledError struct {
	OriginalError error
}

func (e *CommandError) Error() string {
	return fmt.Sprintf("command '%s %v' failed: %v", e.Command, e.Args, e.Err)
}

func (e *CommandError) Unwrap() error {
	return e.Err
}

func (e *AlreadyHandledError) Error() string {
	return e.OriginalError.Error()
}

func (e *AlreadyHandledError) Unwrap() error {
	return e.OriginalError
}

// ErrorHandler provides standardized error handling
type ErrorHandler struct {
	verbose bool
}

// NewErrorHandler creates a new error handler
func NewErrorHandler(verbose bool) *ErrorHandler {
	return &ErrorHandler{verbose: verbose}
}

// HandleError processes and displays errors consistently
func (eh *ErrorHandler) HandleError(err error) {
	if err == nil {
		return
	}

	switch e := err.(type) {
	case *ValidationError:
		eh.handleValidationError(e)
	case *CommandError:
		eh.handleCommandError(e)
	default:
		eh.handleGenericError(err)
	}
}

func (eh *ErrorHandler) handleValidationError(err *ValidationError) {
	pterm.Error.Printf("⚠️ Validation failed\n")
	pterm.Printf("  Field: %s\n", pterm.Yellow(err.Field))
	if err.Value != "" {
		pterm.Printf("  Value: %s\n", pterm.Red(err.Value))
	}
	pterm.Printf("  Issue: %s\n", err.Message)
}

func (eh *ErrorHandler) handleCommandError(err *CommandError) {
	pterm.Error.Printf("❌ Command execution failed\n")
	pterm.Printf("  Command: %s\n", pterm.Yellow(err.Command))
	if len(err.Args) > 0 {
		pterm.Printf("  Arguments: %v\n", err.Args)
	}
	
	if eh.verbose {
		pterm.Printf("  Details: %v\n", err.Err)
	} else {
		pterm.Printf("  Error: %v\n", err.Err)
	}
}

func (eh *ErrorHandler) handleGenericError(err error) {
	// Clean up common error patterns for better user experience
	errorMsg := err.Error()
	
	// Handle user interruptions (Ctrl+C)
	if eh.isUserInterruption(errorMsg) {
		fmt.Println()
		pterm.Info.Println("Operation cancelled by user.")
		os.Exit(1)
		return
	}
	
	// Extract meaningful error from complex error chains
	if strings.Contains(errorMsg, "cluster create operation failed") {
		pterm.Error.Printf("❌ Failed to create cluster\n")
		
		// Try to extract the actual k3d error and give helpful advice
		if strings.Contains(errorMsg, "exit status 1") && strings.Contains(errorMsg, "k3d cluster create") {
			pterm.Printf("  Issue: k3d cluster creation failed\n")
			fmt.Println()
			pterm.Info.Printf("🔧 Troubleshooting steps:\n")
			pterm.Printf("  1. Check Docker is running: docker info\n")
			pterm.Printf("  2. Check available ports: lsof -i :6550\n")
			pterm.Printf("  3. Try with different name: openframe cluster create my-test\n")
			pterm.Printf("  4. Check k3d directly: k3d version\n")
		} else {
			pterm.Printf("  Details: %s\n", errorMsg)
		}
	} else {
		// Generic error handling
		pterm.Error.Printf("❌ Operation failed\n")
		if eh.verbose {
			pterm.Printf("  Details: %v\n", err)
			pterm.Printf("  Type: %T\n", err)
		} else {
			// Show only the essential error message
			pterm.Printf("  Error: %s\n", errorMsg)
		}
	}
}

// isUserInterruption checks if the error represents a user interruption (Ctrl+C)
func (eh *ErrorHandler) isUserInterruption(errorMsg string) bool {
	// Common interruption patterns
	interruptions := []string{
		"interrupted",
		"interrupt",
		"^C",
		"cluster selection failed: ^C",
		"selection failed: ^C",
		"confirmation failed: ^C",
		"operation cancelled",
		"user cancelled",
	}
	
	errorLower := strings.ToLower(errorMsg)
	for _, pattern := range interruptions {
		if strings.Contains(errorLower, strings.ToLower(pattern)) {
			return true
		}
	}
	
	return false
}

// CreateValidationError creates a new validation error
func CreateValidationError(field, value, message string) *ValidationError {
	return &ValidationError{
		Field:   field,
		Value:   value,
		Message: message,
	}
}

// CreateCommandError creates a new command error
func CreateCommandError(command string, args []string, err error) *CommandError {
	return &CommandError{
		Command: command,
		Args:    args,
		Err:     err,
	}
}

// IsValidationError checks if an error is a validation error
func IsValidationError(err error) bool {
	_, ok := err.(*ValidationError)
	return ok
}

// IsCommandError checks if an error is a command error
func IsCommandError(err error) bool {
	_, ok := err.(*CommandError)
	return ok
}

// HandleGlobalError provides a global error handling entry point
// This should be used by all command RunE functions to ensure consistent error handling
func HandleGlobalError(err error, verbose bool) error {
	if err == nil {
		return nil
	}

	handler := NewErrorHandler(verbose)
	
	// Check if this is a user interruption - these should exit cleanly
	if handler.isUserInterruption(err.Error()) {
		fmt.Println()
		pterm.Info.Println("Operation cancelled by user.")
		os.Exit(1)
		return nil // Won't be reached
	}
	
	// For non-interruption errors, display the error but still return it
	// so that tests and scripts can detect failures via exit codes
	handler.HandleError(err)
	
	// Create a wrapped error that signals we've already handled the display
	return &AlreadyHandledError{OriginalError: err}
}