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
	
	// Set timeout for the entire operation (1 hour)
	startTime := time.Now()
	timeout := 60 * time.Minute

	// Get initial count of all applications once
	var totalAppsExpected int
	allAppsDiscovered := false
	
	for {
		// Check for context cancellation (CTRL-C)
		select {
		case <-ctx.Done():
			spinner.Stop()
			return ctx.Err()
		default:
		}
		
		// Check if we've exceeded the timeout
		if time.Since(startTime) > timeout {
			spinner.Fail(fmt.Sprintf("Timeout waiting for ArgoCD applications after %v", timeout))
			return fmt.Errorf("timeout waiting for ArgoCD applications after %v", timeout)
		}
		
		// Parse ArgoCD applications directly
		apps, err := m.parseApplications(ctx, config.Verbose)
		
		// Check for context cancellation after parsing
		select {
		case <-ctx.Done():
			spinner.Stop()
			return ctx.Err()
		default:
		}
		
		if err != nil {
			// Don't fail immediately on parsing errors, just retry silently
			// Applications may still be initializing and jq parsing can fail
			spinner.UpdateText("Waiting for applications to initialize...")
			// Only show warning in verbose mode
			if config.Verbose {
				pterm.Warning.Printf("Application parsing issue (retrying): %v\n", err)
			}
			
			// Check for context cancellation during sleep
			select {
			case <-ctx.Done():
				spinner.Stop()
				return ctx.Err()
			case <-time.After(2 * time.Second):
				continue
			}
		}

		totalApps := len(apps)
		
		// Set expected count once we discover all applications
		if totalApps > totalAppsExpected && !allAppsDiscovered {
			totalAppsExpected = totalApps
			// Only mark as discovered if we have a reasonable number
			if totalApps >= 5 {
				allAppsDiscovered = true
			}
		}
		
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
				}
			}
			
			// Show expected count if we know it, otherwise current count
			displayTotal := totalAppsExpected
			if displayTotal == 0 {
				displayTotal = totalApps
			}
			
			// Update spinner with progress and elapsed time
			elapsed := time.Since(startTime).Round(time.Second)
			spinner.UpdateText(fmt.Sprintf("ArgoCD applications ready: %d/%d (elapsed: %v)", readyCount, displayTotal, elapsed))
			
			// Check for context cancellation after spinner update
			select {
			case <-ctx.Done():
				spinner.Stop()
				return ctx.Err()
			default:
			}

			// Check if all apps are ready
			allHealthyAndSynced = readyCount == totalApps && totalApps > 0
		}

		if allHealthyAndSynced {
			spinner.Success("All ArgoCD applications are ready")
			break
		}

		// Check for context cancellation before sleep - use shorter interval for better responsiveness
		select {
		case <-ctx.Done():
			spinner.Stop()
			return ctx.Err()
		case <-time.After(1 * time.Second):
			continue
		}
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
