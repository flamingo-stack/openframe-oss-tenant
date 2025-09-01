package ui

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
	"golang.org/x/term"
)

// ConfirmActionInteractive prompts the user with a polished interactive confirmation
// Uses pterm's interactive confirm with colored styling and clear y/N format
func ConfirmActionInteractive(message string, defaultValue bool) (bool, error) {
	return pterm.DefaultInteractiveConfirm.
		WithDefaultText(message).
		WithDefaultValue(defaultValue).
		Show()
}

// ConfirmDeletion prompts for deletion confirmation with consistent styling
func ConfirmDeletion(resourceType, resourceName string) (bool, error) {
	message := fmt.Sprintf("Are you sure you want to delete %s '%s'?", resourceType, pterm.Cyan(resourceName))
	return pterm.DefaultInteractiveConfirm.
		WithDefaultText(message).
		WithDefaultValue(false).
		Show()
}

// ConfirmAction prompts the user to confirm an action with friendly UX:
// - Enter = yes (default)
// - y = yes (immediate, no Enter needed)  
// - n = no (immediate, no Enter needed)
func ConfirmAction(message string) (bool, error) {
	fmt.Printf("%s (Y/n): ", pterm.Bold.Sprint(message))
	
	// Get the file descriptor for stdin
	fd := int(os.Stdin.Fd())
	
	// Check if stdin is a terminal
	if !term.IsTerminal(fd) {
		// Fallback for non-terminal input (like pipes/tests)
		reader := bufio.NewReader(os.Stdin)
		input, err := reader.ReadString('\n')
		if err != nil {
			return false, err
		}
		input = strings.ToLower(strings.TrimSpace(input))
		return input == "" || input == "y" || input == "yes", nil
	}
	
	// Save the current terminal state
	oldState, err := term.MakeRaw(fd)
	if err != nil {
		return false, err
	}
	
	// Read single character
	buf := make([]byte, 1)
	for {
		_, err := os.Stdin.Read(buf)
		if err != nil {
			term.Restore(fd, oldState)
			return false, err
		}
		
		char := buf[0]
		
		switch char {
		case '\r', '\n': // Enter key
			term.Restore(fd, oldState)
			fmt.Println()
			return true, nil // Default to yes
		case 'y', 'Y':
			term.Restore(fd, oldState)
			fmt.Println("y")
			return true, nil
		case 'n', 'N':
			term.Restore(fd, oldState)
			fmt.Println("n")
			return false, nil
		case 3: // Ctrl+C
			term.Restore(fd, oldState)
			fmt.Println()
			return false, fmt.Errorf("interrupted")
		// Ignore other characters and continue reading
		}
	}
}

// SelectFromList prompts the user to select from a list of options
func SelectFromList(label string, items []string) (int, string, error) {
	prompt := promptui.Select{
		Label: label,
		Items: items,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}?",
			Active:   "\U00002192 {{ . | cyan }}",
			Inactive: "  {{ . | white }}",
			Selected: "\U00002713 {{ . | green }}",
		},
	}

	return prompt.Run()
}

// SelectFromListWithSearch prompts the user to select from a list with search/filter capability
func SelectFromListWithSearch(label string, items []string) (int, string, error) {
	prompt := promptui.Select{
		Label: label,
		Items: items,
		Size:  5, // Show max 5 items at once
		Searcher: func(input string, index int) bool {
			item := items[index]
			name := strings.ToLower(item)
			input = strings.ToLower(input)
			return strings.Contains(name, input)
		},
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}?",
			Active:   "\U00002192 {{ . | cyan }}",
			Inactive: "  {{ . | white }}",
			Selected: "\U00002713 {{ . | green }}",
		},
	}

	return prompt.Run()
}

// SelectFromListWithCustomTemplates provides more control over selection styling
func SelectFromListWithCustomTemplates(label string, items []string, templates *promptui.SelectTemplates) (int, string, error) {
	prompt := promptui.Select{
		Label:     label,
		Items:     items,
		Templates: templates,
	}

	return prompt.Run()
}

// GetInput prompts the user for text input
func GetInput(label, defaultValue string, validate func(string) error) (string, error) {
	prompt := promptui.Prompt{
		Label:    label,
		Default:  defaultValue,
		Validate: validate,
	}

	return prompt.Run()
}

// GetMultiChoice prompts the user to select multiple items from a list
func GetMultiChoice(label string, items []string, defaults []bool) ([]bool, error) {
	if len(items) != len(defaults) {
		return nil, fmt.Errorf("items and defaults must have the same length")
	}

	results := make([]bool, len(items))
	copy(results, defaults)

	for i, item := range items {
		confirmed, err := ConfirmAction(fmt.Sprintf("%s - %s", label, item))
		if err != nil {
			return nil, err
		}
		results[i] = confirmed
	}

	return results, nil
}

// HandleResourceSelection handles the common pattern of getting a resource name from args or interactive selection
// If args provided, validates the first arg is not empty and returns it
// If no args, uses SelectFromList to let user choose from available items
func HandleResourceSelection(args []string, items []string, prompt string) (string, error) {
	// If resource name provided as argument, use it directly
	if len(args) > 0 {
		resourceName := strings.TrimSpace(args[0])
		if resourceName == "" {
			return "", fmt.Errorf("resource name cannot be empty")
		}
		return resourceName, nil
	}

	// Check if items are available
	if len(items) == 0 {
		return "", fmt.Errorf("no items available for selection")
	}

	// Use interactive selection
	_, selected, err := SelectFromList(prompt, items)
	if err != nil {
		return "", fmt.Errorf("selection failed: %w", err)
	}

	return selected, nil
}

// ValidateNonEmpty validates that input is not empty after trimming
func ValidateNonEmpty(fieldName string) func(string) error {
	return func(input string) error {
		if strings.TrimSpace(input) == "" {
			return fmt.Errorf("%s cannot be empty", fieldName)
		}
		return nil
	}
}

// ValidateIntRange validates that input is an integer within specified range
func ValidateIntRange(min, max int, fieldName string) func(string) error {
	return func(input string) error {
		val, err := strconv.Atoi(input)
		if err != nil {
			return fmt.Errorf("please enter a valid number for %s", fieldName)
		}
		if val < min || val > max {
			return fmt.Errorf("%s must be between %d and %d", fieldName, min, max)
		}
		return nil
	}
}

// boolToString converts boolean to y/N format (helper function)
func boolToString(b bool) string {
	if b {
		return "y"
	}
	return "N"
}