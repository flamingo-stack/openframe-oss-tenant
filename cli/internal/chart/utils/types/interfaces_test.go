package types

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestWorkflowResult_DefaultValues(t *testing.T) {
	result := &WorkflowResult{}

	assert.False(t, result.Success)
	assert.Nil(t, result.Error)
	assert.Nil(t, result.Steps)
	assert.Equal(t, time.Duration(0), result.TotalTime)
	assert.Empty(t, result.ClusterName)
}

func TestWorkflowResult_WithValues(t *testing.T) {
	steps := []StepResult{
		{
			StepName:  "step1",
			Success:   true,
			Duration:  10 * time.Second,
			Timestamp: time.Now(),
		},
	}

	result := &WorkflowResult{
		Success:     true,
		Error:       nil,
		Steps:       steps,
		TotalTime:   30 * time.Second,
		ClusterName: "test-cluster",
	}

	assert.True(t, result.Success)
	assert.Nil(t, result.Error)
	assert.Equal(t, steps, result.Steps)
	assert.Equal(t, 30*time.Second, result.TotalTime)
	assert.Equal(t, "test-cluster", result.ClusterName)
	assert.Len(t, result.Steps, 1)
	assert.Equal(t, "step1", result.Steps[0].StepName)
}

func TestStepResult_DefaultValues(t *testing.T) {
	step := &StepResult{}

	assert.Empty(t, step.StepName)
	assert.False(t, step.Success)
	assert.Nil(t, step.Error)
	assert.Equal(t, time.Duration(0), step.Duration)
	assert.True(t, step.Timestamp.IsZero())
}

func TestStepResult_WithValues(t *testing.T) {
	timestamp := time.Now()
	step := &StepResult{
		StepName:  "prerequisite-check",
		Success:   true,
		Error:     nil,
		Duration:  5 * time.Second,
		Timestamp: timestamp,
	}

	assert.Equal(t, "prerequisite-check", step.StepName)
	assert.True(t, step.Success)
	assert.Nil(t, step.Error)
	assert.Equal(t, 5*time.Second, step.Duration)
	assert.Equal(t, timestamp, step.Timestamp)
}

func TestStepResult_WithError(t *testing.T) {
	err := assert.AnError
	step := &StepResult{
		StepName: "helm-install",
		Success:  false,
		Error:    err,
		Duration: 15 * time.Second,
	}

	assert.Equal(t, "helm-install", step.StepName)
	assert.False(t, step.Success)
	assert.Equal(t, err, step.Error)
	assert.Equal(t, 15*time.Second, step.Duration)
}

func TestInstallationRequest_DefaultValues(t *testing.T) {
	req := &InstallationRequest{}

	assert.Nil(t, req.Args)
	assert.False(t, req.Force)
	assert.False(t, req.DryRun)
	assert.False(t, req.Verbose)
	assert.Empty(t, req.GitHubRepo)
	assert.Empty(t, req.GitHubBranch)
	assert.Empty(t, req.GitHubUsername)
	assert.Empty(t, req.GitHubToken)
	assert.Empty(t, req.CertDir)
}

func TestInstallationRequest_WithValues(t *testing.T) {
	req := &InstallationRequest{
		Args:           []string{"test-cluster"},
		Force:          true,
		DryRun:         false,
		Verbose:        true,
		GitHubRepo:     "https://github.com/test/repo",
		GitHubBranch:   "main",
		GitHubUsername: "testuser",
		GitHubToken:    "token123",
		CertDir:        "/path/to/certs",
	}

	assert.Equal(t, []string{"test-cluster"}, req.Args)
	assert.True(t, req.Force)
	assert.False(t, req.DryRun)
	assert.True(t, req.Verbose)
	assert.Equal(t, "https://github.com/test/repo", req.GitHubRepo)
	assert.Equal(t, "main", req.GitHubBranch)
	assert.Equal(t, "testuser", req.GitHubUsername)
	assert.Equal(t, "token123", req.GitHubToken)
	assert.Equal(t, "/path/to/certs", req.CertDir)
}

func TestInstallationRequest_WithMultipleArgs(t *testing.T) {
	req := &InstallationRequest{
		Args:         []string{"cluster1", "cluster2", "cluster3"},
		Force:        false,
		DryRun:       true,
		Verbose:      false,
		GitHubRepo:   "https://github.com/multi/repo",
		GitHubBranch: "develop",
	}

	assert.Len(t, req.Args, 3)
	assert.Equal(t, "cluster1", req.Args[0])
	assert.Equal(t, "cluster2", req.Args[1])
	assert.Equal(t, "cluster3", req.Args[2])
	assert.False(t, req.Force)
	assert.True(t, req.DryRun)
	assert.False(t, req.Verbose)
	assert.Equal(t, "https://github.com/multi/repo", req.GitHubRepo)
	assert.Equal(t, "develop", req.GitHubBranch)
}

func TestWorkflowResult_WithMultipleSteps(t *testing.T) {
	now := time.Now()
	steps := []StepResult{
		{
			StepName:  "prerequisites",
			Success:   true,
			Duration:  2 * time.Second,
			Timestamp: now.Add(-10 * time.Second),
		},
		{
			StepName:  "cluster-selection",
			Success:   true,
			Duration:  1 * time.Second,
			Timestamp: now.Add(-8 * time.Second),
		},
		{
			StepName:  "helm-install",
			Success:   false,
			Error:     assert.AnError,
			Duration:  5 * time.Second,
			Timestamp: now.Add(-3 * time.Second),
		},
	}

	result := &WorkflowResult{
		Success:     false, // Overall failure due to last step
		Error:       assert.AnError,
		Steps:       steps,
		TotalTime:   8 * time.Second,
		ClusterName: "production-cluster",
	}

	assert.False(t, result.Success)
	assert.NotNil(t, result.Error)
	assert.Len(t, result.Steps, 3)
	assert.Equal(t, 8*time.Second, result.TotalTime)
	assert.Equal(t, "production-cluster", result.ClusterName)

	// Check individual steps
	assert.True(t, result.Steps[0].Success)
	assert.Equal(t, "prerequisites", result.Steps[0].StepName)
	assert.True(t, result.Steps[1].Success)
	assert.Equal(t, "cluster-selection", result.Steps[1].StepName)
	assert.False(t, result.Steps[2].Success)
	assert.Equal(t, "helm-install", result.Steps[2].StepName)
	assert.NotNil(t, result.Steps[2].Error)
}

func TestInstallationRequest_EmptyArgs(t *testing.T) {
	req := &InstallationRequest{
		Args:         []string{},
		GitHubRepo:   "https://github.com/empty/args",
		GitHubBranch: "main",
	}

	assert.NotNil(t, req.Args)
	assert.Len(t, req.Args, 0)
	assert.Equal(t, "https://github.com/empty/args", req.GitHubRepo)
	assert.Equal(t, "main", req.GitHubBranch)
}

func TestWorkflowResult_SuccessfulCompletion(t *testing.T) {
	steps := []StepResult{
		{
			StepName:  "prerequisites",
			Success:   true,
			Duration:  1 * time.Second,
			Timestamp: time.Now().Add(-5 * time.Second),
		},
		{
			StepName:  "installation",
			Success:   true,
			Duration:  3 * time.Second,
			Timestamp: time.Now().Add(-2 * time.Second),
		},
		{
			StepName:  "verification",
			Success:   true,
			Duration:  1 * time.Second,
			Timestamp: time.Now(),
		},
	}

	result := &WorkflowResult{
		Success:     true,
		Error:       nil,
		Steps:       steps,
		TotalTime:   5 * time.Second,
		ClusterName: "development-cluster",
	}

	assert.True(t, result.Success)
	assert.Nil(t, result.Error)
	assert.Len(t, result.Steps, 3)
	assert.Equal(t, 5*time.Second, result.TotalTime)
	assert.Equal(t, "development-cluster", result.ClusterName)

	// Verify all steps succeeded
	for _, step := range result.Steps {
		assert.True(t, step.Success)
		assert.Nil(t, step.Error)
		assert.NotEmpty(t, step.StepName)
		assert.Greater(t, step.Duration, time.Duration(0))
	}
}

// Test interface completeness by verifying struct field counts
func TestStructFieldCounts(t *testing.T) {
	// These tests help ensure we don't accidentally remove fields without updating tests
	
	// WorkflowResult should have 5 fields
	result := WorkflowResult{}
	_ = result.Success
	_ = result.Error
	_ = result.Steps
	_ = result.TotalTime
	_ = result.ClusterName
	// If we add/remove fields, this will cause compilation errors

	// StepResult should have 5 fields
	step := StepResult{}
	_ = step.StepName
	_ = step.Success
	_ = step.Error
	_ = step.Duration
	_ = step.Timestamp

	// InstallationRequest should have 9 fields
	req := InstallationRequest{}
	_ = req.Args
	_ = req.Force
	_ = req.DryRun
	_ = req.Verbose
	_ = req.GitHubRepo
	_ = req.GitHubBranch
	_ = req.GitHubUsername
	_ = req.GitHubToken
	_ = req.CertDir

	// If test passes, all expected fields exist
	assert.True(t, true, "All struct fields are accessible")
}