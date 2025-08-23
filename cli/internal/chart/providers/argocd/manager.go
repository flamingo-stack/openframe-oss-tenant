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
	// Skip waiting in dry-run mode for testing
	if config.DryRun {
		return nil
	}
	
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
		// Parse ArgoCD applications directly
		apps, err := m.parseApplications(ctx, config.Verbose)
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
			spinner.UpdateText("Installing ArgoCD applications...")
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

// parseApplications gets ArgoCD applications and their status directly via kubectl
func (m *Manager) parseApplications(ctx context.Context, verbose bool) ([]Application, error) {
	// Use direct kubectl command instead of parsing JSON string to avoid control character issues
	// Use conditional jsonpath to handle missing status fields
	result, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io", 
		"-o", "jsonpath={range .items[*]}{.metadata.name}{\"\\t\"}{.status.health.status}{\"\\t\"}{.status.sync.status}{\"\\n\"}{end}")

	if err != nil {
		// If kubectl fails, try fallback approach
		if verbose {
			pterm.Warning.Printf("kubectl jsonpath failed: %v\n", err)
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
			health := strings.TrimSpace(parts[1])
			sync := strings.TrimSpace(parts[2])
			
			// Default empty values to "Unknown"
			if health == "" {
				health = "Unknown"
			}
			if sync == "" {
				sync = "Unknown"
			}
			
			app := Application{
				Name:   strings.TrimSpace(parts[0]),
				Health: health,
				Sync:   sync,
			}
			
			// Skip applications with "Unknown" status as they're still initializing
			if app.Health != "Unknown" && app.Sync != "Unknown" {
				apps = append(apps, app)
			}
		}
	}

	return apps, nil
}
