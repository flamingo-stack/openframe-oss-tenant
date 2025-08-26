package bootstrap

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/flamingo/openframe/internal/bootstrap"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Helper provides bootstrap operations with modified Helm values for development
type Helper struct {
	executor executor.CommandExecutor
	verbose  bool
}

// NewHelper creates a new bootstrap helper
func NewHelper(exec executor.CommandExecutor, verbose bool) *Helper {
	return &Helper{
		executor: exec,
		verbose:  verbose,
	}
}

// BootstrapWithModifiedValues bootstraps a cluster with custom Helm values for development
func (h *Helper) BootstrapWithModifiedValues(clusterName, helmValuesFile string) error {
	if h.verbose {
		pterm.Info.Printf("Bootstrapping cluster '%s' with custom values: %s\n", clusterName, helmValuesFile)
	}

	// If custom helm values file is provided, we need to modify the bootstrap process
	if helmValuesFile != "" {
		if err := h.validateHelmValuesFile(helmValuesFile); err != nil {
			return err
		}

		// TODO: This is where we'd integrate with bootstrap service to use custom values
		// For now, we'll show what would happen
		if h.verbose {
			pterm.Info.Printf("Would bootstrap with custom Helm values from: %s\n", helmValuesFile)
		}
	}

	// Use the existing bootstrap service
	bootstrapService := bootstrap.NewService()
	args := []string{}
	if clusterName != "" {
		args = append(args, clusterName)
	}

	return bootstrapService.Execute(nil, args)
}

// PrepareDevHelmValues creates a development-specific Helm values file
func (h *Helper) PrepareDevHelmValues(baseValuesFile string) (string, error) {
	if baseValuesFile == "" {
		// Return path to default values
		return "helm-values.yaml", nil
	}

	// Validate the base file exists
	if err := h.validateHelmValuesFile(baseValuesFile); err != nil {
		return "", err
	}

	// For now, just return the base file
	// TODO: In the future, we could merge base values with dev-specific overrides
	return baseValuesFile, nil
}

// validateHelmValuesFile checks if the Helm values file exists
func (h *Helper) validateHelmValuesFile(filename string) error {
	if filename == "" {
		return fmt.Errorf("helm values file path cannot be empty")
	}

	// Convert to absolute path
	absPath, err := filepath.Abs(filename)
	if err != nil {
		return fmt.Errorf("failed to resolve absolute path for %s: %w", filename, err)
	}

	// Check if file exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		return fmt.Errorf("helm values file not found: %s", absPath)
	}

	if h.verbose {
		pterm.Success.Printf("Helm values file found: %s\n", absPath)
	}

	return nil
}

// GetDefaultDevValues returns the path to default development Helm values
func (h *Helper) GetDefaultDevValues() string {
	// Check if development-specific values exist
	devValues := "helm-values-dev.yaml"
	if _, err := os.Stat(devValues); err == nil {
		return devValues
	}

	// Fall back to default values
	return "helm-values.yaml"
}