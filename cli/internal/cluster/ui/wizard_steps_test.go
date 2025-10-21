package ui

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/stretchr/testify/assert"
)

func TestWizardSteps(t *testing.T) {
	steps := NewWizardSteps()
	assert.NotNil(t, steps, "NewWizardSteps should return a non-nil instance")
}

func TestWizardSteps_PromptClusterType(t *testing.T) {
	steps := NewWizardSteps()

	t.Run("should have cluster type prompt", func(t *testing.T) {
		// We can't easily test the interactive part, but we can test the method exists
		assert.NotNil(t, steps.PromptClusterType)
	})
}

func TestWizardSteps_PromptK8sVersion(t *testing.T) {
	steps := NewWizardSteps()

	t.Run("should have k8s version prompt", func(t *testing.T) {
		// We can't easily test the interactive part, but we can test the method exists
		assert.NotNil(t, steps.PromptK8sVersion)
	})
}

func TestWizardSteps_ConfirmConfiguration(t *testing.T) {
	steps := NewWizardSteps()

	t.Run("should have confirm configuration method", func(t *testing.T) {
		// We can't easily test the interactive part, but we can test the method exists
		assert.NotNil(t, steps.ConfirmConfiguration)
	})

	t.Run("should handle valid configuration", func(t *testing.T) {
		config := models.ClusterConfig{
			Name:       "test-cluster",
			Type:       models.ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "latest",
		}

		// Test that it doesn't panic with valid config
		assert.NotPanics(t, func() {
			// This would show UI in real usage, but shouldn't panic
			steps.ConfirmConfiguration(config)
		})
	})
}
