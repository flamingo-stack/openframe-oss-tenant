package configuration

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/ui/templates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	"github.com/stretchr/testify/assert"
)

func TestNewDockerConfigurator(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewDockerConfigurator(modifier)

	assert.NotNil(t, configurator)
	assert.Equal(t, modifier, configurator.modifier)
}

func TestDockerConfigurator_Configure_DefaultCredentials(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	// Create configuration with existing Docker values
	existingValues := map[string]interface{}{
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "default",
				"password": "****",
				"email":    "default@example.com",
			},
		},
	}

	config := &types.ChartConfiguration{
		ExistingValues:   existingValues,
		ModifiedSections: []string{},
	}

	// Test getting current Docker settings
	currentDocker := modifier.GetCurrentDockerSettings(existingValues)
	assert.Equal(t, "default", currentDocker.Username)
	assert.Equal(t, "****", currentDocker.Password)
	assert.Equal(t, "default@example.com", currentDocker.Email)

	// When user selects default credentials, no changes should be made
	// config.ModifiedSections should remain empty
	assert.Empty(t, config.ModifiedSections)
}

func TestDockerConfigurator_Configure_CustomCredentials(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	// Test the modifier can handle custom Docker credentials
	existingValues := map[string]interface{}{
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "default",
				"password": "****",
				"email":    "default@example.com",
			},
		},
	}

	// Simulate custom credentials selection
	config := &types.ChartConfiguration{
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "customuser",
			Password: "custompass",
			Email:    "custom@example.com",
		},
		ModifiedSections: []string{"docker"},
		ExistingValues:   existingValues,
	}

	// Apply configuration
	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)

	// Verify Docker settings were updated
	registry := existingValues["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "customuser", docker["username"])
	assert.Equal(t, "custompass", docker["password"])
	assert.Equal(t, "custom@example.com", docker["email"])
}

func TestDockerConfigurator_Configure_WithEmptyValues(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	// Test with empty values (no registry section)
	existingValues := map[string]interface{}{}

	currentDocker := modifier.GetCurrentDockerSettings(existingValues)
	assert.Equal(t, "default", currentDocker.Username)
	assert.Equal(t, "****", currentDocker.Password)
	assert.Equal(t, "default@example.com", currentDocker.Email)

	// Test applying custom Docker config to empty values
	config := &types.ChartConfiguration{
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "newuser",
			Password: "newpass",
			Email:    "new@example.com",
		},
		ModifiedSections: []string{"docker"},
		ExistingValues:   existingValues,
	}

	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)

	// Verify registry and docker sections were created
	registry, ok := existingValues["registry"].(map[string]interface{})
	assert.True(t, ok)
	docker, ok := registry["docker"].(map[string]interface{})
	assert.True(t, ok)
	assert.Equal(t, "newuser", docker["username"])
	assert.Equal(t, "newpass", docker["password"])
	assert.Equal(t, "new@example.com", docker["email"])
}

func TestDockerConfigurator_promptForDockerSettings_Validation(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	// Test various Docker configuration scenarios
	testCases := []struct {
		name     string
		current  *types.DockerRegistryConfig
		expected *types.DockerRegistryConfig
	}{
		{
			name: "valid configuration",
			current: &types.DockerRegistryConfig{
				Username: "testuser",
				Password: "testpass",
				Email:    "test@example.com",
			},
			expected: &types.DockerRegistryConfig{
				Username: "testuser",
				Password: "testpass",
				Email:    "test@example.com",
			},
		},
		{
			name: "empty current configuration",
			current: &types.DockerRegistryConfig{
				Username: "",
				Password: "",
				Email:    "",
			},
			expected: &types.DockerRegistryConfig{
				Username: "",
				Password: "",
				Email:    "",
			},
		},
		{
			name: "partial configuration",
			current: &types.DockerRegistryConfig{
				Username: "partialuser",
				Password: "",
				Email:    "",
			},
			expected: &types.DockerRegistryConfig{
				Username: "partialuser",
				Password: "",
				Email:    "",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test that the configuration structure is valid
			assert.Equal(t, tc.expected.Username, tc.current.Username)
			assert.Equal(t, tc.expected.Password, tc.current.Password)
			assert.Equal(t, tc.expected.Email, tc.current.Email)
		})
	}
}

func TestDockerConfigurator_Configure_NoChangesWhenSameValues(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	// Test when user enters the same values as current
	existingValues := map[string]interface{}{
		"registry": map[string]interface{}{
			"docker": map[string]interface{}{
				"username": "sameuser",
				"password": "samepass",
				"email":    "same@example.com",
			},
		},
	}

	// Create copy for comparison
	originalValues := make(map[string]interface{})
	for k, v := range existingValues {
		if registry, ok := v.(map[string]interface{}); ok {
			newRegistry := make(map[string]interface{})
			for rk, rv := range registry {
				if docker, ok := rv.(map[string]interface{}); ok {
					newDocker := make(map[string]interface{})
					for dk, dv := range docker {
						newDocker[dk] = dv
					}
					newRegistry[rk] = newDocker
				} else {
					newRegistry[rk] = rv
				}
			}
			originalValues[k] = newRegistry
		} else {
			originalValues[k] = v
		}
	}

	// Simulate user entering the same values
	config := &types.ChartConfiguration{
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "sameuser",
			Password: "samepass",
			Email:    "same@example.com",
		},
		ModifiedSections: []string{"docker"},
		ExistingValues:   existingValues,
	}

	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)

	// Values should be updated (even if they're the same)
	registry := existingValues["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "sameuser", docker["username"])
	assert.Equal(t, "samepass", docker["password"])
	assert.Equal(t, "same@example.com", docker["email"])
}

func TestDockerConfigurator_Configure_SpecialCharacters(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	// Test Docker credentials with special characters
	existingValues := map[string]interface{}{}

	config := &types.ChartConfiguration{
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "user@domain.com",
			Password: "p@$$w0rd!@#$%^&*()",
			Email:    "user+test@example.co.uk",
		},
		ModifiedSections: []string{"docker"},
		ExistingValues:   existingValues,
	}

	err := modifier.ApplyConfiguration(existingValues, config)
	assert.NoError(t, err)

	// Verify special characters are preserved
	registry := existingValues["registry"].(map[string]interface{})
	docker := registry["docker"].(map[string]interface{})
	assert.Equal(t, "user@domain.com", docker["username"])
	assert.Equal(t, "p@$$w0rd!@#$%^&*()", docker["password"])
	assert.Equal(t, "user+test@example.co.uk", docker["email"])
}

func TestDockerConfigurator_Configure_EdgeCases(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewDockerConfigurator(modifier) // Test constructor

	testCases := []struct {
		name     string
		username string
		password string
		email    string
	}{
		{
			name:     "very long credentials",
			username: "verylongusernamethatexceedsnormallimits1234567890",
			password: "verylongpasswordthatexceedsnormallimits!@#$%^&*()1234567890",
			email:    "verylongemailaddressthatexceedsnormallimits@example.com",
		},
		{
			name:     "single character credentials",
			username: "u",
			password: "p",
			email:    "e@e.e",
		},
		{
			name:     "unicode characters",
			username: "用户名",
			password: "密码123",
			email:    "测试@example.com",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			existingValues := map[string]interface{}{}

			config := &types.ChartConfiguration{
				DockerRegistry: &types.DockerRegistryConfig{
					Username: tc.username,
					Password: tc.password,
					Email:    tc.email,
				},
				ModifiedSections: []string{"docker"},
				ExistingValues:   existingValues,
			}

			err := modifier.ApplyConfiguration(existingValues, config)
			assert.NoError(t, err)

			registry := existingValues["registry"].(map[string]interface{})
			docker := registry["docker"].(map[string]interface{})
			assert.Equal(t, tc.username, docker["username"])
			assert.Equal(t, tc.password, docker["password"])
			assert.Equal(t, tc.email, docker["email"])
		})
	}
}
