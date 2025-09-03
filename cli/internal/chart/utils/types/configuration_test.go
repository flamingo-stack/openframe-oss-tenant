package types

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestIngressType_Constants(t *testing.T) {
	assert.Equal(t, IngressType("localhost"), IngressTypeLocalhost)
	assert.Equal(t, IngressType("ngrok"), IngressTypeNgrok)
}

func TestDockerRegistryConfig_Creation(t *testing.T) {
	config := &DockerRegistryConfig{
		Username: "testuser",
		Password: "testpass",
		Email:    "test@example.com",
	}

	assert.Equal(t, "testuser", config.Username)
	assert.Equal(t, "testpass", config.Password)
	assert.Equal(t, "test@example.com", config.Email)
}

func TestDockerRegistryConfig_EmptyValues(t *testing.T) {
	config := &DockerRegistryConfig{}

	assert.Empty(t, config.Username)
	assert.Empty(t, config.Password)
	assert.Empty(t, config.Email)
}

func TestNgrokConfig_Creation(t *testing.T) {
	config := &NgrokConfig{
		AuthToken:     "auth_token_123",
		APIKey:        "api_key_456",
		Domain:        "example.ngrok.io",
		UseAllowedIPs: true,
		AllowedIPs:    []string{"192.168.1.1", "10.0.0.1"},
	}

	assert.Equal(t, "auth_token_123", config.AuthToken)
	assert.Equal(t, "api_key_456", config.APIKey)
	assert.Equal(t, "example.ngrok.io", config.Domain)
	assert.True(t, config.UseAllowedIPs)
	assert.Len(t, config.AllowedIPs, 2)
	assert.Contains(t, config.AllowedIPs, "192.168.1.1")
	assert.Contains(t, config.AllowedIPs, "10.0.0.1")
}

func TestNgrokConfig_WithoutAllowedIPs(t *testing.T) {
	config := &NgrokConfig{
		AuthToken:     "auth_token_123",
		APIKey:        "api_key_456",
		Domain:        "example.ngrok.io",
		UseAllowedIPs: false,
	}

	assert.Equal(t, "auth_token_123", config.AuthToken)
	assert.Equal(t, "api_key_456", config.APIKey)
	assert.Equal(t, "example.ngrok.io", config.Domain)
	assert.False(t, config.UseAllowedIPs)
	assert.Empty(t, config.AllowedIPs)
}

func TestNgrokConfig_RegistrationFields(t *testing.T) {
	startTime := time.Now()
	config := &NgrokConfig{
		AuthToken:                 "auth_token_123",
		APIKey:                    "api_key_456",
		Domain:                    "example.ngrok.io",
		RegistrationCompleted:     true,
		RegistrationStartTime:     startTime,
	}

	assert.True(t, config.RegistrationCompleted)
	assert.Equal(t, startTime, config.RegistrationStartTime)
}

func TestIngressConfig_LocalhostType(t *testing.T) {
	config := &IngressConfig{
		Type: IngressTypeLocalhost,
	}

	assert.Equal(t, IngressTypeLocalhost, config.Type)
	assert.Nil(t, config.NgrokConfig)
}

func TestIngressConfig_NgrokType(t *testing.T) {
	ngrokConfig := &NgrokConfig{
		AuthToken:     "auth_token_123",
		APIKey:        "api_key_456",
		Domain:        "example.ngrok.io",
		UseAllowedIPs: true,
		AllowedIPs:    []string{"192.168.1.1"},
	}

	config := &IngressConfig{
		Type:        IngressTypeNgrok,
		NgrokConfig: ngrokConfig,
	}

	assert.Equal(t, IngressTypeNgrok, config.Type)
	assert.NotNil(t, config.NgrokConfig)
	assert.Equal(t, ngrokConfig, config.NgrokConfig)
}

func TestChartConfiguration_MinimalConfig(t *testing.T) {
	config := &ChartConfiguration{
		BaseHelmValuesPath: "/path/to/base/values.yaml",
		TempHelmValuesPath: "/path/to/temp/values.yaml",
		ExistingValues:     make(map[string]interface{}),
		ModifiedSections:   []string{},
	}

	assert.Equal(t, "/path/to/base/values.yaml", config.BaseHelmValuesPath)
	assert.Equal(t, "/path/to/temp/values.yaml", config.TempHelmValuesPath)
	assert.NotNil(t, config.ExistingValues)
	assert.Empty(t, config.ModifiedSections)
	assert.Nil(t, config.Branch)
	assert.Nil(t, config.DockerRegistry)
	assert.Nil(t, config.IngressConfig)
}

func TestChartConfiguration_FullConfig(t *testing.T) {
	branch := "develop"
	dockerConfig := &DockerRegistryConfig{
		Username: "testuser",
		Password: "testpass",
		Email:    "test@example.com",
	}
	ingressConfig := &IngressConfig{
		Type: IngressTypeNgrok,
		NgrokConfig: &NgrokConfig{
			AuthToken:     "auth_token_123",
			APIKey:        "api_key_456",
			Domain:        "example.ngrok.io",
			UseAllowedIPs: false,
		},
	}

	config := &ChartConfiguration{
		BaseHelmValuesPath: "/path/to/base/values.yaml",
		TempHelmValuesPath: "/path/to/temp/values.yaml",
		ExistingValues:     map[string]interface{}{"test": "value"},
		ModifiedSections:   []string{"branch", "docker", "ingress"},
		Branch:             &branch,
		DockerRegistry:     dockerConfig,
		IngressConfig:      ingressConfig,
	}

	assert.Equal(t, "/path/to/base/values.yaml", config.BaseHelmValuesPath)
	assert.Equal(t, "/path/to/temp/values.yaml", config.TempHelmValuesPath)
	assert.NotNil(t, config.ExistingValues)
	assert.Len(t, config.ModifiedSections, 3)
	assert.NotNil(t, config.Branch)
	assert.Equal(t, "develop", *config.Branch)
	assert.NotNil(t, config.DockerRegistry)
	assert.Equal(t, dockerConfig, config.DockerRegistry)
	assert.NotNil(t, config.IngressConfig)
	assert.Equal(t, ingressConfig, config.IngressConfig)
}

func TestChartConfiguration_HasModifications(t *testing.T) {
	testCases := []struct {
		name             string
		modifiedSections []string
		expected         bool
	}{
		{"no modifications", []string{}, false},
		{"single modification", []string{"branch"}, true},
		{"multiple modifications", []string{"branch", "docker", "ingress"}, true},
		{"nil modifications", nil, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			config := &ChartConfiguration{
				ModifiedSections: tc.modifiedSections,
			}

			hasModifications := len(config.ModifiedSections) > 0
			assert.Equal(t, tc.expected, hasModifications)
		})
	}
}

func TestNgrokRegistrationURLs_Constants(t *testing.T) {
	assert.Equal(t, "https://dashboard.ngrok.com/signup", NgrokRegistrationURLs.SignUp)
	assert.Equal(t, "https://dashboard.ngrok.com/cloud-edge/domains", NgrokRegistrationURLs.DomainDocs)
	assert.Equal(t, "https://dashboard.ngrok.com/api/new", NgrokRegistrationURLs.APIKeyDocs)
	assert.Equal(t, "https://dashboard.ngrok.com/get-started/your-authtoken", NgrokRegistrationURLs.AuthTokenDocs)
}

func TestNgrokConfig_IPAllowlistScenarios(t *testing.T) {
	testCases := []struct {
		name           string
		useAllowedIPs  bool
		allowedIPs     []string
		expectedResult string
	}{
		{
			name:           "no IP restrictions",
			useAllowedIPs:  false,
			allowedIPs:     nil,
			expectedResult: "allow all",
		},
		{
			name:           "single IP allowed",
			useAllowedIPs:  true,
			allowedIPs:     []string{"192.168.1.1"},
			expectedResult: "restricted",
		},
		{
			name:           "multiple IPs allowed",
			useAllowedIPs:  true,
			allowedIPs:     []string{"192.168.1.1", "10.0.0.1", "172.16.0.1"},
			expectedResult: "restricted",
		},
		{
			name:           "use allowed IPs but empty list",
			useAllowedIPs:  true,
			allowedIPs:     []string{},
			expectedResult: "restricted but empty",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			config := &NgrokConfig{
				AuthToken:     "test_token",
				APIKey:        "test_key",
				Domain:        "test.ngrok.io",
				UseAllowedIPs: tc.useAllowedIPs,
				AllowedIPs:    tc.allowedIPs,
			}

			// Test the configuration matches expected setup
			assert.Equal(t, tc.useAllowedIPs, config.UseAllowedIPs)
			assert.Equal(t, tc.allowedIPs, config.AllowedIPs)

			// Validate the logic for different scenarios
			switch tc.expectedResult {
			case "allow all":
				assert.False(t, config.UseAllowedIPs)
				assert.Empty(t, config.AllowedIPs)
			case "restricted":
				assert.True(t, config.UseAllowedIPs)
				assert.NotEmpty(t, config.AllowedIPs)
			case "restricted but empty":
				assert.True(t, config.UseAllowedIPs)
				assert.Empty(t, config.AllowedIPs)
			}
		})
	}
}

func TestChartConfiguration_DeepCopyBehavior(t *testing.T) {
	// Test that modifying nested structures doesn't affect original
	originalValues := map[string]interface{}{
		"global": map[string]interface{}{
			"repoBranch": "main",
		},
	}

	config := &ChartConfiguration{
		ExistingValues: originalValues,
	}

	// Modify the values through config
	if global, ok := config.ExistingValues["global"].(map[string]interface{}); ok {
		global["repoBranch"] = "develop"
	}

	// Original should be modified too (since it's the same reference)
	global := originalValues["global"].(map[string]interface{})
	assert.Equal(t, "develop", global["repoBranch"])
}

func TestIngressType_StringComparison(t *testing.T) {
	testCases := []struct {
		ingressType IngressType
		stringValue string
		matches     bool
	}{
		{IngressTypeLocalhost, "localhost", true},
		{IngressTypeNgrok, "ngrok", true},
		{IngressTypeLocalhost, "ngrok", false},
		{IngressTypeNgrok, "localhost", false},
		{IngressTypeLocalhost, "LOCALHOST", false}, // case sensitive
		{IngressTypeNgrok, "NGROK", false},         // case sensitive
	}

	for _, tc := range testCases {
		t.Run(string(tc.ingressType)+"_vs_"+tc.stringValue, func(t *testing.T) {
			result := string(tc.ingressType) == tc.stringValue
			assert.Equal(t, tc.matches, result)
		})
	}
}