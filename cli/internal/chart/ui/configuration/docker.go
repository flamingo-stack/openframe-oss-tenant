package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/ui/templates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// DockerConfigurator handles Docker registry configuration
type DockerConfigurator struct {
	modifier *templates.HelmValuesModifier
}

// NewDockerConfigurator creates a new Docker configurator
func NewDockerConfigurator(modifier *templates.HelmValuesModifier) *DockerConfigurator {
	return &DockerConfigurator{
		modifier: modifier,
	}
}

// Configure asks user about Docker registry configuration
func (d *DockerConfigurator) Configure(config *types.ChartConfiguration) error {
	// Get current Docker settings from existing values
	currentDocker := d.modifier.GetCurrentDockerSettings(config.ExistingValues)

	pterm.Info.Printf("Docker Registry Configuration (current: %s)", currentDocker.Username)

	options := []string{
		"No Docker credentials",
		"Input custom Docker credentials",
	}

	_, choice, err := sharedUI.SelectFromList("Docker credentials", options)
	if err != nil {
		return fmt.Errorf("docker choice failed: %w", err)
	}

	if strings.Contains(choice, "custom") {
		dockerConfig, err := d.promptForDockerSettings(currentDocker)
		if err != nil {
			return err
		}

		// Only set if values actually changed
		if dockerConfig.Username != currentDocker.Username ||
			dockerConfig.Password != currentDocker.Password ||
			dockerConfig.Email != currentDocker.Email {
			config.DockerRegistry = dockerConfig
			config.ModifiedSections = append(config.ModifiedSections, "docker")
		}
	}

	return nil
}

// promptForDockerSettings prompts user for Docker registry settings
func (d *DockerConfigurator) promptForDockerSettings(current *types.DockerRegistryConfig) (*types.DockerRegistryConfig, error) {
	username, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(current.Username).
		WithMultiLine(false).
		Show("Docker Registry Username")
	if err != nil {
		return nil, fmt.Errorf("docker username input failed: %w", err)
	}

	password, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(current.Password).
		WithMask("*").
		WithMultiLine(false).
		Show("Docker Registry Password/Token")
	if err != nil {
		return nil, fmt.Errorf("docker password input failed: %w", err)
	}

	email, err := pterm.DefaultInteractiveTextInput.
		WithDefaultValue(current.Email).
		WithMultiLine(false).
		Show("Docker Registry Email")
	if err != nil {
		return nil, fmt.Errorf("docker email input failed: %w", err)
	}

	return &types.DockerRegistryConfig{
		Username: strings.TrimSpace(username),
		Password: strings.TrimSpace(password),
		Email:    strings.TrimSpace(email),
	}, nil
}
