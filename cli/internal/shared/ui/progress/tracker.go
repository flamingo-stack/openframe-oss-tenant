package progress

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/pterm/pterm"
)

// Tracker provides comprehensive progress tracking for long-running operations
type Tracker struct {
	operation    string
	steps        []Step
	currentStep  int
	startTime    time.Time
	spinner      *pterm.SpinnerPrinter
	progressBar  *pterm.ProgressbarPrinter
	mu           sync.Mutex
	completed    bool
	cancelled    bool
	context      context.Context
	cancelFunc   context.CancelFunc
}

// Step represents a single step in a multi-step operation
type Step struct {
	Name        string
	Description string
	Weight      float64 // Relative weight for progress calculation
	Duration    time.Duration
	Status      StepStatus
	Error       error
	StartTime   time.Time
	EndTime     time.Time
}

// StepStatus represents the status of a step
type StepStatus int

const (
	StepPending StepStatus = iota
	StepRunning
	StepCompleted
	StepFailed
	StepSkipped
)

func (s StepStatus) String() string {
	switch s {
	case StepPending:
		return "Pending"
	case StepRunning:
		return "Running"
	case StepCompleted:
		return "Completed"
	case StepFailed:
		return "Failed"
	case StepSkipped:
		return "Skipped"
	default:
		return "Unknown"
	}
}

// NewTracker creates a new progress tracker for the given operation
func NewTracker(operation string, steps []Step) *Tracker {
	ctx, cancel := context.WithCancel(context.Background())
	
	return &Tracker{
		operation:  operation,
		steps:      steps,
		currentStep: -1,
		context:    ctx,
		cancelFunc: cancel,
	}
}

// Start begins tracking progress for the operation
func (t *Tracker) Start() {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.startTime = time.Now()
	t.spinner, _ = pterm.DefaultSpinner.
		WithText(fmt.Sprintf("Starting %s...", t.operation)).
		Start()
}

// StartStep begins execution of a specific step
func (t *Tracker) StartStep(stepIndex int) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if stepIndex < 0 || stepIndex >= len(t.steps) {
		return fmt.Errorf("invalid step index: %d", stepIndex)
	}

	// Mark previous step as completed if transitioning
	if t.currentStep >= 0 && t.currentStep < len(t.steps) {
		if t.steps[t.currentStep].Status == StepRunning {
			t.steps[t.currentStep].Status = StepCompleted
			t.steps[t.currentStep].EndTime = time.Now()
		}
	}

	t.currentStep = stepIndex
	t.steps[stepIndex].Status = StepRunning
	t.steps[stepIndex].StartTime = time.Now()

	// Update spinner text
	if t.spinner != nil {
		stepText := fmt.Sprintf("🔄 %s - %s", t.operation, t.steps[stepIndex].Name)
		t.spinner.UpdateText(stepText)
	}

	return nil
}

// CompleteStep marks a step as completed successfully
func (t *Tracker) CompleteStep(stepIndex int) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if stepIndex < 0 || stepIndex >= len(t.steps) {
		return fmt.Errorf("invalid step index: %d", stepIndex)
	}

	t.steps[stepIndex].Status = StepCompleted
	t.steps[stepIndex].EndTime = time.Now()
	t.steps[stepIndex].Duration = t.steps[stepIndex].EndTime.Sub(t.steps[stepIndex].StartTime)

	// Show completion message
	pterm.Success.Printf("✅ %s completed (%s)\n", 
		t.steps[stepIndex].Name, 
		t.steps[stepIndex].Duration.Round(time.Millisecond))

	return nil
}

// FailStep marks a step as failed
func (t *Tracker) FailStep(stepIndex int, err error) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if stepIndex < 0 || stepIndex >= len(t.steps) {
		return fmt.Errorf("invalid step index: %d", stepIndex)
	}

	t.steps[stepIndex].Status = StepFailed
	t.steps[stepIndex].Error = err
	t.steps[stepIndex].EndTime = time.Now()
	t.steps[stepIndex].Duration = t.steps[stepIndex].EndTime.Sub(t.steps[stepIndex].StartTime)

	// Show error message
	pterm.Error.Printf("❌ %s failed: %v (%s)\n", 
		t.steps[stepIndex].Name, 
		err,
		t.steps[stepIndex].Duration.Round(time.Millisecond))

	return nil
}

// SkipStep marks a step as skipped
func (t *Tracker) SkipStep(stepIndex int, reason string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if stepIndex < 0 || stepIndex >= len(t.steps) {
		return fmt.Errorf("invalid step index: %d", stepIndex)
	}

	t.steps[stepIndex].Status = StepSkipped
	t.steps[stepIndex].EndTime = time.Now()

	// Show skip message
	pterm.Warning.Printf("⏭️  %s skipped: %s\n", t.steps[stepIndex].Name, reason)

	return nil
}

// UpdateProgress updates the progress of the current step
func (t *Tracker) UpdateProgress(stepProgress float64) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.currentStep < 0 || t.currentStep >= len(t.steps) {
		return
	}

	// Calculate overall progress
	totalWeight := 0.0
	completedWeight := 0.0

	for i, step := range t.steps {
		totalWeight += step.Weight
		if step.Status == StepCompleted {
			completedWeight += step.Weight
		} else if i == t.currentStep && step.Status == StepRunning {
			completedWeight += step.Weight * (stepProgress / 100.0)
		}
	}

	overallProgress := (completedWeight / totalWeight) * 100.0

	// Update progress display
	if t.progressBar == nil {
		t.progressBar, _ = pterm.DefaultProgressbar.WithTotal(100).Start()
	}

	t.progressBar.UpdateTitle(fmt.Sprintf("%s - %s", t.operation, t.steps[t.currentStep].Name))
	t.progressBar.Current = int(overallProgress)
}

// Complete marks the entire operation as completed
func (t *Tracker) Complete() {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.completed {
		return
	}

	t.completed = true
	totalDuration := time.Since(t.startTime)

	// Stop spinner and progress bar
	if t.spinner != nil {
		t.spinner.Success("Operation completed")
		t.spinner.Stop()
	}
	if t.progressBar != nil {
		t.progressBar.Stop()
	}

	// Show completion summary
	t.showSummary(totalDuration)
}

// Fail marks the entire operation as failed
func (t *Tracker) Fail(err error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.completed {
		return
	}

	t.completed = true
	totalDuration := time.Since(t.startTime)

	// Stop spinner and progress bar
	if t.spinner != nil {
		t.spinner.Fail("Operation failed")
		t.spinner.Stop()
	}
	if t.progressBar != nil {
		t.progressBar.Stop()
	}

	// Show failure message
	pterm.Error.Printf("❌ %s failed after %s: %v\n", t.operation, totalDuration.Round(time.Millisecond), err)
	t.showSummary(totalDuration)
}

// Cancel cancels the operation
func (t *Tracker) Cancel() {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.completed || t.cancelled {
		return
	}

	t.cancelled = true
	t.cancelFunc()

	// Stop spinner and progress bar
	if t.spinner != nil {
		t.spinner.Warning("Operation cancelled")
		t.spinner.Stop()
	}
	if t.progressBar != nil {
		t.progressBar.Stop()
	}

	pterm.Warning.Printf("⏹️  %s cancelled by user\n", t.operation)
}

// Context returns the cancellation context
func (t *Tracker) Context() context.Context {
	return t.context
}

// IsCompleted returns true if the operation is completed
func (t *Tracker) IsCompleted() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.completed
}

// IsCancelled returns true if the operation is cancelled
func (t *Tracker) IsCancelled() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.cancelled
}

// GetProgress returns the current progress percentage
func (t *Tracker) GetProgress() float64 {
	t.mu.Lock()
	defer t.mu.Unlock()

	totalWeight := 0.0
	completedWeight := 0.0

	for _, step := range t.steps {
		totalWeight += step.Weight
		if step.Status == StepCompleted {
			completedWeight += step.Weight
		}
	}

	if totalWeight == 0 {
		return 0
	}

	return (completedWeight / totalWeight) * 100.0
}

// GetEstimatedTimeRemaining estimates time remaining based on completed steps
func (t *Tracker) GetEstimatedTimeRemaining() time.Duration {
	t.mu.Lock()
	defer t.mu.Unlock()

	elapsed := time.Since(t.startTime)
	progress := t.GetProgress()

	if progress <= 0 {
		return 0
	}

	estimatedTotal := time.Duration(float64(elapsed) / (progress / 100.0))
	return estimatedTotal - elapsed
}

// showSummary displays a summary of the operation
func (t *Tracker) showSummary(totalDuration time.Duration) {
	fmt.Println()
	pterm.Info.Println("📊 Operation Summary:")
	
	completedCount := 0
	failedCount := 0
	skippedCount := 0

	for _, step := range t.steps {
		switch step.Status {
		case StepCompleted:
			completedCount++
			pterm.Success.Printf("  ✅ %s (%s)\n", step.Name, step.Duration.Round(time.Millisecond))
		case StepFailed:
			failedCount++
			pterm.Error.Printf("  ❌ %s (%s): %v\n", step.Name, step.Duration.Round(time.Millisecond), step.Error)
		case StepSkipped:
			skippedCount++
			pterm.Warning.Printf("  ⏭️  %s (skipped)\n", step.Name)
		default:
			pterm.Info.Printf("  ⏸️  %s (not started)\n", step.Name)
		}
	}

	fmt.Println()
	pterm.Info.Printf("Total Duration: %s\n", totalDuration.Round(time.Millisecond))
	pterm.Info.Printf("Steps: %d completed, %d failed, %d skipped, %d total\n", 
		completedCount, failedCount, skippedCount, len(t.steps))
}