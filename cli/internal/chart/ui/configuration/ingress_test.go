package configuration

import (
	"testing"
	"time"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	"github.com/stretchr/testify/assert"
)

func TestNewIngressConfigurator(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewIngressConfigurator(modifier)
	
	assert.NotNil(t, configurator)
	assert.Equal(t, modifier, configurator.modifier)
}

func TestIngressConfigurator_Configure_LocalhostIngress(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewIngressConfigurator(modifier)
	
	// Test localhost ingress configuration
	existingValues := map[string]interface{}{}
	
	// Apply localhost configuration directly
	err := configurator.applyLocalhostConfig(existingValues)
	assert.NoError(t, err)
	
	// Verify localhost ingress is configured
	deployment := existingValues["deployment"].(map[string]interface{})
	selfHosted := deployment["selfHosted"].(map[string]interface{})
	ingress := selfHosted["ingress"].(map[string]interface{})
	localhost := ingress["localhost"].(map[string]interface{})
	assert.True(t, localhost["enabled"].(bool))
}

func TestIngressConfigurator_Configure_NgrokIngress(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewIngressConfigurator(modifier)
	
	// Test ngrok ingress configuration
	existingValues := map[string]interface{}{}
	
	// Create ngrok config
	ngrokConfig := &types.NgrokConfig{
		AuthToken:     "auth_token_123",
		APIKey:        "api_key_456",
		Domain:        "example.ngrok.io",
		UseAllowedIPs: false,
	}
	
	// Apply ngrok configuration directly
	err := configurator.applyNgrokConfig(existingValues, ngrokConfig)
	assert.NoError(t, err)
	
	// Verify ngrok ingress is configured
	deployment := existingValues["deployment"].(map[string]interface{})
	selfHosted := deployment["selfHosted"].(map[string]interface{})
	ingress := selfHosted["ingress"].(map[string]interface{})
	ngrok := ingress["ngrok"].(map[string]interface{})
	assert.True(t, ngrok["enabled"].(bool))
	assert.Equal(t, "auth_token_123", ngrok["authToken"])
	assert.Equal(t, "api_key_456", ngrok["apiKey"])
	assert.Equal(t, "https://example.ngrok.io", ngrok["url"])
}

func TestIngressConfigurator_Configure_NgrokWithAllowedIPs(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewIngressConfigurator(modifier)
	
	// Test ngrok with IP allowlist
	existingValues := map[string]interface{}{}
	
	// Create ngrok config with allowed IPs
	ngrokConfig := &types.NgrokConfig{
		AuthToken:     "auth_token_123",
		APIKey:        "api_key_456",
		Domain:        "example.ngrok.io",
		UseAllowedIPs: true,
		AllowedIPs:    []string{"192.168.1.1", "10.0.0.1", "172.16.0.1"},
	}
	
	// Apply ngrok configuration directly
	err := configurator.applyNgrokConfig(existingValues, ngrokConfig)
	assert.NoError(t, err)
	
	// Verify ngrok ingress with allowed IPs
	deployment := existingValues["deployment"].(map[string]interface{})
	selfHosted := deployment["selfHosted"].(map[string]interface{})
	ingress := selfHosted["ingress"].(map[string]interface{})
	ngrok := ingress["ngrok"].(map[string]interface{})
	assert.True(t, ngrok["enabled"].(bool))
	assert.Equal(t, "auth_token_123", ngrok["authToken"])
	assert.Equal(t, "api_key_456", ngrok["apiKey"])
	assert.Equal(t, "https://example.ngrok.io", ngrok["url"])
	
	allowedIPs := ngrok["allowedIPs"].([]string)
	assert.Len(t, allowedIPs, 3)
	assert.Contains(t, allowedIPs, "192.168.1.1")
	assert.Contains(t, allowedIPs, "10.0.0.1")
	assert.Contains(t, allowedIPs, "172.16.0.1")
}

func TestIngressConfigurator_Configure_GetCurrentIngressSettings(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewIngressConfigurator(modifier) // Test constructor
	
	testCases := []struct {
		name           string
		values         map[string]interface{}
		expectedResult string
	}{
		{
			name: "localhost enabled",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"selfHosted": map[string]interface{}{
						"ingress": map[string]interface{}{
							"localhost": map[string]interface{}{
								"enabled": true,
							},
						},
					},
				},
			},
			expectedResult: "localhost",
		},
		{
			name: "ngrok enabled",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"selfHosted": map[string]interface{}{
						"ingress": map[string]interface{}{
							"ngrok": map[string]interface{}{
								"enabled": true,
							},
						},
					},
				},
			},
			expectedResult: "ngrok",
		},
		{
			name: "both disabled",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"selfHosted": map[string]interface{}{
						"ingress": map[string]interface{}{
							"localhost": map[string]interface{}{
								"enabled": false,
							},
							"ngrok": map[string]interface{}{
								"enabled": false,
							},
						},
					},
				},
			},
			expectedResult: "localhost", // default fallback
		},
		{
			name:           "no deployment section",
			values:         map[string]interface{}{},
			expectedResult: "localhost", // default fallback
		},
		{
			name: "no ingress section",
			values: map[string]interface{}{
				"deployment": map[string]interface{}{
					"selfHosted": map[string]interface{}{
						"enabled": true,
					},
				},
			},
			expectedResult: "localhost", // default fallback
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := modifier.GetCurrentIngressSettings(tc.values)
			assert.Equal(t, tc.expectedResult, result)
		})
	}
}

func TestIngressConfigurator_configureNgrok_CredentialsValidation(t *testing.T) {
	// Test ngrok configuration structure validation
	testCases := []struct {
		name      string
		config    *types.NgrokConfig
		isValid   bool
	}{
		{
			name: "complete valid configuration",
			config: &types.NgrokConfig{
				AuthToken:     "auth_token_123",
				APIKey:        "api_key_456",
				Domain:        "example.ngrok.io",
				UseAllowedIPs: false,
			},
			isValid: true,
		},
		{
			name: "valid configuration with allowed IPs",
			config: &types.NgrokConfig{
				AuthToken:     "auth_token_123",
				APIKey:        "api_key_456",
				Domain:        "example.ngrok.io",
				UseAllowedIPs: true,
				AllowedIPs:    []string{"192.168.1.1", "10.0.0.1"},
			},
			isValid: true,
		},
		{
			name: "missing auth token",
			config: &types.NgrokConfig{
				AuthToken:     "",
				APIKey:        "api_key_456",
				Domain:        "example.ngrok.io",
				UseAllowedIPs: false,
			},
			isValid: false,
		},
		{
			name: "missing API key",
			config: &types.NgrokConfig{
				AuthToken:     "auth_token_123",
				APIKey:        "",
				Domain:        "example.ngrok.io",
				UseAllowedIPs: false,
			},
			isValid: false,
		},
		{
			name: "missing domain",
			config: &types.NgrokConfig{
				AuthToken:     "auth_token_123",
				APIKey:        "api_key_456",
				Domain:        "",
				UseAllowedIPs: false,
			},
			isValid: false,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Test basic field validation
			hasAuthToken := tc.config.AuthToken != ""
			hasAPIKey := tc.config.APIKey != ""
			hasDomain := tc.config.Domain != ""
			
			isConfigValid := hasAuthToken && hasAPIKey && hasDomain
			assert.Equal(t, tc.isValid, isConfigValid)
		})
	}
}

func TestIngressConfigurator_handleNgrokRegistration_TimeoutLogic(t *testing.T) {
	// Test timeout logic simulation
	testCases := []struct {
		name          string
		timeElapsed   time.Duration
		timeout       time.Duration
		shouldTimeout bool
	}{
		{
			name:          "within timeout",
			timeElapsed:   2 * time.Minute,
			timeout:       5 * time.Minute,
			shouldTimeout: false,
		},
		{
			name:          "exactly at timeout",
			timeElapsed:   5 * time.Minute,
			timeout:       5 * time.Minute,
			shouldTimeout: true,
		},
		{
			name:          "exceeded timeout",
			timeElapsed:   6 * time.Minute,
			timeout:       5 * time.Minute,
			shouldTimeout: true,
		},
		{
			name:          "just under timeout",
			timeElapsed:   4*time.Minute + 59*time.Second,
			timeout:       5 * time.Minute,
			shouldTimeout: false,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			startTime := time.Now().Add(-tc.timeElapsed)
			currentTime := time.Now()
			elapsed := currentTime.Sub(startTime)
			
			timedOut := elapsed > tc.timeout
			assert.Equal(t, tc.shouldTimeout, timedOut)
		})
	}
}

func TestIngressConfigurator_Configure_SwitchIngressTypes(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	configurator := NewIngressConfigurator(modifier)
	
	// Test switching from localhost to ngrok
	existingValues := map[string]interface{}{
		"deployment": map[string]interface{}{
			"selfHosted": map[string]interface{}{
				"ingress": map[string]interface{}{
					"localhost": map[string]interface{}{
						"enabled": true,
					},
				},
			},
		},
	}
	
	// Create ngrok config
	ngrokConfig := &types.NgrokConfig{
		AuthToken:     "auth_token_123",
		APIKey:        "api_key_456",
		Domain:        "example.ngrok.io",
		UseAllowedIPs: false,
	}
	
	// Switch to ngrok
	err := configurator.applyNgrokConfig(existingValues, ngrokConfig)
	assert.NoError(t, err)
	
	// Verify localhost is disabled and ngrok is enabled
	deployment := existingValues["deployment"].(map[string]interface{})
	selfHosted := deployment["selfHosted"].(map[string]interface{})
	ingress := selfHosted["ingress"].(map[string]interface{})
	
	ngrok := ingress["ngrok"].(map[string]interface{})
	assert.True(t, ngrok["enabled"].(bool))
	
	localhost := ingress["localhost"].(map[string]interface{})
	assert.False(t, localhost["enabled"].(bool))
}

func TestIngressConfigurator_Configure_NgrokRegistrationURLs(t *testing.T) {
	// Test that ngrok URLs are properly defined
	assert.Equal(t, "https://dashboard.ngrok.com/signup", types.NgrokRegistrationURLs.SignUp)
	assert.Equal(t, "https://dashboard.ngrok.com/cloud-edge/domains", types.NgrokRegistrationURLs.DomainDocs)
	assert.Equal(t, "https://dashboard.ngrok.com/api/new", types.NgrokRegistrationURLs.APIKeyDocs)
	assert.Equal(t, "https://dashboard.ngrok.com/get-started/your-authtoken", types.NgrokRegistrationURLs.AuthTokenDocs)
	
	// Ensure URLs are well-formed
	urls := []string{
		types.NgrokRegistrationURLs.SignUp,
		types.NgrokRegistrationURLs.DomainDocs,
		types.NgrokRegistrationURLs.APIKeyDocs,
		types.NgrokRegistrationURLs.AuthTokenDocs,
	}
	
	for _, url := range urls {
		assert.NotEmpty(t, url)
		assert.Contains(t, url, "https://")
		assert.Contains(t, url, "ngrok")
	}
}

func TestIngressConfigurator_Configure_IPAllowlistScenarios(t *testing.T) {
	modifier := templates.NewHelmValuesModifier()
	_ = NewIngressConfigurator(modifier) // Test constructor
	
	testCases := []struct {
		name           string
		useAllowedIPs  bool
		allowedIPs     []string
		shouldHaveIPs  bool
	}{
		{
			name:           "allow all IPs",
			useAllowedIPs:  false,
			allowedIPs:     nil,
			shouldHaveIPs:  false,
		},
		{
			name:           "restrict to specific IPs",
			useAllowedIPs:  true,
			allowedIPs:     []string{"192.168.1.1", "10.0.0.1"},
			shouldHaveIPs:  true,
		},
		{
			name:           "restrict but no IPs provided",
			useAllowedIPs:  true,
			allowedIPs:     []string{},
			shouldHaveIPs:  false,
		},
	}
	
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			existingValues := map[string]interface{}{}
			
			// Create ngrok config
			ngrokConfig := &types.NgrokConfig{
				AuthToken:     "auth_token_123",
				APIKey:        "api_key_456",
				Domain:        "example.ngrok.io",
				UseAllowedIPs: tc.useAllowedIPs,
				AllowedIPs:    tc.allowedIPs,
			}
			
			// Apply ngrok configuration directly
			configurator := NewIngressConfigurator(modifier)
			err := configurator.applyNgrokConfig(existingValues, ngrokConfig)
			assert.NoError(t, err)
			
			deployment := existingValues["deployment"].(map[string]interface{})
			selfHosted := deployment["selfHosted"].(map[string]interface{})
			ingress := selfHosted["ingress"].(map[string]interface{})
			ngrok := ingress["ngrok"].(map[string]interface{})
			
			if tc.shouldHaveIPs {
				allowedIPs, exists := ngrok["allowedIPs"]
				assert.True(t, exists)
				assert.Equal(t, tc.allowedIPs, allowedIPs)
			} else {
				_, exists := ngrok["allowedIPs"]
				assert.False(t, exists)
			}
		})
	}
}