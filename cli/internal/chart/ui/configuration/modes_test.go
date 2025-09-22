package configuration

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfigurationWizard_ConfigureWithDefaults_OSS(t *testing.T) {
	_ = NewConfigurationWizard() // Test constructor

	// Test the underlying modifier functionality for OSS mode
	modifier := templates.NewHelmValuesModifier()
	values, err := modifier.LoadOrCreateBaseValues()
	assert.NoError(t, err)
	assert.NotNil(t, values)

	// Test temporary file creation
	tempFile, err := modifier.CreateTemporaryValuesFile(values)
	assert.NoError(t, err)
	assert.Equal(t, "helm-values-tmp.yaml", tempFile)

	// Clean up temporary file
	defer os.Remove(tempFile)
}

func TestConfigurationWizard_ConfigureWithExistingFile(t *testing.T) {
	_ = NewConfigurationWizard() // Test constructor

	// Create temporary directory with existing helm values file
	tmpDir := t.TempDir()
	helmValuesPath := filepath.Join(tmpDir, "helm-values.yaml")

	existingYAML := `global:
  repoBranch: develop
  repoURL: https://github.com/test/repo.git
registry:
  docker:
    username: testuser
    password: testpass
    email: test@example.com
deployment:
  ingress:
    localhost:
      enabled: true
`

	err := os.WriteFile(helmValuesPath, []byte(existingYAML), 0644)
	require.NoError(t, err)

	// Test the underlying modifier functionality
	modifier := templates.NewHelmValuesModifier()
	values, err := modifier.LoadExistingValues(helmValuesPath)
	assert.NoError(t, err)
	assert.NotNil(t, values)

	// Verify existing values are loaded
	global, ok := values["global"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "develop", global["repoBranch"])
}

func TestConfigurationWizard_Integration_LoadAndApply(t *testing.T) {
	_ = NewConfigurationWizard() // Test constructor

	// Create temporary directory with existing helm values
	tmpDir := t.TempDir()
	helmValuesPath := filepath.Join(tmpDir, "helm-values.yaml")

	originalYAML := `deployment:
  oss:
    repository:
      branch: main
registry:
  docker:
    username: default
    password: "****"
    email: default@example.com
`

	err := os.WriteFile(helmValuesPath, []byte(originalYAML), 0644)
	require.NoError(t, err)

	// Test the integration flow using the modifier directly
	modifier := templates.NewHelmValuesModifier()

	// Load existing values
	values, err := modifier.LoadExistingValues(helmValuesPath)
	assert.NoError(t, err)

	// Create configuration with changes for OSS deployment
	newBranch := "develop"
	deploymentMode := types.DeploymentModeOSS
	config := &types.ChartConfiguration{
		Branch:         &newBranch,
		DeploymentMode: &deploymentMode,
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "newuser",
			Password: "newpass",
			Email:    "new@example.com",
		},
		ModifiedSections: []string{"branch", "docker"},
		ExistingValues:   values,
	}

	// Apply configuration to values
	err = modifier.ApplyConfiguration(values, config)
	assert.NoError(t, err)

	// Write updated values to temporary file
	tempHelmValuesPath := filepath.Join(tmpDir, "tmp-helm-values.yaml")
	err = modifier.WriteValues(values, tempHelmValuesPath)
	assert.NoError(t, err)

	// Verify the file was created and contains expected changes
	assert.FileExists(t, tempHelmValuesPath)

	// Load the updated values and verify changes
	updatedValues, err := modifier.LoadExistingValues(tempHelmValuesPath)
	assert.NoError(t, err)

	// Verify deployment structure changes
	deployment := updatedValues["deployment"].(map[string]interface{})
	oss := deployment["oss"].(map[string]interface{})
	repository := oss["repository"].(map[string]interface{})
	assert.Equal(t, "develop", repository["branch"])

	registry := updatedValues["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "newuser", docker["username"])
	assert.Equal(t, "newpass", docker["password"])
	assert.Equal(t, "new@example.com", docker["email"])
}

func TestConfigurationWizard_DeploymentModes(t *testing.T) {
	tests := []struct {
		name     string
		mode     types.DeploymentMode
		expected string
	}{
		{
			name:     "OSS deployment mode",
			mode:     types.DeploymentModeOSS,
			expected: "oss",
		},
		{
			name:     "SaaS deployment mode",
			mode:     types.DeploymentModeSaaS,
			expected: "saas",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, string(tt.mode))
		})
	}
}

func TestConfigurationWizard_LoadBaseValues(t *testing.T) {
	wizard := NewConfigurationWizard()

	// Test loadBaseValues function
	config, err := wizard.loadBaseValues()
	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, "helm-values.yaml", config.BaseHelmValuesPath)
	assert.Empty(t, config.TempHelmValuesPath)
	assert.NotNil(t, config.ExistingValues)
	assert.Empty(t, config.ModifiedSections)
}