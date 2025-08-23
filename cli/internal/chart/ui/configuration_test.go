package ui

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/flamingo/openframe/internal/chart/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestConfigurationWizard_New(t *testing.T) {
	wizard := NewConfigurationWizard()
	assert.NotNil(t, wizard)
	assert.NotNil(t, wizard.modifier)
}

func TestConfigurationWizard_LoadExistingValues(t *testing.T) {
	wizard := NewConfigurationWizard()
	
	// Create a temporary test file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-values.yaml")
	
	testYAML := `global:
  repoBranch: main
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
	
	err := os.WriteFile(testFile, []byte(testYAML), 0644)
	require.NoError(t, err)
	
	// Test loading existing values
	config, err := wizard.loadExistingValues(testFile)
	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, testFile, config.HelmValuesPath)
	assert.NotNil(t, config.ExistingValues)
	assert.Empty(t, config.ModifiedSections)
	
	// Verify structure
	global, ok := config.ExistingValues["global"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "main", global["repoBranch"])
	
	registry, ok := config.ExistingValues["registry"].(map[string]interface{})
	assert.True(t, ok)
	docker, ok := registry["docker"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "testuser", docker["username"])
}

func TestConfigurationWizard_LoadExistingValues_FileNotFound(t *testing.T) {
	wizard := NewConfigurationWizard()
	
	// Test with non-existent file
	_, err := wizard.loadExistingValues("/nonexistent/path/values.yaml")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "helm values file not found")
}

func TestConfigurationWizard_ShowConfigurationSummary_NoChanges(t *testing.T) {
	wizard := NewConfigurationWizard()
	config := &types.ChartConfiguration{
		HelmValuesPath:   "/test/path/values.yaml",
		ExistingValues:   make(map[string]interface{}),
		ModifiedSections: make([]string, 0), // No modifications
	}

	// Should not panic and should not output anything for no changes
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithBranchChanges(t *testing.T) {
	wizard := NewConfigurationWizard()
	branch := "develop"
	config := &types.ChartConfiguration{
		HelmValuesPath:   "/test/path/values.yaml",
		ExistingValues:   make(map[string]interface{}),
		ModifiedSections: []string{"branch"},
		Branch:           &branch,
	}

	// Should not panic
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithDockerChanges(t *testing.T) {
	wizard := NewConfigurationWizard()
	config := &types.ChartConfiguration{
		HelmValuesPath:   "/test/path/values.yaml",
		ExistingValues:   make(map[string]interface{}),
		ModifiedSections: []string{"docker"},
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "testuser",
			Password: "testpass",
			Email:    "test@example.com",
		},
	}

	// Should not panic
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithAllChanges(t *testing.T) {
	wizard := NewConfigurationWizard()
	branch := "develop"
	config := &types.ChartConfiguration{
		HelmValuesPath:   "/test/path/values.yaml",
		ExistingValues:   make(map[string]interface{}),
		ModifiedSections: []string{"branch", "docker"},
		Branch:           &branch,
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "testuser",
			Password: "testpass",
			Email:    "test@example.com",
		},
	}

	// Should not panic
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_UnknownSection(t *testing.T) {
	wizard := NewConfigurationWizard()
	config := &types.ChartConfiguration{
		HelmValuesPath:   "/test/path/values.yaml",
		ExistingValues:   make(map[string]interface{}),
		ModifiedSections: []string{"unknown_section"}, // Unknown section should be handled gracefully
	}

	// Should not panic even with unknown sections
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_GetCurrentBranch(t *testing.T) {
	wizard := NewConfigurationWizard()
	
	// Test with existing branch
	values := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "develop",
		},
	}
	
	branch := wizard.modifier.GetCurrentBranch(values)
	assert.Equal(t, "develop", branch)
	
	// Test with no global section - should return default
	emptyValues := make(map[string]interface{})
	defaultBranch := wizard.modifier.GetCurrentBranch(emptyValues)
	assert.Equal(t, "main", defaultBranch)
}

func TestConfigurationWizard_GetCurrentDockerSettings(t *testing.T) {
	wizard := NewConfigurationWizard()
	
	// Test with existing Docker settings
	values := map[string]interface{}{
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "myuser",
				"password": "mypass",
				"email":    "my@example.com",
			},
		},
	}
	
	docker := wizard.modifier.GetCurrentDockerSettings(values)
	assert.Equal(t, "myuser", docker.Username)
	assert.Equal(t, "mypass", docker.Password)
	assert.Equal(t, "my@example.com", docker.Email)
	
	// Test with no registry section - should return defaults
	emptyValues := make(map[string]interface{})
	defaultDocker := wizard.modifier.GetCurrentDockerSettings(emptyValues)
	assert.Equal(t, "default", defaultDocker.Username)
	assert.Equal(t, "****", defaultDocker.Password)
	assert.Equal(t, "default@example.com", defaultDocker.Email)
}

// Integration test for configuration workflow (without UI prompts)
func TestConfigurationWizard_ConfigurationWorkflow_Integration(t *testing.T) {
	// Create a temporary test file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-values.yaml")
	
	initialYAML := `global:
  repoBranch: main
  repoURL: https://github.com/test/repo.git
  autoSync: true

registry:
  docker:
    username: olduser
    password: oldpass
    email: old@example.com

deployment:
  ingress:
    localhost:
      enabled: true

apps:
  openframe-config:
    values:
      config:
        branch: main
`
	
	err := os.WriteFile(testFile, []byte(initialYAML), 0644)
	require.NoError(t, err)
	
	wizard := NewConfigurationWizard()
	
	// Step 1: Load existing values
	config, err := wizard.loadExistingValues(testFile)
	require.NoError(t, err)
	
	// Step 2: Simulate changes (what would happen after user prompts)
	newBranch := "develop"
	config.Branch = &newBranch
	config.DockerRegistry = &types.DockerRegistryConfig{
		Username: "newuser",
		Password: "newpass",
		Email:    "new@example.com",
	}
	config.ModifiedSections = []string{"branch", "docker"}
	
	// Step 3: Apply configuration changes
	err = wizard.modifier.ApplyConfiguration(config.ExistingValues, config)
	assert.NoError(t, err)
	
	// Step 4: Verify changes in memory
	global := config.ExistingValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", global["repoBranch"])
	// Other values should be preserved
	assert.Equal(t, "https://github.com/test/repo.git", global["repoURL"])
	assert.Equal(t, true, global["autoSync"])
	
	registry := config.ExistingValues["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "newuser", docker["username"])
	assert.Equal(t, "newpass", docker["password"])
	assert.Equal(t, "new@example.com", docker["email"])
	
	// Apps section should also be updated
	apps := config.ExistingValues["apps"].(map[string]interface{})
	openframeConfig := apps["openframe-config"].(map[string]interface{})
	appValues := openframeConfig["values"].(map[string]interface{})
	appConfig := appValues["config"].(map[string]interface{})
	assert.Equal(t, "develop", appConfig["branch"])
	
	// Step 5: Write values to file
	err = wizard.modifier.WriteValues(config.ExistingValues, testFile)
	assert.NoError(t, err)
	
	// Step 6: Verify file can be read back correctly
	reloadedValues, err := wizard.modifier.LoadExistingValues(testFile)
	assert.NoError(t, err)
	
	// Verify reloaded values match our changes
	reloadedGlobal := reloadedValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", reloadedGlobal["repoBranch"])
	assert.Equal(t, "https://github.com/test/repo.git", reloadedGlobal["repoURL"])
	
	reloadedRegistry := reloadedValues["registry"].(map[string]interface{})
	reloadedDocker := reloadedRegistry["docker"].(map[string]interface{})
	assert.Equal(t, "newuser", reloadedDocker["username"])
	assert.Equal(t, "newpass", reloadedDocker["password"])
	assert.Equal(t, "new@example.com", reloadedDocker["email"])
}