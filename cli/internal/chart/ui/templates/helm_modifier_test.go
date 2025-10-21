package templates

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHelmValuesModifier_New(t *testing.T) {
	modifier := NewHelmValuesModifier()
	assert.NotNil(t, modifier)
}

func TestHelmValuesModifier_LoadExistingValues(t *testing.T) {
	modifier := NewHelmValuesModifier()

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
	values, err := modifier.LoadExistingValues(testFile)
	assert.NoError(t, err)
	assert.NotNil(t, values)

	// Verify structure
	global, ok := values["global"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "main", global["repoBranch"])
	assert.Equal(t, "https://github.com/test/repo.git", global["repoURL"])

	registry, ok := values["registry"].(map[string]interface{})
	assert.True(t, ok)
	docker, ok := registry["docker"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "testuser", docker["username"])
	assert.Equal(t, "testpass", docker["password"])
	assert.Equal(t, "test@example.com", docker["email"])
}

func TestHelmValuesModifier_LoadExistingValues_FileNotFound(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Test with non-existent file
	_, err := modifier.LoadExistingValues("/nonexistent/path/values.yaml")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "helm values file not found")
}

func TestHelmValuesModifier_LoadExistingValues_InvalidYAML(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Create a temporary test file with invalid YAML
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "invalid-values.yaml")

	invalidYAML := `global:
  repoBranch: main
  repoURL: [invalid yaml structure
`

	err := os.WriteFile(testFile, []byte(invalidYAML), 0644)
	require.NoError(t, err)

	// Test loading invalid YAML
	_, err = modifier.LoadExistingValues(testFile)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse helm values YAML")
}

func TestHelmValuesModifier_LoadExistingValues_EmptyFile(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Create a temporary test file that is empty
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "empty-values.yaml")

	// Create empty file
	err := os.WriteFile(testFile, []byte(""), 0644)
	require.NoError(t, err)

	// Test loading empty file - should return empty map, not nil
	values, err := modifier.LoadExistingValues(testFile)
	assert.NoError(t, err)
	assert.NotNil(t, values)
	assert.Equal(t, 0, len(values))
}

func TestHelmValuesModifier_GetCurrentOSSBranch(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Test with existing OSS branch in deployment structure
	values := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"repository": map[string]interface{}{
					"branch": "develop",
				},
			},
		},
	}

	branch := modifier.GetCurrentOSSBranch(values)
	assert.Equal(t, "develop", branch)

	// Test with no deployment section - should return default
	emptyValues := make(map[string]interface{})
	defaultBranch := modifier.GetCurrentOSSBranch(emptyValues)
	assert.Equal(t, "main", defaultBranch)

	// Test with deployment section but no OSS branch - should return default
	nobranchValues := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"enabled": true,
			},
		},
	}
	noBranch := modifier.GetCurrentOSSBranch(nobranchValues)
	assert.Equal(t, "main", noBranch)
}

func TestHelmValuesModifier_GetCurrentDockerSettings(t *testing.T) {
	modifier := NewHelmValuesModifier()

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

	docker := modifier.GetCurrentDockerSettings(values)
	assert.Equal(t, "myuser", docker.Username)
	assert.Equal(t, "mypass", docker.Password)
	assert.Equal(t, "my@example.com", docker.Email)

	// Test with no registry section - should return defaults
	emptyValues := make(map[string]interface{})
	defaultDocker := modifier.GetCurrentDockerSettings(emptyValues)
	assert.Equal(t, "default", defaultDocker.Username)
	assert.Equal(t, "****", defaultDocker.Password)
	assert.Equal(t, "default@example.com", defaultDocker.Email)

	// Test with registry but no docker section - should return defaults
	noDockerValues := map[string]interface{}{
		"registry": map[string]interface{}{
			"ghcr": map[string]interface{}{
				"username": "ghcruser",
			},
		},
	}
	noDocker := modifier.GetCurrentDockerSettings(noDockerValues)
	assert.Equal(t, "default", noDocker.Username)
	assert.Equal(t, "****", noDocker.Password)
	assert.Equal(t, "default@example.com", noDocker.Email)
}

func TestHelmValuesModifier_ApplyConfiguration_Branch(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Prepare initial values with deployment structure
	values := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"repository": map[string]interface{}{
					"branch": "main",
				},
			},
		},
	}

	// Create configuration with new branch for OSS deployment
	newBranch := "develop"
	deploymentMode := types.DeploymentModeOSS
	config := &types.ChartConfiguration{
		Branch:           &newBranch,
		DeploymentMode:   &deploymentMode,
		ModifiedSections: []string{"branch"},
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(values, config)
	assert.NoError(t, err)

	// Verify changes in deployment structure
	deployment := values["deployment"].(map[string]interface{})
	oss := deployment["oss"].(map[string]interface{})
	repository := oss["repository"].(map[string]interface{})
	assert.Equal(t, "develop", repository["branch"])
}

func TestHelmValuesModifier_ApplyConfiguration_Branch_NoDeployment(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Prepare values without deployment section
	values := map[string]interface{}{
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "test",
			},
		},
	}

	// Create configuration with new branch for OSS deployment
	newBranch := "develop"
	deploymentMode := types.DeploymentModeOSS
	config := &types.ChartConfiguration{
		Branch:           &newBranch,
		DeploymentMode:   &deploymentMode,
		ModifiedSections: []string{"branch"},
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(values, config)
	assert.NoError(t, err)

	// Verify deployment structure was created
	deployment, ok := values["deployment"].(map[string]interface{})
	assert.True(t, ok)
	oss, ok := deployment["oss"].(map[string]interface{})
	assert.True(t, ok)
	repository, ok := oss["repository"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "develop", repository["branch"])
}

func TestHelmValuesModifier_ApplyConfiguration_Docker(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Prepare initial values
	values := map[string]interface{}{
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "olduser",
				"password": "oldpass",
				"email":    "old@example.com",
			},
		},
	}

	// Create configuration with new Docker settings
	dockerConfig := &types.DockerRegistryConfig{
		Username: "newuser",
		Password: "newpass",
		Email:    "new@example.com",
	}
	config := &types.ChartConfiguration{
		DockerRegistry:   dockerConfig,
		ModifiedSections: []string{"docker"},
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(values, config)
	assert.NoError(t, err)

	// Verify changes
	registry := values["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "newuser", docker["username"])
	assert.Equal(t, "newpass", docker["password"])
	assert.Equal(t, "new@example.com", docker["email"])
}

func TestHelmValuesModifier_ApplyConfiguration_Docker_NoRegistry(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Prepare values without registry section
	values := map[string]interface{}{
		"deployment": map[string]interface{}{
			"ingress": map[string]interface{}{
				"enabled": true,
			},
		},
	}

	// Create configuration with new Docker settings
	dockerConfig := &types.DockerRegistryConfig{
		Username: "newuser",
		Password: "newpass",
		Email:    "new@example.com",
	}
	config := &types.ChartConfiguration{
		DockerRegistry:   dockerConfig,
		ModifiedSections: []string{"docker"},
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(values, config)
	assert.NoError(t, err)

	// Verify registry and docker sections were created
	registry, ok := values["registry"].(map[string]interface{})
	assert.True(t, ok)
	docker, ok := registry["docker"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "newuser", docker["username"])
	assert.Equal(t, "newpass", docker["password"])
	assert.Equal(t, "new@example.com", docker["email"])
}

func TestHelmValuesModifier_ApplyConfiguration_NoChanges(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Prepare initial values
	originalValues := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "main",
			"repoURL":    "https://github.com/test/repo.git",
		},
	}
	values := make(map[string]interface{})
	for k, v := range originalValues {
		values[k] = v
	}

	// Create configuration with no changes
	config := &types.ChartConfiguration{
		Branch:           nil,
		DockerRegistry:   nil,
		ModifiedSections: []string{},
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(values, config)
	assert.NoError(t, err)

	// Verify no changes
	assert.Equal(t, originalValues, values)
}

func TestHelmValuesModifier_WriteValues(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Prepare test values
	values := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "develop",
			"repoURL":    "https://github.com/test/repo.git",
		},
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "testuser",
				"password": "testpass",
				"email":    "test@example.com",
			},
		},
	}

	// Create temporary file
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "output-values.yaml")

	// Write values
	err := modifier.WriteValues(values, testFile)
	assert.NoError(t, err)

	// Verify file exists and can be read back
	data, err := os.ReadFile(testFile)
	assert.NoError(t, err)
	assert.NotEmpty(t, data)

	// Verify content can be parsed back
	loadedValues, err := modifier.LoadExistingValues(testFile)
	assert.NoError(t, err)

	// Verify structure matches
	global := loadedValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", global["repoBranch"])

	registry := loadedValues["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "testuser", docker["username"])
}

func TestHelmValuesModifier_WriteValues_InvalidPath(t *testing.T) {
	modifier := NewHelmValuesModifier()

	values := map[string]interface{}{
		"test": "value",
	}

	// Test writing to invalid path
	err := modifier.WriteValues(values, "/invalid/path/that/does/not/exist/values.yaml")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to write updated helm values file")
}

func TestHelmValuesModifier_GetCurrentIngressSettings(t *testing.T) {
	modifier := NewHelmValuesModifier()

	// Test with ngrok enabled
	valuesWithNgrok := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"ingress": map[string]interface{}{
					"ngrok": map[string]interface{}{
						"enabled": true,
					},
					"localhost": map[string]interface{}{
						"enabled": false,
					},
				},
			},
		},
	}

	ingress := modifier.GetCurrentIngressSettings(valuesWithNgrok)
	assert.Equal(t, "ngrok", ingress)

	// Test with localhost enabled
	valuesWithLocalhost := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"ingress": map[string]interface{}{
					"localhost": map[string]interface{}{
						"enabled": true,
					},
					"ngrok": map[string]interface{}{
						"enabled": false,
					},
				},
			},
		},
	}

	ingress = modifier.GetCurrentIngressSettings(valuesWithLocalhost)
	assert.Equal(t, "localhost", ingress)

	// Test with no deployment section - should return default
	emptyValues := make(map[string]interface{})
	defaultIngress := modifier.GetCurrentIngressSettings(emptyValues)
	assert.Equal(t, "localhost", defaultIngress)

	// Test with deployment but no ingress section - should return default
	noIngressValues := map[string]interface{}{
		"deployment": map[string]interface{}{
			"oss": map[string]interface{}{
				"enabled": true,
			},
		},
	}
	noIngress := modifier.GetCurrentIngressSettings(noIngressValues)
	assert.Equal(t, "localhost", noIngress)
}
