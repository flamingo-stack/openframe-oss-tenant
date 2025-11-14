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

	// Verify cluster connectivity before waiting for CRDs
	if !config.Silent {
		if config.Verbose {
			pterm.Info.Println("Verifying cluster connectivity...")
		}
	}
	clusterCheckResult, err := m.executor.Execute(localCtx, "kubectl", "cluster-info")
	if err != nil || clusterCheckResult == nil {
		return fmt.Errorf("cluster connectivity check failed - kubectl cannot reach cluster: %w", err)
	}
	if config.Verbose {
		pterm.Success.Println("Cluster is accessible")
	}

	// Wait for ArgoCD namespace to exist
	if !config.Silent && config.Verbose {
		pterm.Info.Println("Waiting for ArgoCD namespace...")
	}
	namespaceWaitEnd := time.Now().Add(2 * time.Minute)
	namespaceReady := false
namespaceWaitLoop:
	for time.Now().Before(namespaceWaitEnd) {
		select {
		case <-localCtx.Done():
			return fmt.Errorf("operation cancelled: %w", localCtx.Err())
		case <-time.After(2 * time.Second):
			nsResult, nsErr := m.executor.Execute(localCtx, "kubectl", "get", "namespace", "argocd", "-o", "name")
			if nsErr == nil && nsResult != nil && nsResult.Stdout != "" {
				namespaceReady = true
				if config.Verbose {
					pterm.Success.Println("ArgoCD namespace is ready")
				}
				break namespaceWaitLoop
			}
		}
	}
	if !namespaceReady {
		return fmt.Errorf("ArgoCD namespace did not become ready within timeout")
	}

	// Wait for ArgoCD pods to be created and running before checking CRDs
	if !config.Silent {
		if config.Verbose {
			pterm.Info.Println("Waiting for ArgoCD pods to start...")
		} else {
			pterm.Info.Println("Waiting for ArgoCD to be ready...")
		}
	}

	// Use generous timeout for Windows/WSL2 environments
	podWaitTimeout := 5 * time.Minute
	podWaitEnd := time.Now().Add(podWaitTimeout)
	podWaitStart := time.Now()
	podsRunning := false

podWaitLoop:
	for time.Now().Before(podWaitEnd) {
		select {
		case <-localCtx.Done():
			return fmt.Errorf("operation cancelled: %w", localCtx.Err())
		case <-time.After(5 * time.Second):
			// Check if ArgoCD pods exist and at least one is Running
			podResult, podErr := m.executor.Execute(localCtx, "kubectl", "get", "pods", "-n", "argocd",
				"-o", "jsonpath={.items[?(@.status.phase==\"Running\")].metadata.name}")
			if podErr == nil && podResult != nil && strings.TrimSpace(podResult.Stdout) != "" {
				podsRunning = true
				if config.Verbose {
					runningPods := strings.Fields(podResult.Stdout)
					pterm.Success.Printf("ArgoCD pods are running (%d pod(s))\n", len(runningPods))
				}
				break podWaitLoop
			}

			// Show periodic status updates in verbose mode
			elapsed := time.Since(podWaitStart)
			if config.Verbose && int(elapsed.Seconds())%30 == 0 && elapsed > 30*time.Second {
				pterm.Info.Println("  Still waiting for ArgoCD pods to start...")
				m.showArgoCDPodStatus(localCtx, false) // Show brief status
			}
		}
	}

	if !podsRunning {
		pterm.Error.Println("ArgoCD pods did not start within timeout")
		m.showArgoCDPodStatus(localCtx, config.Verbose) // Show detailed status
		return fmt.Errorf("ArgoCD pods did not start within %v", podWaitTimeout)
	}

	// Bootstrap wait - wait for ArgoCD CRDs to be ready
	// Use longer timeout in CI environments, with extra time for Windows/WSL2
	bootstrapTimeout := 30 * time.Second
	if os.Getenv("CI") != "" || os.Getenv("GITHUB_ACTIONS") != "" {
		// Windows environments need more time due to WSL2 overhead
		if strings.Contains(strings.ToLower(os.Getenv("RUNNER_OS")), "windows") {
			bootstrapTimeout = 5 * time.Minute
			if config.Verbose {
				pterm.Debug.Println("Windows CI environment detected, using 5-minute CRD bootstrap timeout")
			}
		} else {
			bootstrapTimeout = 2 * time.Minute
			if config.Verbose {
				pterm.Debug.Println("CI environment detected, using 2-minute CRD bootstrap timeout")
			}
		}
	}
	bootstrapEnd := time.Now().Add(bootstrapTimeout)
	crdCheckInterval := 2 * time.Second
	lastCRDCheck := time.Now()
	crdReady := false

	// Show info message about bootstrap (unless in silent mode)
	if !config.Silent {
		if config.Verbose {
			pterm.Info.Println("Waiting for ArgoCD CRDs to be ready...")
		} else {
			// Brief message in non-verbose mode
			pterm.Info.Println("Initializing ArgoCD resources...")
		}
	}

	// Check every 10ms for immediate response
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	// Bootstrap phase - wait for CRDs to be ready
	lastPodCheck := time.Now()
	podCheckInterval := 15 * time.Second
	bootstrapCheckCount := 0

	for time.Now().Before(bootstrapEnd) {
		select {
		case <-localCtx.Done():
			return fmt.Errorf("operation cancelled: %w", localCtx.Err())
		case <-ticker.C:
			// Check CRD readiness every 2 seconds
			if time.Since(lastCRDCheck) >= crdCheckInterval {
				lastCRDCheck = time.Now()
				if m.checkCRDReady(localCtx) {
					crdReady = true
					if config.Verbose && !config.Silent {
						pterm.Success.Println("ArgoCD CRDs are ready")
					}
					// Break out of bootstrap once CRDs are ready
					break
				}

				// Check for failed ArgoCD pods every 15 seconds during bootstrap
				if time.Since(lastPodCheck) >= podCheckInterval {
					lastPodCheck = time.Now()
					bootstrapCheckCount++

					// After 30 seconds (2 checks), start checking if pods are in a failed state
					if bootstrapCheckCount >= 2 {
						if failureReason := m.checkArgoCDPodFailures(localCtx); failureReason != "" {
							pterm.Error.Printf("ArgoCD installation appears to have failed: %s\n", failureReason)
							pterm.Info.Println("Showing ArgoCD pod status for debugging:")
							m.showArgoCDPodStatus(localCtx, true)
							return fmt.Errorf("ArgoCD installation failed: %s", failureReason)
						}
					}
				}
			}
		}
		// If CRDs are ready, exit bootstrap early
		if crdReady {
			break
		}
	}

	// If CRDs still aren't ready after bootstrap, warn user
	if !crdReady && config.Verbose {
		pterm.Warning.Println("ArgoCD CRDs not yet ready after bootstrap period, continuing anyway...")
	}

	// Main monitoring phase
	startTime := time.Now()

	// Use shorter timeout in CI environments to avoid workflow timeouts
	timeout := 60 * time.Minute
	if os.Getenv("CI") != "" || os.Getenv("GITHUB_ACTIONS") != "" {
		// In CI, use 15 minutes to fail faster on issues (especially for Windows tests)
		timeout = 15 * time.Minute
		if config.Verbose {
			pterm.Debug.Println("CI environment detected, using 15-minute timeout")
		}
	}

	checkInterval := 2 * time.Second
	lastCheck := time.Now()
	lastProgressUpdate := time.Now() // Track when we last showed progress in non-interactive mode

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

			// Check if CRDs are ready before parsing applications
			if !crdReady {
				crdReady = m.checkCRDReady(localCtx)
				if crdReady {
					if config.Verbose {
						pterm.Success.Println("ArgoCD CRDs are now ready")
					}
				} else {
					// Show periodic message in non-interactive mode so users know we're still waiting
					if config.Silent && time.Since(startTime) > 10*time.Second && int(time.Since(startTime).Seconds())%30 == 0 {
						pterm.Info.Printf("Still waiting for ArgoCD CRDs to become ready... (%s elapsed)\n", time.Since(startTime).Round(time.Second))

						// Add diagnostic information to help troubleshoot
						m.showArgoCDPodStatus(localCtx, config.Verbose)
					}
				}
			}

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
				// Show initial application count when first detected (verbose mode or non-interactive mode)
				if totalApps > 0 {
					if config.Verbose {
						pterm.Info.Printf("Detected %d ArgoCD applications to synchronize\n", totalApps)
					} else if config.Silent {
						// In non-interactive mode, show initial count so users know what to expect
						pterm.Info.Printf("Synchronizing %d ArgoCD applications...\n", totalApps)
					}
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

			// Calculate elapsed time
			elapsed := time.Since(startTime)

			// Update spinner message with current status (if spinner exists)
			if totalApps > 0 {
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
			}

			// Show periodic progress updates in non-interactive mode
			// Update every 30 seconds to show that progress is happening
			if config.Silent && !config.Verbose && totalApps > 0 {
				if time.Since(lastProgressUpdate) >= 30*time.Second {
					lastProgressUpdate = time.Now()
					progressPercent := float64(currentlyReady) / float64(totalApps) * 100
					pterm.Info.Printf("ArgoCD Progress: %d/%d applications ready (%.0f%%) - %s elapsed\n",
						currentlyReady, totalApps, progressPercent, elapsed.Round(time.Second))

					// Show a few waiting applications if there are any
					if len(notReadyApps) > 0 {
						if len(notReadyApps) <= 5 {
							pterm.Info.Printf("  Waiting for: %v\n", notReadyApps)
						} else {
							pterm.Info.Printf("  Waiting for %d apps (first 3): %v...\n",
								len(notReadyApps), notReadyApps[:3])
						}
					}
				}
			}

			// Show verbose logging if enabled
			if config.Verbose && totalApps > 0 {
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

// checkArgoCDPodFailures checks if ArgoCD pods are in a clearly failed state
// Returns an error message if pods are failing, empty string otherwise
func (m *Manager) checkArgoCDPodFailures(ctx context.Context) string {
	// Get pods with their status
	podResult, err := m.executor.Execute(ctx, "kubectl", "get", "pods", "-n", "argocd",
		"-o", "jsonpath={range .items[*]}{.metadata.name}{'\\t'}{.status.phase}{'\\t'}{.status.containerStatuses[*].state}{'\\n'}{end}")
	if err != nil || podResult == nil || podResult.Stdout == "" {
		// Can't determine pod status - don't fail
		return ""
	}

	podLines := strings.Split(strings.TrimSpace(podResult.Stdout), "\n")
	crashLoopCount := 0
	imagePullCount := 0
	errorCount := 0
	totalPods := 0

	for _, line := range podLines {
		if line == "" {
			continue
		}
		totalPods++
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			phase := parts[1]
			stateInfo := ""
			if len(parts) >= 3 {
				stateInfo = parts[2]
			}

			// Check for obvious failure states
			if strings.Contains(stateInfo, "CrashLoopBackOff") || strings.Contains(stateInfo, "crashLoopBackOff") {
				crashLoopCount++
			}
			if strings.Contains(stateInfo, "ImagePullBackOff") || strings.Contains(stateInfo, "ErrImagePull") {
				imagePullCount++
			}
			if phase == "Failed" || phase == "Error" {
				errorCount++
			}
		}
	}

	// If no pods found, don't fail yet (might still be creating)
	if totalPods == 0 {
		return ""
	}

	// If majority of pods are in CrashLoopBackOff, fail fast
	if crashLoopCount > 0 && crashLoopCount >= totalPods/2 {
		return fmt.Sprintf("%d/%d pods in CrashLoopBackOff", crashLoopCount, totalPods)
	}

	// If any pods have image pull errors, fail fast
	if imagePullCount > 0 {
		return fmt.Sprintf("%d/%d pods have ImagePullBackOff", imagePullCount, totalPods)
	}

	// If majority of pods are in Failed/Error state
	if errorCount > 0 && errorCount >= totalPods/2 {
		return fmt.Sprintf("%d/%d pods in Failed/Error state", errorCount, totalPods)
	}

	return ""
}

// showArgoCDPodStatus shows diagnostic information about ArgoCD pods when CRDs aren't ready
func (m *Manager) showArgoCDPodStatus(ctx context.Context, verbose bool) {
	// First check if ArgoCD namespace exists
	nsResult, nsErr := m.executor.Execute(ctx, "kubectl", "get", "namespace", "argocd", "-o", "name")
	if nsErr != nil || nsResult == nil || nsResult.Stdout == "" {
		pterm.Warning.Println("  ArgoCD namespace does not exist yet")
		if verbose {
			pterm.Info.Println("  This usually means Helm installation hasn't created the namespace yet")
		}
		return
	}

	// Get ArgoCD pod status
	podResult, err := m.executor.Execute(ctx, "kubectl", "get", "pods", "-n", "argocd", "-o", "jsonpath={range .items[*]}{.metadata.name}{'\\t'}{.status.phase}{'\\t'}{.status.conditions[?(@.type=='Ready')].status}{'\\n'}{end}")
	if err != nil || podResult == nil {
		pterm.Warning.Printf("  Unable to check ArgoCD pod status: %v\n", err)

		// Additional diagnostics
		if verbose {
			pterm.Info.Println("  Running additional diagnostics...")

			// Check if kubectl can list any resources
			testResult, testErr := m.executor.Execute(ctx, "kubectl", "get", "nodes")
			if testErr == nil && testResult != nil && testResult.Stdout != "" {
				pterm.Info.Println("  ✓ kubectl can list nodes")
			} else {
				pterm.Error.Println("  ✗ kubectl cannot list nodes - cluster connectivity issue")
				if testErr != nil {
					pterm.Error.Printf("    Error: %v\n", testErr)
				}
			}

			// Check if we can see any pods in the namespace
			allPodsResult, _ := m.executor.Execute(ctx, "kubectl", "get", "pods", "-n", "argocd", "--no-headers")
			if allPodsResult != nil && allPodsResult.Stdout != "" {
				pterm.Info.Println("  Found pods in argocd namespace (but status query failed):")
				pterm.Info.Printf("    %s\n", strings.ReplaceAll(strings.TrimSpace(allPodsResult.Stdout), "\n", "\n    "))
			} else {
				pterm.Warning.Println("  No pods found in argocd namespace yet")
			}
		}
		return
	}

	podLines := strings.Split(strings.TrimSpace(podResult.Stdout), "\n")
	if len(podLines) == 0 || (len(podLines) == 1 && podLines[0] == "") {
		pterm.Warning.Println("  No ArgoCD pods found in 'argocd' namespace")
		return
	}

	// Count pod statuses
	runningCount := 0
	notReadyPods := make([]string, 0)

	pterm.Info.Println("  ArgoCD Pod Status:")
	for _, line := range podLines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		if len(parts) >= 2 {
			podName := parts[0]
			phase := parts[1]
			ready := "Unknown"
			if len(parts) >= 3 {
				ready = parts[2]
			}

			pterm.Info.Printf("    - %s: %s (Ready: %s)\n", podName, phase, ready)

			if phase == "Running" && ready == "True" {
				runningCount++
			} else {
				notReadyPods = append(notReadyPods, podName)
			}
		}
	}

	pterm.Info.Printf("  Summary: %d/%d pods running and ready\n", runningCount, len(podLines))

	// If pods are not ready and verbose mode is on, show recent events
	if len(notReadyPods) > 0 && verbose {
		pterm.Info.Println("  Checking recent events for pods not ready:")
		for _, podName := range notReadyPods {
			eventsResult, err := m.executor.Execute(ctx, "kubectl", "get", "events", "-n", "argocd",
				"--field-selector", fmt.Sprintf("involvedObject.name=%s", podName),
				"--sort-by=.lastTimestamp", "--no-headers", "-o", "custom-columns=TIME:.lastTimestamp,REASON:.reason,MESSAGE:.message")

			if err == nil && eventsResult != nil && eventsResult.Stdout != "" {
				eventLines := strings.Split(strings.TrimSpace(eventsResult.Stdout), "\n")
				if len(eventLines) > 3 {
					eventLines = eventLines[len(eventLines)-3:]
				}
				if len(eventLines) > 0 && eventLines[0] != "" {
					pterm.Info.Printf("    %s (last 3 events):\n", podName)
					for _, event := range eventLines {
						if event != "" {
							pterm.Info.Printf("      %s\n", event)
						}
					}
				}
			}
		}
	}
}
