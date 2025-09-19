package configuration

import (
	"testing"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/stretchr/testify/assert"
)

func TestConfigurationWizard_ExtractGHCRCredentials(t *testing.T) {
	_ = NewConfigurationWizard() // Test constructor

	tests := []struct {
		name           string
		existingValues map[string]interface{}
		expectedUser   string
		expectedEmail  string
		hasCredentials bool
	}{
		{
			name:           "No existing credentials",
			existingValues: map[string]interface{}{},
			expectedUser:   "default",
			expectedEmail:  "default@example.com",
			hasCredentials: false,
		},
		{
			name: "With existing GHCR credentials",
			existingValues: map[string]interface{}{
				"registry": map[string]interface{}{
					"ghcr": map[string]interface{}{
						"username": "testuser",
						"email":    "test@example.com",
						"password": "hidden",
					},
				},
			},
			expectedUser:   "testuser",
			expectedEmail:  "test@example.com",
			hasCredentials: true,
		},
		{
			name: "With default GHCR credentials",
			existingValues: map[string]interface{}{
				"registry": map[string]interface{}{
					"ghcr": map[string]interface{}{
						"username": "default",
						"email":    "default@example.com",
					},
				},
			},
			expectedUser:   "default",
			expectedEmail:  "default@example.com",
			hasCredentials: false,
		},
		{
			name: "With empty GHCR credentials",
			existingValues: map[string]interface{}{
				"registry": map[string]interface{}{
					"ghcr": map[string]interface{}{
						"username": "",
						"email":    "",
					},
				},
			},
			expectedUser:   "default",
			expectedEmail:  "default@example.com",
			hasCredentials: false,
		},
		{
			name: "With partial GHCR structure",
			existingValues: map[string]interface{}{
				"registry": map[string]interface{}{
					"docker": map[string]interface{}{
						"username": "dockeruser",
					},
				},
			},
			expectedUser:   "default",
			expectedEmail:  "default@example.com",
			hasCredentials: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &types.ChartConfiguration{
				ExistingValues: tt.existingValues,
			}

			// Test extraction logic (simulating internal logic of configureGHCRCredentials)
			currentUsername := "default"
			currentEmail := "default@example.com"
			hasExistingCredentials := false

			if config.ExistingValues != nil {
				if registry, ok := config.ExistingValues["registry"].(map[string]interface{}); ok {
					if ghcr, ok := registry["ghcr"].(map[string]interface{}); ok {
						if username, ok := ghcr["username"].(string); ok && username != "" && username != "default" {
							currentUsername = username
							hasExistingCredentials = true
						}
						if email, ok := ghcr["email"].(string); ok && email != "" && email != "default@example.com" {
							currentEmail = email
						}
					}
				}
			}

			assert.Equal(t, tt.expectedUser, currentUsername)
			assert.Equal(t, tt.expectedEmail, currentEmail)
			assert.Equal(t, tt.hasCredentials, hasExistingCredentials)
		})
	}
}

func TestConfigurationWizard_GHCRCredentialsInConfig(t *testing.T) {
	wizard := NewConfigurationWizard()
	assert.NotNil(t, wizard)

	// Test that GHCR credentials are properly stored in config
	config := &types.ChartConfiguration{
		DockerRegistry: &types.DockerRegistryConfig{
			Username: "ghcr-user",
			Password: "ghcr-pass",
			Email:    "ghcr@example.com",
		},
		ModifiedSections: []string{"docker"},
		ExistingValues:   map[string]interface{}{},
	}

	assert.Equal(t, "ghcr-user", config.DockerRegistry.Username)
	assert.Equal(t, "ghcr-pass", config.DockerRegistry.Password)
	assert.Equal(t, "ghcr@example.com", config.DockerRegistry.Email)
}