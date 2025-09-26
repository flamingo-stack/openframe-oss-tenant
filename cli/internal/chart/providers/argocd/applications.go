package argocd

import (
	"context"
	"strings"

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

// Application represents an ArgoCD application status
type Application struct {
	Name   string
	Health string
	Sync   string
}

// getTotalExpectedApplications tries to determine the total number of applications that will be created
func (m *Manager) getTotalExpectedApplications(ctx context.Context, config config.ChartInstallConfig) int {
	// Method 1: Get all resources that app-of-apps will create from its status
	// This shows ALL planned applications across all sync waves
	manifestResult, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io", "app-of-apps",
		"-o", "jsonpath={.status.resources[?(@.kind=='Application')].name}")
	
	if err == nil && manifestResult.Stdout != "" {
		resources := strings.Fields(manifestResult.Stdout)
		if len(resources) > 0 {
			if config.Verbose {
				pterm.Debug.Printf("Detected %d applications planned by app-of-apps\n", len(resources))
			}
			return len(resources)
		}
	}
	
	// Method 2: Get the source manifest from app-of-apps and count applications
	// This gives us the definitive count from the source repository
	sourceResult, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io", "app-of-apps",
		"-o", "jsonpath={.spec.source}")
	
	if err == nil && sourceResult.Stdout != "" && config.Verbose {
		pterm.Debug.Printf("App-of-apps source: %s\n", sourceResult.Stdout)
	}
	
	// Method 3: Try to get the complete resource list from app-of-apps status
	// This includes all resources that will be created, not just current ones
	allResourcesResult, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io", "app-of-apps",
		"-o", "jsonpath={range .status.resources[*]}{.kind}{\":\"}{.name}{\"\\n\"}{end}")
	
	if err == nil && allResourcesResult.Stdout != "" {
		lines := strings.Split(strings.TrimSpace(allResourcesResult.Stdout), "\n")
		appCount := 0
		for _, line := range lines {
			if strings.HasPrefix(line, "Application:") {
				appCount++
			}
		}
		if appCount > 0 {
			if config.Verbose {
				pterm.Debug.Printf("Found %d total Application resources in app-of-apps status\n", appCount)
			}
			return appCount
		}
	}
	
	// Method 4: Check ArgoCD server API for planned applications
	// Query the ArgoCD server pod directly for application information
	serverPod, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "pod",
		"-l", "app.kubernetes.io/name=argocd-server", "-o", "jsonpath={.items[0].metadata.name}")
	
	if err == nil && serverPod.Stdout != "" {
		podName := strings.TrimSpace(serverPod.Stdout)
		// Try to query ArgoCD's internal application list via kubectl exec
		appsResult, _ := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "exec", podName, "--",
			"argocd", "app", "list", "-o", "name")
		if appsResult != nil && appsResult.Stdout != "" {
			apps := strings.Split(strings.TrimSpace(appsResult.Stdout), "\n")
			count := 0
			for _, app := range apps {
				if strings.TrimSpace(app) != "" && app != "app-of-apps" {
					count++
				}
			}
			if count > 0 {
				if config.Verbose {
					pterm.Debug.Printf("Found %d applications via ArgoCD CLI\n", count)
				}
				return count
			}
		}
	}
	
	// Method 4: Try to get all applications including those being created
	// This includes applications in all states (even those not yet synced due to sync waves)
	allAppsResult, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applications.argoproj.io",
		"-o", "jsonpath={range .items[*]}{.metadata.name}{\"\\n\"}{end}")
	
	if err == nil && allAppsResult.Stdout != "" {
		apps := strings.Split(strings.TrimSpace(allAppsResult.Stdout), "\n")
		// Filter out empty lines and count
		count := 0
		for _, app := range apps {
			if strings.TrimSpace(app) != "" {
				count++
			}
		}
		// If we found a reasonable number of apps, use it
		if count > 0 {
			if config.Verbose {
				pterm.Debug.Printf("Found %d total ArgoCD applications\n", count)
			}
			return count
		}
	}
	
	// Method 2: Check helm values to count applications defined
	helmResult, err := m.executor.Execute(ctx, "helm", "get", "values", "app-of-apps", "-n", "argocd")
	if err == nil && helmResult.Stdout != "" {
		// Count application definitions in various formats
		// Look for patterns that indicate application definitions
		appPatterns := []string{
			"repoURL:",           // Each app typically has a repoURL
			"targetRevision:",    // And a targetRevision
			"- name:",           // Applications might be in a list
		}
		
		maxCount := 0
		for _, pattern := range appPatterns {
			count := strings.Count(helmResult.Stdout, pattern)
			if count > maxCount {
				maxCount = count
			}
		}
		
		if maxCount > 0 {
			if config.Verbose {
				pterm.Debug.Printf("Estimated %d applications from helm values\n", maxCount)
			}
			return maxCount
		}
	}
	
	// Method 3: Check ApplicationSets which generate multiple applications
	appSetResult, err := m.executor.Execute(ctx, "kubectl", "-n", "argocd", "get", "applicationsets.argoproj.io",
		"-o", "jsonpath={range .items[*]}{.metadata.name}{\"\\n\"}{end}")
	
	if err == nil && appSetResult.Stdout != "" {
		appSets := strings.Split(strings.TrimSpace(appSetResult.Stdout), "\n")
		count := 0
		for _, appSet := range appSets {
			if strings.TrimSpace(appSet) != "" {
				count++
			}
		}
		// Each ApplicationSet typically generates 5-10 applications
		// Use a conservative estimate
		if count > 0 {
			estimated := count * 7
			if config.Verbose {
				pterm.Debug.Printf("Estimated %d applications from %d ApplicationSets\n", estimated, count)
			}
			return estimated
		}
	}
	
	// Default: return 0 to indicate unknown, will be discovered dynamically
	if config.Verbose {
		pterm.Debug.Println("Could not determine total expected applications upfront, will discover dynamically")
	}
	
	return 0
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
			
			// Include ALL applications, even with Unknown status
			// This ensures we get accurate counts and don't have apps disappearing
			apps = append(apps, app)
		}
	}

	return apps, nil
}