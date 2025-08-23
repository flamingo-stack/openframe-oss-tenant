package argocd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Manager handles ArgoCD-specific operations
type Manager struct {
	executor executor.CommandExecutor
}

// NewManager creates a new ArgoCD manager
func NewManager(exec executor.CommandExecutor) *Manager {
	return &Manager{
		executor: exec,
	}
}

// WaitForApplications waits for all ArgoCD applications to be Healthy and Synced
func (m *Manager) WaitForApplications(ctx context.Context, config config.ChartInstallConfig) error {
	// Wait for bootstrap only - no message unless verbose
	if config.Verbose {
		pterm.Info.Println("⏳ Waiting 30 seconds for ArgoCD apps to bootstrap...")
	}
	time.Sleep(30 * time.Second)

	// Details only shown in verbose mode or if there are issues
	if config.Verbose {
		pterm.Info.Println("   This can take up to 1 hour for complex applications")
	}

	spinner, _ := pterm.DefaultSpinner.Start("Checking ArgoCD application status...")

	printed := make(map[string]bool) // Track which apps we've already printed as ready
	
	// Set timeout for the entire operation (1 hour)
	startTime := time.Now()
	timeout := 60 * time.Minute

	for {
		// Check if we've exceeded the timeout
		if time.Since(startTime) > timeout {
			spinner.Fail(fmt.Sprintf("Timeout waiting for ArgoCD applications after %v", timeout))
			return fmt.Errorf("timeout waiting for ArgoCD applications after %v", timeout)
		}
		// Get all applications and their status
		result, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io", "-o", "json")
		if err != nil {
			spinner.Fail("Failed to get ArgoCD applications")
			return fmt.Errorf("failed to get ArgoCD applications: %w", err)
		}

		// Parse the JSON response to extract applications
		apps, err := m.parseApplications(ctx, result.Stdout, config.Verbose)
		if err != nil {
			// Don't fail immediately on parsing errors, just retry silently
			// Applications may still be initializing and jq parsing can fail
			spinner.UpdateText("Waiting for applications to initialize...")
			// Only show warning in verbose mode
			if config.Verbose {
				pterm.Warning.Printf("Application parsing issue (retrying): %v\n", err)
			}
			time.Sleep(10 * time.Second)
			continue
		}

		totalApps := len(apps)
		var allHealthyAndSynced bool
		
		// Update spinner with current status
		if totalApps == 0 {
			spinner.UpdateText("Waiting for ArgoCD applications to appear...")
			allHealthyAndSynced = false
		} else {
			readyCount := 0
			for _, app := range apps {
				if app.Health == "Healthy" && app.Sync == "Synced" {
					readyCount++
					if !printed[app.Name] {
						printed[app.Name] = true
						pterm.Success.Printf("✅ %s is Healthy and Synced\n", app.Name)
					}
				} else {
					// Show status of apps that aren't ready yet (but don't spam)
					statusKey := app.Name + "_status"
					if !printed[statusKey] {
						pterm.Info.Printf("⏳ %s: Health=%s, Sync=%s\n", app.Name, app.Health, app.Sync)
						printed[statusKey] = true
					}
				}
			}
			
				// Update spinner with progress and elapsed time
			elapsed := time.Since(startTime).Round(time.Second)
			spinner.UpdateText(fmt.Sprintf("ArgoCD applications ready: %d/%d (elapsed: %v)", readyCount, totalApps, elapsed))

			// Check if all apps are ready
			allHealthyAndSynced = readyCount == totalApps
		}

		if allHealthyAndSynced && totalApps > 0 {
			spinner.Success("All ArgoCD apps are Healthy and Synced")
			break
		}

		// Wait 5 seconds before checking again
		time.Sleep(5 * time.Second)
	}

	return nil
}

// Application represents an ArgoCD application status
type Application struct {
	Name   string
	Health string
	Sync   string
}

// parseApplications parses the kubectl JSON output to extract application status
func (m *Manager) parseApplications(ctx context.Context, jsonOutput string, verbose bool) ([]Application, error) {
	// Execute jq command with robust null and error handling
	jqCommand := `echo '%s' | jq -r '.items[]? | select(.metadata?.name?) | [.metadata.name, (.status?.health?.status // "Unknown"), (.status?.sync?.status // "Unknown")] | @tsv' 2>/dev/null || true`
	result, err := m.executor.Execute(ctx, "sh", "-c", fmt.Sprintf(jqCommand, jsonOutput))

	if err != nil {
		// If jq fails completely, try a simpler approach or return empty list
		if verbose {
			pterm.Warning.Printf("jq parsing failed: %v\n", err)
		}
		// Return empty apps list instead of failing - applications may still be initializing
		return []Application{}, nil
	}

	apps := make([]Application, 0)
	lines := strings.Split(strings.TrimSpace(result.Stdout), "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		parts := strings.Split(line, "\t")
		if len(parts) >= 3 {
			app := Application{
				Name:   parts[0],
				Health: parts[1],
				Sync:   parts[2],
			}
			
			// Skip applications with "Unknown" status as they're still initializing
			if app.Health != "Unknown" && app.Sync != "Unknown" {
				apps = append(apps, app)
			}
		}
	}

	return apps, nil
}
