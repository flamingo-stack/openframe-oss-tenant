package ui

import (
	"fmt"
	"strings"

	"github.com/manifoldco/promptui"
)

// ConfirmAction prompts the user to confirm an action
func ConfirmAction(message string) (bool, error) {
	prompt := promptui.Prompt{
		Label:     message + " (Y/n)",
		IsConfirm: false,
		Default:   "Y",
		Validate: func(input string) error {
			input = strings.ToLower(strings.TrimSpace(input))
			if input == "" || input == "y" || input == "yes" || input == "n" || input == "no" {
				return nil
			}
			return fmt.Errorf("please enter Y/y/yes or N/n/no")
		},
	}

	result, err := prompt.Run()
	if err != nil {
		if err == promptui.ErrAbort {
			return false, nil
		}
		return false, err
	}

	result = strings.ToLower(strings.TrimSpace(result))
	return result == "" || result == "y" || result == "yes", nil
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

// boolToString converts boolean to y/N format (helper function)
func boolToString(b bool) string {
	if b {
		return "y"
	}
	return "N"
}