package argocd

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/chart/models"
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
func (m *Manager) WaitForApplications(ctx context.Context, config models.ChartInstallConfig) error {
	pterm.Info.Println("⏳ Waiting 30 seconds for ArgoCD apps to bootstrap...")
	time.Sleep(30 * time.Second)
	
	pterm.Info.Println("⏳ Waiting for ArgoCD apps to be Healthy and Synced...")
	
	spinner, _ := pterm.DefaultSpinner.Start("Checking ArgoCD application status...")
	
	printed := make(map[string]bool) // Track which apps we've already printed as ready
	
	for {
		// Get all applications and their status
		result, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io", "-o", "json")
		if err != nil {
			spinner.Fail("Failed to get ArgoCD applications")
			return fmt.Errorf("failed to get ArgoCD applications: %w", err)
		}
		
		// Parse the JSON response to extract applications
		allHealthyAndSynced := true
		apps, err := m.parseApplications(ctx, result.Stdout)
		if err != nil {
			spinner.Fail("Failed to parse ArgoCD applications")
			return fmt.Errorf("failed to parse ArgoCD applications: %w", err)
		}
		
		totalApps := len(apps)
		if totalApps == 0 {
			// No applications yet, continue waiting
			allHealthyAndSynced = false
		} else {
			for _, app := range apps {
				if !printed[app.Name] {
					if app.Health == "Healthy" && app.Sync == "Synced" {
						spinner.UpdateText(fmt.Sprintf("%s is Healthy and Synced", app.Name))
						printed[app.Name] = true
						pterm.Success.Printf("✅ %s is Healthy and Synced\n", app.Name)
					} else {
						allHealthyAndSynced = false
					}
				}
			}
			
			// Check if all apps are ready
			if len(printed) == totalApps {
				allHealthyAndSynced = true
			} else {
				allHealthyAndSynced = false
			}
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
func (m *Manager) parseApplications(ctx context.Context, jsonOutput string) ([]Application, error) {
	// Execute jq command to parse the JSON like in the shell script
	result, err := m.executor.Execute(ctx, "sh", "-c", 
		fmt.Sprintf(`echo '%s' | jq -r '.items[] | [.metadata.name, .status.health.status, .status.sync.status] | @tsv'`, jsonOutput))
	
	if err != nil {
		return nil, fmt.Errorf("failed to parse JSON with jq: %w", err)
	}
	
	apps := make([]Application, 0)
	lines := strings.Split(strings.TrimSpace(result.Stdout), "\n")
	
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		
		parts := strings.Split(line, "\t")
		if len(parts) >= 3 {
			apps = append(apps, Application{
				Name:   parts[0],
				Health: parts[1],
				Sync:   parts[2],
			})
		}
	}
	
	return apps, nil
}