package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// configureGHCRCredentials configures GHCR credentials with selection UI
func (w *ConfigurationWizard) configureGHCRCredentials(config *types.ChartConfiguration) (string, string, string, error) {
	// Get current GHCR credentials from existing values if available
	currentUsername := "default"
	currentEmail := "default@example.com"
	hasExistingCredentials := false

	if config.ExistingValues != nil {
		if registry, ok := config.ExistingValues["registry"].(map[string]interface{}); ok {
			if ghcr, ok := registry["ghcr"].(map[string]interface{}); ok {
				if username, ok := ghcr["username"].(string); ok && username != "" && username != "default" {
					currentUsername = username
					hasExistingCredentials = true
				}
				if email, ok := ghcr["email"].(string); ok && email != "" && email != "default@example.com" {
					currentEmail = email
				}
			}
		}
	}

	pterm.Info.Printf("GHCR Registry Credentials Configuration")

	options := []string{
		"Configure GHCR credentials",
	}

	if hasExistingCredentials {
		options = []string{
			fmt.Sprintf("Keep existing GHCR credentials (%s)", currentUsername),
			"Update GHCR credentials",
		}
	}

	_, choice, err := sharedUI.SelectFromList("GHCR credentials", options)
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR credentials choice failed: %w", err)
	}

	// If user chooses to keep existing credentials and they exist
	if hasExistingCredentials && strings.Contains(choice, "Keep existing") {
		// Still need to collect password as it's not stored in plain text
		password, err := pterm.DefaultInteractiveTextInput.
			WithMask("*").
			WithMultiLine(false).
			Show("GHCR Registry Password/Token (required)")
		if err != nil {
			return "", "", "", fmt.Errorf("GHCR password input failed: %w", err)
		}
		return currentUsername, strings.TrimSpace(password), currentEmail, nil
	}

	// Collect GHCR credentials
	username, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(currentUsername).
		WithMultiLine(false).
		Show("GHCR Registry Username")
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR username input failed: %w", err)
	}

	password, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("GHCR Registry Password/Token")
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR password input failed: %w", err)
	}

	email, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(currentEmail).
		WithMultiLine(false).
		Show("GHCR Registry Email")
	if err != nil {
		return "", "", "", fmt.Errorf("GHCR email input failed: %w", err)
	}

	return strings.TrimSpace(username), strings.TrimSpace(password), strings.TrimSpace(email), nil
}
