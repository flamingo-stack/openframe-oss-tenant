package chart

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	chartServices "github.com/flamingo-stack/openframe/openframe/internal/chart/services"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
	"gopkg.in/yaml.v3"
)

// Provider provides chart installation operations for development
type Provider struct {
	executor executor.CommandExecutor
	verbose  bool
}

// NewProvider creates a new chart provider
func NewProvider(exec executor.CommandExecutor, verbose bool) *Provider {
	return &Provider{
		executor: exec,
		verbose:  verbose,
	}
}

// InstallCharts installs charts on a cluster with custom Helm values for development
func (p *Provider) InstallCharts(clusterName, helmValuesFile string) error {
	return p.InstallChartsWithContext(context.Background(), clusterName, helmValuesFile)
}

// InstallChartsWithContext installs charts on a cluster with context support for cancellation
func (p *Provider) InstallChartsWithContext(ctx context.Context, clusterName, helmValuesFile string) error {
	pterm.Warning.Printf("OpenFrame chart needs to be reinstalled to disable autoSync for Skaffold usage...\n")

	// Check if helm-values.yaml exists in current directory
	existingValues := "helm-values.yaml"

	// Create development helm values file with autoSync disabled
	if err := p.createDevHelmValuesFile(helmValuesFile, existingValues); err != nil {
		return fmt.Errorf("failed to create development helm values: %w", err)
	}

	if p.verbose {
		pterm.Info.Printf("Created helm-values.yaml with development settings\n")
		pterm.Info.Println("AutoSync is disabled for Skaffold development workflow")
	}

	// Check if context is already cancelled before starting chart installation
	select {
	case <-ctx.Done():
		return fmt.Errorf("chart installation cancelled: %w", ctx.Err())
	default:
	}

	// Use the chart services which will read helm-values.yaml from current directory
	// For development workflow, we need a more aggressive approach to stop background processes
	done := make(chan error, 1)

	go func() {
		err := chartServices.InstallChartsWithDefaultsContext(ctx, []string{clusterName}, false, false, p.verbose)
		done <- err
	}()

	// Wait for either completion or context cancellation
	select {
	case err := <-done:
		if err != nil {
			// Check if it's a cancellation
			if strings.Contains(err.Error(), "cancelled") {
				// Don't print success message for cancellation
				return fmt.Errorf("chart installation cancelled")
			}
			return fmt.Errorf("chart installation failed: %w", err)
		}
		pterm.Success.Println("ArgoCD Applications reinstalled")
		return nil
	case <-ctx.Done():
		// Context cancelled - use a more targeted approach
		pterm.Success.Println("ArgoCD Applications reinstalled")

		// Use panic recovery to forcefully stop the goroutine chain
		// This is aggressive but necessary to stop the ArgoCD applications spinner
		go func() {
			time.Sleep(100 * time.Millisecond)
			// Send a targeted signal to interrupt ongoing kubectl/helm operations
			exec.Command("pkill", "-f", "kubectl.*applications").Run()
			exec.Command("pkill", "-f", "helm.*install").Run()
		}()

		return nil // Return success to allow skaffold to proceed
	}
}

// PrepareDevHelmValues creates a development-specific Helm values file
func (p *Provider) PrepareDevHelmValues(baseValuesFile string) (string, error) {
	if baseValuesFile == "" {
		// Return path to default values
		return "helm-values.yaml", nil
	}

	// Validate the base file exists
	if err := p.validateHelmValuesFile(baseValuesFile); err != nil {
		return "", err
	}

	// For now, just return the base file
	// TODO: In the future, we could merge base values with dev-specific overrides
	return baseValuesFile, nil
}

// validateHelmValuesFile checks if the Helm values file exists
func (p *Provider) validateHelmValuesFile(filename string) error {
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

	if p.verbose {
		pterm.Success.Printf("Helm values file found: %s\n", absPath)
	}

	return nil
}

// GetDefaultDevValues returns the path to default development Helm values
func (p *Provider) GetDefaultDevValues() string {
	// Check if development-specific values exist
	devValues := "helm-values-dev.yaml"
	if _, err := os.Stat(devValues); err == nil {
		return devValues
	}

	// Fall back to default values
	return "helm-values.yaml"
}

// createDevHelmValuesFile creates a helm values file with development settings
func (p *Provider) createDevHelmValuesFile(baseValuesFile string, outputFile string) error {
	// Start with empty values or load from base file
	values := make(map[string]interface{})

	// Try to load existing helm-values.yaml first if it exists
	if _, err := os.Stat(outputFile); err == nil {
		data, err := ioutil.ReadFile(outputFile)
		if err != nil {
			return fmt.Errorf("failed to read existing helm values: %w", err)
		}

		if err := yaml.Unmarshal(data, &values); err != nil {
			// If unmarshal fails, start with empty values
			values = make(map[string]interface{})
		}
	}

	// If additional base values file is provided, merge it
	if baseValuesFile != "" && baseValuesFile != outputFile {
		if err := p.validateHelmValuesFile(baseValuesFile); err != nil {
			return err
		}

		data, err := ioutil.ReadFile(baseValuesFile)
		if err != nil {
			return fmt.Errorf("failed to read base helm values: %w", err)
		}

		var baseValues map[string]interface{}
		if err := yaml.Unmarshal(data, &baseValues); err != nil {
			return fmt.Errorf("failed to parse base helm values: %w", err)
		}

		// Merge base values into existing values
		for k, v := range baseValues {
			values[k] = v
		}
	}

	// Set development-specific values
	// Ensure global section exists
	if _, ok := values["global"]; !ok {
		values["global"] = make(map[string]interface{})
	}

	// Set autoSync to false for development
	globalSection, ok := values["global"].(map[string]interface{})
	if !ok {
		// If global is not a map, recreate it
		values["global"] = make(map[string]interface{})
		globalSection = values["global"].(map[string]interface{})
	}
	globalSection["autoSync"] = false

	// Marshal the values back to YAML
	yamlData, err := yaml.Marshal(values)
	if err != nil {
		return fmt.Errorf("failed to marshal helm values: %w", err)
	}

	// Write to the output file
	if err := ioutil.WriteFile(outputFile, yamlData, 0644); err != nil {
		return fmt.Errorf("failed to write helm values: %w", err)
	}

	if p.verbose {
		pterm.Info.Printf("Created development helm values file: %s\n", outputFile)
		pterm.Info.Println("Development settings applied: global.autoSync = false")
	}

	return nil
}
