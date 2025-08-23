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

func TestConfigurationWizard_LoadBaseValues(t *testing.T) {
	wizard := NewConfigurationWizard()
	
	// Create a temporary manifests directory
	tmpDir := t.TempDir()
	helmValuesFile := filepath.Join(tmpDir, "helm-values.yaml")
	
	testYAML := `global:
  repoBranch: main
  repoURL: https://github.com/test/repo.git

registry:
  docker:
    username: testuser
    password: testpass
    email: test@example.com

deployment:
  selfHosted:
    enabled: true
`
	
	err := os.WriteFile(helmValuesFile, []byte(testYAML), 0644)
	require.NoError(t, err)
	
	// Test loading base values
	config, err := wizard.loadBaseValues(tmpDir)
	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, helmValuesFile, config.BaseHelmValuesPath)
	assert.Empty(t, config.TempHelmValuesPath) // Should be empty until temp file is created
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

func TestConfigurationWizard_LoadBaseValues_NoFile(t *testing.T) {
	wizard := NewConfigurationWizard()
	
	// Test with empty directory (no helm-values.yaml file)
	tmpDir := t.TempDir()
	
	config, err := wizard.loadBaseValues(tmpDir)
	assert.NoError(t, err)
	assert.NotNil(t, config)
	
	// Should create default values
	assert.NotNil(t, config.ExistingValues)
	global, ok := config.ExistingValues["global"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "main", global["repoBranch"])
	assert.Equal(t, "https://github.com/Flamingo-CX/openframe.git", global["repoURL"])
}

func TestConfigurationWizard_CreateTemporaryValuesFile(t *testing.T) {
	wizard := NewConfigurationWizard()
	tmpDir := t.TempDir()
	
	// Create a base configuration
	config := &types.ChartConfiguration{
		BaseHelmValuesPath: filepath.Join(tmpDir, "helm-values.yaml"),
		TempHelmValuesPath: "",
		ExistingValues: map[string]interface{}{
			"global": map[string]interface{}{
				"repoBranch": "main",
			},
		},
		ModifiedSections: []string{"branch"},
		Branch:          stringPtr("develop"),
	}
	
	// Create temporary values file
	err := wizard.createTemporaryValuesFile(config, tmpDir)
	assert.NoError(t, err)
	
	// Verify temporary file path is set
	assert.NotEmpty(t, config.TempHelmValuesPath)
	assert.Contains(t, config.TempHelmValuesPath, "tmp-helm-values.yaml")
	
	// Verify file exists and has correct content
	assert.FileExists(t, config.TempHelmValuesPath)
	
	// Verify content was applied
	global := config.ExistingValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", global["repoBranch"])
}

// Helper function for tests
func stringPtr(s string) *string {
	return &s
}

func TestConfigurationWizard_ConfigureWithDefaults(t *testing.T) {
	wizard := NewConfigurationWizard()
	tmpDir := t.TempDir()
	
	// Create a base helm values file
	helmValuesFile := filepath.Join(tmpDir, "helm-values.yaml")
	testYAML := `global:
  repoBranch: main
  repoURL: https://github.com/test/repo.git

registry:
  docker:
    username: testuser
    password: testpass
    email: test@example.com

deployment:
  selfHosted:
    enabled: true
`
	
	err := os.WriteFile(helmValuesFile, []byte(testYAML), 0644)
	require.NoError(t, err)
	
	// Test default configuration
	config, err := wizard.configureWithDefaults(tmpDir)
	assert.NoError(t, err)
	assert.NotNil(t, config)
	
	// Should have temporary file created
	assert.NotEmpty(t, config.TempHelmValuesPath)
	assert.Contains(t, config.TempHelmValuesPath, "tmp-helm-values.yaml")
	assert.FileExists(t, config.TempHelmValuesPath)
	
	// Should have no modifications (using defaults)
	assert.Empty(t, config.ModifiedSections)
	assert.Nil(t, config.Branch)
	assert.Nil(t, config.DockerRegistry)
	
	// Values should remain unchanged
	global := config.ExistingValues["global"].(map[string]interface{})
	assert.Equal(t, "main", global["repoBranch"])
}

func TestConfigurationWizard_ShowConfigurationSummary_NoChanges(t *testing.T) {
	wizard := NewConfigurationWizard()
	config := &types.ChartConfiguration{
		BaseHelmValuesPath: "/test/path/values.yaml",
		TempHelmValuesPath: "",
		ExistingValues:     make(map[string]interface{}),
		ModifiedSections:   make([]string, 0), // No modifications
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
		BaseHelmValuesPath: "/test/path/values.yaml",
		TempHelmValuesPath: "",
		ExistingValues:     make(map[string]interface{}),
		ModifiedSections:   []string{"branch"},
		Branch:             &branch,
	}

	// Should not panic
	assert.NotPanics(t, func() {
		wizard.ShowConfigurationSummary(config)
	})
}

func TestConfigurationWizard_ShowConfigurationSummary_WithDockerChanges(t *testing.T) {
	wizard := NewConfigurationWizard()
	config := &types.ChartConfiguration{
		BaseHelmValuesPath: "/test/path/values.yaml",
		TempHelmValuesPath: "",
		ExistingValues:     make(map[string]interface{}),
		ModifiedSections:   []string{"docker"},
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
		BaseHelmValuesPath: "/test/path/values.yaml",
		TempHelmValuesPath: "",
		ExistingValues:     make(map[string]interface{}),
		ModifiedSections:   []string{"branch", "docker"},
		Branch:             &branch,
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
		BaseHelmValuesPath: "/test/path/values.yaml",
		TempHelmValuesPath: "",
		ExistingValues:     make(map[string]interface{}),
		ModifiedSections:   []string{"unknown_section"}, // Unknown section should be handled gracefully
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

// Integration test for complete temporary file workflow
func TestConfigurationWizard_TemporaryFileWorkflow_Integration(t *testing.T) {
	// Create a temporary manifests directory
	tmpDir := t.TempDir()
	helmValuesFile := filepath.Join(tmpDir, "helm-values.yaml")
	
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
  selfHosted:
    enabled: true

apps:
  openframe-config:
    values:
      config:
        branch: main
`
	
	err := os.WriteFile(helmValuesFile, []byte(initialYAML), 0644)
	require.NoError(t, err)
	
	wizard := NewConfigurationWizard()
	
	// Step 1: Load base values from manifests directory
	config, err := wizard.loadBaseValues(tmpDir)
	require.NoError(t, err)
	assert.Equal(t, helmValuesFile, config.BaseHelmValuesPath)
	
	// Step 2: Simulate user changes 
	newBranch := "develop"
	config.Branch = &newBranch
	config.DockerRegistry = &types.DockerRegistryConfig{
		Username: "newuser",
		Password: "newpass",
		Email:    "new@example.com",
	}
	config.ModifiedSections = []string{"branch", "docker"}
	
	// Step 3: Create temporary file with changes
	err = wizard.createTemporaryValuesFile(config, tmpDir)
	assert.NoError(t, err)
	
	// Verify temporary file was created
	assert.NotEmpty(t, config.TempHelmValuesPath)
	assert.Contains(t, config.TempHelmValuesPath, "tmp-helm-values.yaml")
	assert.FileExists(t, config.TempHelmValuesPath)
	
	// Step 4: Verify original file is unchanged
	originalData, err := os.ReadFile(helmValuesFile)
	assert.NoError(t, err)
	assert.Contains(t, string(originalData), "username: olduser")
	assert.Contains(t, string(originalData), "repoBranch: main")
	
	// Step 5: Verify temporary file has changes
	tempData, err := os.ReadFile(config.TempHelmValuesPath)
	assert.NoError(t, err)
	assert.Contains(t, string(tempData), "username: newuser")
	assert.Contains(t, string(tempData), "repoBranch: develop")
	
	// Step 6: Verify temporary file can be loaded and parsed correctly
	reloadedValues, err := wizard.modifier.LoadExistingValues(config.TempHelmValuesPath)
	assert.NoError(t, err)
	
	// Verify changes are in temporary file
	reloadedGlobal := reloadedValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", reloadedGlobal["repoBranch"])
	assert.Equal(t, "https://github.com/test/repo.git", reloadedGlobal["repoURL"])
	
	reloadedRegistry := reloadedValues["registry"].(map[string]interface{})
	reloadedDocker := reloadedRegistry["docker"].(map[string]interface{})
	assert.Equal(t, "newuser", reloadedDocker["username"])
	assert.Equal(t, "newpass", reloadedDocker["password"])
	assert.Equal(t, "new@example.com", reloadedDocker["email"])
	
	// Apps section should also be updated in temp file
	apps := reloadedValues["apps"].(map[string]interface{})
	openframeConfig := apps["openframe-config"].(map[string]interface{})
	appValues := openframeConfig["values"].(map[string]interface{})
	appConfig := appValues["config"].(map[string]interface{})
	assert.Equal(t, "develop", appConfig["branch"])
}