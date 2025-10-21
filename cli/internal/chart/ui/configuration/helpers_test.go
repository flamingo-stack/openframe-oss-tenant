package configuration

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	"github.com/stretchr/testify/assert"
)

func TestConfigurationWizard_ShowConfigurationSummary_NoChanges(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Create configuration with no modified sections
	config := &types.ChartConfiguration{
		ModifiedSections: []string{},
		ExistingValues:   map[string]interface{}{},
	}

	// Should not panic when called
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithChanges(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Create configuration with modified sections
	branch := "develop"
	deploymentMode := types.DeploymentModeOSS
	config := &types.ChartConfiguration{
		Branch:         &branch,
		DeploymentMode: &deploymentMode,
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "newuser",
			Password: "newpass",
			Email:    "new@example.com",
		},
		IngressConfig: &types.IngressConfig{
			Type: types.IngressTypeLocalhost,
		},
		ModifiedSections: []string{"deployment", "branch", "docker", "ingress"},
		ExistingValues:   map[string]interface{}{},
	}

	// Should not panic when called
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithNgrokConfig(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Create configuration with ngrok settings
	config := &types.ChartConfiguration{
		IngressConfig: &types.IngressConfig{
			Type: types.IngressTypeNgrok,
			NgrokConfig: &types.NgrokConfig{
				Domain:        "example.ngrok.io",
				APIKey:        "api_key_123",
				AuthToken:     "auth_token_456",
				UseAllowedIPs: true,
				AllowedIPs:    []string{"192.168.1.1", "10.0.0.1"},
			},
		},
		ModifiedSections: []string{"ingress"},
		ExistingValues:   map[string]interface{}{},
	}

	// Should not panic when called
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithSaaSConfig(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Create configuration with SaaS settings
	deploymentMode := types.DeploymentModeSaaS
	config := &types.ChartConfiguration{
		DeploymentMode: &deploymentMode,
		SaaSConfig: &types.SaaSConfig{
			RepositoryPassword:       "repo-pass",
			ConfigRepositoryPassword: "config-pass",
			SaaSBranch:               "main",
			OSSBranch:                "develop",
		},
		ModifiedSections: []string{"deployment", "saas"},
		ExistingValues:   map[string]interface{}{},
	}

	// Should not panic when called
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}
