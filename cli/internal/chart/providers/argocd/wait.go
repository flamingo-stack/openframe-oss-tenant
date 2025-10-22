package argocd

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
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

	// Early exit if context has a short deadline (indicates timeout scenario)
	if deadline, ok := ctx.Deadline(); ok {
		if time.Until(deadline) < 5*time.Second {
			// Context will expire soon - skip ArgoCD applications wait
			return nil
		}
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

	// Check if we should start the spinner (skip if context is cancelled or expiring soon)
	shouldSkipSpinner := false

	// Check if context is cancelled
	if localCtx.Err() != nil {
		shouldSkipSpinner = true
	}

	// Check if original context is cancelled
	if ctx.Err() != nil {
		shouldSkipSpinner = true
	}

	// Check if context deadline is very close (less than 10 seconds)
	if deadline, ok := ctx.Deadline(); ok {
		timeLeft := time.Until(deadline)
		if timeLeft < 10*time.Second {
			shouldSkipSpinner = true
		}
	}

	if shouldSkipSpinner {
		// Context is cancelled or expiring soon - skip ArgoCD applications wait entirely
		return nil
	}

	// Show initial verbose info if enabled
	if config.Verbose {
		pterm.Info.Println("Starting ArgoCD application synchronization...")
		pterm.Debug.Println("  - Waiting for applications to be created by app-of-apps")
		pterm.Debug.Println("  - Each application must reach Healthy + Synced status")
		pterm.Debug.Println("  - Progress updates every 10 seconds in verbose mode")
	}

	// Start pterm spinner only if not in silent/non-interactive mode
	var spinner *pterm.SpinnerPrinter
	if !config.Silent {
		spinner, _ = pterm.DefaultSpinner.
			WithRemoveWhenDone(false).
			WithShowTimer(true).
			Start("Installing ArgoCD applications...")
	} else {
		// In non-interactive mode, just show a simple info message
		pterm.Info.Println("Installing ArgoCD applications...")
	}

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
				// Show initial application count when first detected (verbose mode)
				if config.Verbose && totalApps > 0 {
					pterm.Info.Printf("Detected %d ArgoCD applications to synchronize\n", totalApps)
				}
			}

			if totalAppsExpected == -1 || maxAppsSeenTotal > totalAppsExpected {
				totalAppsExpected = maxAppsSeenTotal
			}

			// Track applications that have ever been ready during this session
			currentHealthyCount := 0
			currentlyReady := 0
			healthyApps := make([]string, 0)
			syncedApps := make([]string, 0)
			notReadyApps := make([]string, 0)

			for _, app := range apps {
				// Count currently healthy apps for monitoring
				if app.Health == "Healthy" {
					currentHealthyCount++
					healthyApps = append(healthyApps, app.Name)
				}

				if app.Sync == "Synced" {
					syncedApps = append(syncedApps, app.Name)
				}

				// Count currently ready apps (both healthy and synced)
				if app.Health == "Healthy" && app.Sync == "Synced" {
					currentlyReady++
					// Mark apps as "ever ready" if they are currently healthy and synced
					// Once marked, they stay counted even if they go out of sync later
					everReadyApps[app.Name] = true
				} else {
					// Track apps that are not yet ready with more detailed status
					if app.Health != "Healthy" || app.Sync != "Synced" {
						// Show the most important status issue
						var status string
						if app.Health != "Healthy" && app.Sync != "Synced" {
							status = fmt.Sprintf("%s/%s", app.Health, app.Sync)
						} else if app.Health != "Healthy" {
							status = fmt.Sprintf("Health: %s", app.Health)
						} else {
							status = fmt.Sprintf("Sync: %s", app.Sync)
						}
						notReadyApps = append(notReadyApps, fmt.Sprintf("%s (%s)", app.Name, status))
					}
				}
			}

			// Show verbose logging if enabled
			if config.Verbose && totalApps > 0 {
				elapsed := time.Since(startTime)

				// Update spinner message with current status
				spinnerMutex.Lock()
				if !spinnerStopped && spinner != nil && spinner.IsActive {
					progress := ""
					if totalApps > 0 {
						progressPercent := float64(currentlyReady) / float64(totalApps) * 100
						progress = fmt.Sprintf(" (%.0f%%)", progressPercent)
					}
					spinner.UpdateText(fmt.Sprintf("Installing ArgoCD applications... %d/%d ready%s [%s]",
						currentlyReady, totalApps, progress, elapsed.Round(time.Second)))
				}
				spinnerMutex.Unlock()

				// Only show detailed status every 10 seconds to avoid spam
				if int(elapsed.Seconds())%10 == 0 {
					pterm.Info.Printf("ArgoCD Sync Progress: %d/%d applications ready (%s elapsed)\n",
						currentlyReady, totalApps, elapsed.Round(time.Second))

					// Always show pending applications when there are any
					if len(notReadyApps) > 0 {
						if len(notReadyApps) <= 8 {
							pterm.Info.Printf("  Still waiting for: %v\n", notReadyApps)
						} else {
							pterm.Info.Printf("  Still waiting for %d applications (showing first 5): %v...\n",
								len(notReadyApps), notReadyApps[:5])
						}

						// DEBUG: Show pod details for stuck applications after 7 min, every 5 minutes
						if elapsed > 7*time.Minute && int(elapsed.Seconds())%300 == 0 {
							stuckApps := []Application{}
							for _, app := range apps {
								if app.Health != "Healthy" && app.Health != "Missing" {
									stuckApps = append(stuckApps, app)
								}
							}

							if len(stuckApps) > 0 {
								pterm.Info.Printf("\n=== DEBUG: Found %d stuck application(s) ===\n", len(stuckApps))

								for _, app := range stuckApps {
									pterm.Info.Printf("\n--- %s (Health: %s, Sync: %s) ---\n", app.Name, app.Health, app.Sync)

									// Get namespace
									nsResult, err := m.executor.Execute(localCtx, "kubectl", "-n", "argocd", "get", "app", app.Name, "-o", "jsonpath={.spec.destination.namespace}")
									if err != nil || nsResult == nil || nsResult.Stdout == "" {
										pterm.Warning.Printf("Could not get namespace for %s\n", app.Name)
										continue
									}
									ns := strings.TrimSpace(nsResult.Stdout)

									// Get pods with issues: not Running or with restarts
									podQuery := "jsonpath={range .items[?(@.status.phase!=\"Running\")]}{.metadata.name}{\"\\t\"}{.status.phase}{\"\\t\"}{.status.containerStatuses[0].restartCount}{\"\\n\"}{end}"
									problemPodsResult, _ := m.executor.Execute(localCtx, "kubectl", "-n", ns, "get", "pods", "-o", podQuery)

									// Also get pods with restarts but Running
									restartPodsQuery := "jsonpath={range .items[?(@.status.phase==\"Running\")]}{.metadata.name}{\"\\t\"}{.status.containerStatuses[0].restartCount}{\"\\n\"}{end}"
									restartPodsResult, _ := m.executor.Execute(localCtx, "kubectl", "-n", ns, "get", "pods", "-o", restartPodsQuery)

									problemPods := make(map[string]bool)

									// Parse non-running pods
									if problemPodsResult != nil && problemPodsResult.Stdout != "" {
										for _, line := range strings.Split(strings.TrimSpace(problemPodsResult.Stdout), "\n") {
											if line != "" {
												podName := strings.Split(line, "\t")[0]
												problemPods[podName] = true
											}
										}
									}

									// Parse pods with restarts
									if restartPodsResult != nil && restartPodsResult.Stdout != "" {
										for _, line := range strings.Split(strings.TrimSpace(restartPodsResult.Stdout), "\n") {
											if line == "" {
												continue
											}
											parts := strings.Split(line, "\t")
											if len(parts) >= 2 && parts[1] != "0" && parts[1] != "" {
												problemPods[parts[0]] = true
											}
										}
									}

									if len(problemPods) == 0 {
										pterm.Info.Println("  No problematic pods found (may be an ArgoCD sync issue)")
										continue
									}

									pterm.Info.Printf("  Found %d pod(s) with issues\n", len(problemPods))

									for podName := range problemPods {
										pterm.Info.Printf("\n  Pod: %s\n", podName)

										// Get pod status summary
										statusResult, _ := m.executor.Execute(localCtx, "kubectl", "-n", ns, "get", "pod", podName, "-o", "jsonpath={.status.phase}{'/'}{.status.containerStatuses[*].state}")
										if statusResult != nil && statusResult.Stdout != "" {
											pterm.Info.Printf("  Status: %s\n", statusResult.Stdout)
										}

										// Get recent events for this pod
										eventsResult, _ := m.executor.Execute(localCtx, "kubectl", "-n", ns, "get", "events", "--field-selector", "involvedObject.name="+podName, "--sort-by=.lastTimestamp", "-o", "custom-columns=TIME:.lastTimestamp,REASON:.reason,MESSAGE:.message", "--no-headers")
										if eventsResult != nil && eventsResult.Stdout != "" {
											eventLines := strings.Split(strings.TrimSpace(eventsResult.Stdout), "\n")
											if len(eventLines) > 5 {
												eventLines = eventLines[len(eventLines)-5:]
											}
											pterm.Info.Println("  Recent Events:")
											for _, event := range eventLines {
												if event != "" {
													pterm.Info.Printf("    %s\n", event)
												}
											}
										}

										// Get last 20 lines of logs
										logsResult, _ := m.executor.Execute(localCtx, "kubectl", "-n", ns, "logs", podName, "--tail=20", "--all-containers=true", "--prefix=true")
										if logsResult != nil && logsResult.Stdout != "" {
											pterm.Info.Println("  Recent Logs:")
											for _, line := range strings.Split(logsResult.Stdout, "\n") {
												if line != "" {
													pterm.Info.Printf("    %s\n", line)
												}
											}
										}
									}
								}
								pterm.Info.Println("\n=== End Debug ===")
							}
						}
					}

					// Show recently completed applications
					if len(healthyApps) > 0 && len(healthyApps) <= 5 {
						startIdx := 0
						if len(healthyApps) > 5 {
							startIdx = len(healthyApps) - 5
						}
						pterm.Debug.Printf("  Recently completed: %v\n", healthyApps[startIdx:])
					}
				}
			}

			// Use the high water mark of applications that have ever been ready
			readyCount := len(everReadyApps)

			if readyCount > maxAppsSeenReady {
				maxAppsSeenReady = readyCount
			}

			// Check if deployment is complete - ALL currently detected apps must be healthy and synced
			// All apps must be currently ready (not just "ever ready")
			allReady := false
			if totalApps > 0 && currentlyReady == totalApps {
				allReady = true
			}

			// Update ready count for display purposes (still use everReady for progress tracking)
			if currentlyReady > maxAppsSeenReady {
				maxAppsSeenReady = currentlyReady
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
