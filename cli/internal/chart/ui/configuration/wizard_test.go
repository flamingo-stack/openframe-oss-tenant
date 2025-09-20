package configuration

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewConfigurationWizard(t *testing.T) {
	wizard := NewConfigurationWizard()
	assert.NotNil(t, wizard)
	assert.NotNil(t, wizard.modifier)
	assert.NotNil(t, wizard.branchConfig)
	assert.NotNil(t, wizard.dockerConfig)
	assert.NotNil(t, wizard.ingressConfig)
}

func TestConfigurationWizard_Structure(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Verify all components are properly initialized
	assert.NotNil(t, wizard, "Wizard should be initialized")
	assert.NotNil(t, wizard.modifier, "Modifier should be initialized")
	assert.NotNil(t, wizard.branchConfig, "Branch configurator should be initialized")
	assert.NotNil(t, wizard.dockerConfig, "Docker configurator should be initialized")
	assert.NotNil(t, wizard.ingressConfig, "Ingress configurator should be initialized")
}

func TestConfigurationWizard_Components(t *testing.T) {
	// Test that the wizard can be created multiple times
	wizard1 := NewConfigurationWizard()
	wizard2 := NewConfigurationWizard()

	// Each wizard should have its own instances
	assert.NotSame(t, wizard1, wizard2)
	assert.NotSame(t, wizard1.modifier, wizard2.modifier)
	assert.NotSame(t, wizard1.branchConfig, wizard2.branchConfig)
	assert.NotSame(t, wizard1.dockerConfig, wizard2.dockerConfig)
	assert.NotSame(t, wizard1.ingressConfig, wizard2.ingressConfig)
}