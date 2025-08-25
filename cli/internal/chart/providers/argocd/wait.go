package argocd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/flamingo/openframe/internal/chart/utils/config"
	"github.com/pterm/pterm"
)

// WaitForApplications waits for all ArgoCD applications to be Healthy and Synced
func (m *Manager) WaitForApplications(ctx context.Context, config config.ChartInstallConfig) error {
	// Skip waiting in dry-run mode for testing
	if config.DryRun {
		return nil
	}
	
	// Check if already cancelled before starting
	if ctx.Err() != nil {
		return fmt.Errorf("operation already cancelled: %w", ctx.Err())
	}
	
	// Create a derived context that responds to both parent cancellation AND direct signals
	// This ensures immediate response to Ctrl+C even if parent context isn't propagating fast enough
	localCtx, localCancel := context.WithCancel(ctx)
	defer localCancel()
	
	// Handle direct interrupt signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigChan)
	
	go func() {
		<-sigChan
		localCancel() // Cancel our local context immediately
	}()
	
	// Start pterm spinner
	spinner, _ := pterm.DefaultSpinner.
		WithRemoveWhenDone(false).
		WithShowTimer(true).
		Start("Installing ArgoCD applications...")
	
	var spinnerMutex sync.Mutex
	spinnerStopped := false
	
	// Function to stop spinner safely
	stopSpinner := func() {
		spinnerMutex.Lock()
		defer spinnerMutex.Unlock()
		if !spinnerStopped && spinner != nil && spinner.IsActive {
			spinner.Stop()
			spinnerStopped = true
		}
	}
	
	// Monitor for context cancellation (includes interrupt signals from parent or direct signals)
	go func() {
		<-localCtx.Done()
		stopSpinner()
	}()
	
	// Ensure spinner is stopped when function exits
	defer stopSpinner()
	
	// Bootstrap wait (30 seconds)
	bootstrapEnd := time.Now().Add(30 * time.Second)
	
	// Check every 10ms for immediate response
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	
	// Bootstrap phase
	for time.Now().Before(bootstrapEnd) {
		select {
		case <-localCtx.Done():
			return fmt.Errorf("operation cancelled: %w", localCtx.Err())
		case <-ticker.C:
			// Continue waiting
		}
	}
	
	// Main monitoring phase
	startTime := time.Now()
	timeout := 60 * time.Minute
	checkInterval := 2 * time.Second
	lastCheck := time.Now()
	
	// Get expected applications count
	totalAppsExpected := m.getTotalExpectedApplications(localCtx, config)
	if totalAppsExpected == 0 {
		totalAppsExpected = -1
	}
	
	maxAppsSeenTotal := 0
	maxAppsSeenReady := 0
	
	// Track applications that have ever been ready (healthy + synced) during this session
	// Once an app is ready, it stays counted even if it temporarily goes out of sync
	everReadyApps := make(map[string]bool)
	
	// Main loop
	for {
		select {
		case <-localCtx.Done():
			return fmt.Errorf("operation cancelled: %w", localCtx.Err())
		case <-ticker.C:
			// Check timeout
			if time.Since(startTime) > timeout {
				spinnerMutex.Lock()
				if !spinnerStopped && spinner != nil && spinner.IsActive {
					spinner.Fail(fmt.Sprintf("Timeout after %v", timeout))
					spinnerStopped = true
				}
				spinnerMutex.Unlock()
				return fmt.Errorf("timeout waiting for ArgoCD applications after %v", timeout)
			}
			
			// Check applications every 2 seconds
			if time.Since(lastCheck) < checkInterval {
				continue
			}
			lastCheck = time.Now()
			
			// Parse applications
			apps, err := m.parseApplications(localCtx, config.Verbose)
			if err != nil {
				if localCtx.Err() != nil {
					return fmt.Errorf("operation cancelled: %w", localCtx.Err())
				}
				// Ignore parse errors and retry
				continue
			}
			
			totalApps := len(apps)
			if totalApps > maxAppsSeenTotal {
				maxAppsSeenTotal = totalApps
			}
			
			if totalAppsExpected == -1 || maxAppsSeenTotal > totalAppsExpected {
				totalAppsExpected = maxAppsSeenTotal
			}
			
			// Track applications that have ever been ready during this session
			currentHealthyCount := 0
			for _, app := range apps {
				// Count currently healthy apps for monitoring
				if app.Health == "Healthy" {
					currentHealthyCount++
				}
				
				// Mark apps as "ever ready" if they are currently healthy and synced
				// Once marked, they stay counted even if they go out of sync later
				if app.Health == "Healthy" && app.Sync == "Synced" {
					everReadyApps[app.Name] = true
				}
			}
			
			// Use the high water mark of applications that have ever been ready
			readyCount := len(everReadyApps)
			
			if readyCount > maxAppsSeenReady {
				maxAppsSeenReady = readyCount
			}
			
			// Check if deployment is complete using high water mark approach
			allReady := false
			if totalAppsExpected > 0 && readyCount >= totalAppsExpected {
				// We know the expected count and have seen enough apps become ready
				allReady = true
			} else if totalApps > 0 && totalApps >= 5 {
				// For larger deployments, consider ready when we've seen most apps become ready
				// Use 95% threshold since some apps might temporarily be out of sync
				readyRatio := float64(readyCount) / float64(totalApps)
				if readyRatio >= 0.95 {
					allReady = true
				}
			} else if totalApps > 0 && readyCount == totalApps {
				// For smaller deployments, wait for all apps to have been ready at least once
				allReady = true
			}
			
			if allReady {
				spinnerMutex.Lock()
				if !spinnerStopped && spinner != nil && spinner.IsActive {
					spinner.Stop()
					spinnerStopped = true
				}
				spinnerMutex.Unlock()
				pterm.Success.Println("All ArgoCD applications installed")
				return nil
			}
		}
	}
}