package configuration

import (
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/ui/templates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// IngressConfigurator handles ingress configuration including Ngrok setup
type IngressConfigurator struct {
	modifier *templates.HelmValuesModifier
}

// NewIngressConfigurator creates a new ingress configurator
func NewIngressConfigurator(modifier *templates.HelmValuesModifier) *IngressConfigurator {
	return &IngressConfigurator{
		modifier: modifier,
	}
}

// Configure asks user about ingress configuration
func (i *IngressConfigurator) Configure(config *types.ChartConfiguration) error {
	// Get current ingress settings from existing values
	currentIngress := i.modifier.GetCurrentIngressSettings(config.ExistingValues)

	pterm.Info.Printf("Ingress Configuration (current: %s)", currentIngress)

	// Choose options based on deployment mode
	var options []string
	isSaaS := config.DeploymentMode != nil && (*config.DeploymentMode == types.DeploymentModeSaaS || *config.DeploymentMode == types.DeploymentModeSaaSShared)

	if isSaaS {
		options = []string{
			"Use localhost for Local only visibility",
			"Use gcp for Cloud deployment",
		}
	} else {
		options = []string{
			"Use localhost for Local only visibility",
			"Use ngrok for External visibility",
		}
	}

	_, choice, err := sharedUI.SelectFromList("Ingress type", options)
	if err != nil {
		return fmt.Errorf("ingress choice failed: %w", err)
	}

	ingressConfig := &types.IngressConfig{}

	if strings.Contains(choice, "localhost") {
		ingressConfig.Type = types.IngressTypeLocalhost

		// Apply localhost configuration to helm values
		if err := i.applyLocalhostConfig(config.ExistingValues); err != nil {
			return fmt.Errorf("failed to apply localhost configuration: %w", err)
		}
	} else if strings.Contains(choice, "gcp") {
		ingressConfig.Type = types.IngressTypeGCP

		// Apply GCP configuration to helm values
		if err := i.applyGCPConfig(config.ExistingValues); err != nil {
			return fmt.Errorf("failed to apply GCP configuration: %w", err)
		}
	} else {
		// ngrok option (OSS deployment)
		ingressConfig.Type = types.IngressTypeNgrok

		// Configure Ngrok settings
		ngrokConfig, err := i.configureNgrok(config.ExistingValues)
		if err != nil {
			return fmt.Errorf("ngrok configuration failed: %w", err)
		}
		ingressConfig.NgrokConfig = ngrokConfig

		// Apply ngrok configuration to helm values
		if err := i.applyNgrokConfig(config.ExistingValues, ngrokConfig); err != nil {
			return fmt.Errorf("failed to apply ngrok configuration: %w", err)
		}
	}

	config.IngressConfig = ingressConfig
	config.ModifiedSections = append(config.ModifiedSections, "ingress")

	return nil
}

// configureNgrok handles the complete Ngrok setup flow
func (i *IngressConfigurator) configureNgrok(existingValues map[string]interface{}) (*types.NgrokConfig, error) {
	// Show registration info
	pterm.Warning.Printf("You need to register for an Ngrok account, please visit: %s\n", types.NgrokRegistrationURLs.SignUp)

	// Get current Ngrok settings
	currentNgrok := i.getCurrentNgrokSettings(existingValues)

	// Collect Ngrok credentials
	ngrokConfig, err := i.collectNgrokCredentials(currentNgrok)
	if err != nil {
		return nil, err
	}

	// Configure IP allowlist
	if err := i.configureNgrokIPAllowlist(ngrokConfig); err != nil {
		return nil, err
	}

	return ngrokConfig, nil
}

// getCurrentNgrokSettings extracts current Ngrok settings from existing values
func (i *IngressConfigurator) getCurrentNgrokSettings(values map[string]interface{}) *types.NgrokConfig {
	current := &types.NgrokConfig{}

	if deployment, ok := values["deployment"].(map[string]interface{}); ok {
		if oss, ok := deployment["oss"].(map[string]interface{}); ok {
			if ingress, ok := oss["ingress"].(map[string]interface{}); ok {
				if ngrok, ok := ingress["ngrok"].(map[string]interface{}); ok {
					// Extract URL/Domain
					if url, ok := ngrok["url"].(string); ok {
						current.Domain = url
					}

					// Extract credentials
					if credentials, ok := ngrok["credentials"].(map[string]interface{}); ok {
						if apiKey, ok := credentials["apiKey"].(string); ok {
							current.APIKey = apiKey
						}
						// Check both possible field names for auth token
						if authtoken, ok := credentials["authtoken"].(string); ok {
							current.AuthToken = authtoken
						} else if authtoken, ok := credentials["authtoken"].(string); ok {
							current.AuthToken = authtoken
						}
					}
				}
			}
		}
	}

	return current
}

// collectNgrokCredentials collects all required Ngrok credentials
func (i *IngressConfigurator) collectNgrokCredentials(current *types.NgrokConfig) (*types.NgrokConfig, error) {

	config := &types.NgrokConfig{}

	// Collect domain
	domainInput := pterm.DefaultInteractiveTextInput.WithMultiLine(false)
	if current.Domain != "" {
		domainInput = domainInput.WithDefaultValue(current.Domain)
	}
	domain, err := domainInput.Show("Create a New Domain at https://dashboard.ngrok.com/domains")
	if err != nil {
		return nil, fmt.Errorf("domain input failed: %w", err)
	}
	config.Domain = strings.TrimSpace(domain)

	// Collect API key
	apiKeyInput := pterm.DefaultInteractiveTextInput.WithMask("*").WithMultiLine(false)
	if current.APIKey != "" {
		apiKeyInput = apiKeyInput.WithDefaultValue(current.APIKey)
	}
	apiKey, err := apiKeyInput.Show("Generate a New API key at https://dashboard.ngrok.com/api-keys")
	if err != nil {
		return nil, fmt.Errorf("API key input failed: %w", err)
	}
	config.APIKey = strings.TrimSpace(apiKey)

	// Collect auth token
	authTokenInput := pterm.DefaultInteractiveTextInput.WithMask("*").WithMultiLine(false)
	if current.AuthToken != "" {
		authTokenInput = authTokenInput.WithDefaultValue(current.AuthToken)
	}
	authtoken, err := authTokenInput.Show("Add Tunnel Authtoken at https://dashboard.ngrok.com/authtokens")
	if err != nil {
		return nil, fmt.Errorf("auth token input failed: %w", err)
	}
	config.AuthToken = strings.TrimSpace(authtoken)

	return config, nil
}

// configureNgrokIPAllowlist configures IP allowlist settings
func (i *IngressConfigurator) configureNgrokIPAllowlist(config *types.NgrokConfig) error {
	options := []string{
		"Allow all IPs",
		"Restrict IPs (recommended)",
	}

	_, choice, err := sharedUI.SelectFromList("Configure IP allowlist", options)
	if err != nil {
		return fmt.Errorf("IP allowlist choice failed: %w", err)
	}

	if strings.Contains(choice, "Allow all") {
		config.UseAllowedIPs = false
		pterm.Info.Println("✓ Configured to allow all IPs")
		return nil
	}

	// Configure specific IPs
	config.UseAllowedIPs = true

	pterm.Info.Println("Enter allowed CIDR IP addresses (one per line):")

	var allowedIPs []string
	for i := 1; ; i++ {
		ip, err := pterm.DefaultInteractiveTextInput.
			WithMultiLine(false).
			Show(fmt.Sprintf("IP in CIDR #%d", i))
		if err != nil {
			return fmt.Errorf("IP input failed: %w", err)
		}

		ip = strings.TrimSpace(ip)
		if ip == "" {
			break
		}

		allowedIPs = append(allowedIPs, ip)
	}

	config.AllowedIPs = allowedIPs

	if len(allowedIPs) > 0 {
		pterm.Success.Printf("✓ Configured %d allowed IP(s)\n", len(allowedIPs))
	} else {
		pterm.Warning.Println("⚠ No IPs configured, defaulting to allow all")
		config.UseAllowedIPs = false
	}

	return nil
}

// applyLocalhostConfig applies localhost ingress configuration to helm values
func (i *IngressConfigurator) applyLocalhostConfig(values map[string]interface{}) error {
	// Ensure values map is not nil
	if values == nil {
		return fmt.Errorf("values map is nil")
	}

	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	oss, ok := deployment["oss"].(map[string]interface{})
	if !ok {
		oss = make(map[string]interface{})
		deployment["oss"] = oss
	}

	ingress, ok := oss["ingress"].(map[string]interface{})
	if !ok {
		ingress = make(map[string]interface{})
		oss["ingress"] = ingress
	}

	// Configure localhost ingress
	ingress["localhost"] = map[string]interface{}{
		"enabled": true,
	}

	// Disable ngrok and gcp if they exist
	if ngrokSection, ok := ingress["ngrok"].(map[string]interface{}); ok {
		ngrokSection["enabled"] = false
	}
	if gcpSection, ok := ingress["gcp"].(map[string]interface{}); ok {
		gcpSection["enabled"] = false
	}

	return nil
}

// applyNgrokConfig applies ngrok ingress configuration to helm values
func (i *IngressConfigurator) applyNgrokConfig(values map[string]interface{}, ngrokConfig *types.NgrokConfig) error {
	// Ensure values map is not nil
	if values == nil {
		return fmt.Errorf("values map is nil")
	}

	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	oss, ok := deployment["oss"].(map[string]interface{})
	if !ok {
		oss = make(map[string]interface{})
		deployment["oss"] = oss
	}

	ingress, ok := oss["ingress"].(map[string]interface{})
	if !ok {
		ingress = make(map[string]interface{})
		oss["ingress"] = ingress
	}

	// Configure ngrok ingress
	ngrokSection := map[string]interface{}{
		"enabled": true,
		"url":     ngrokConfig.Domain,
		"credentials": map[string]interface{}{
			"apiKey":    ngrokConfig.APIKey,
			"authtoken": ngrokConfig.AuthToken,
		},
	}

	// Add IP allowlist configuration if specified
	if ngrokConfig.UseAllowedIPs && len(ngrokConfig.AllowedIPs) > 0 {
		ngrokSection["allowedIPs"] = ngrokConfig.AllowedIPs
	}

	ingress["ngrok"] = ngrokSection

	// Disable localhost and gcp
	ingress["localhost"] = map[string]interface{}{
		"enabled": false,
	}
	if gcpSection, ok := ingress["gcp"].(map[string]interface{}); ok {
		gcpSection["enabled"] = false
	}

	return nil
}

// applyGCPConfig applies GCP ingress configuration to helm values
func (i *IngressConfigurator) applyGCPConfig(values map[string]interface{}) error {
	// Ensure values map is not nil
	if values == nil {
		return fmt.Errorf("values map is nil")
	}

	// Collect tenantID for GCP configuration
	tenantIDInput := pterm.DefaultInteractiveTextInput.WithMultiLine(false).WithDefaultValue("openframe-tenant")
	tenantID, err := tenantIDInput.Show("Enter domain prefix for GCP deployment")
	if err != nil {
		return fmt.Errorf("domain prefix input failed: %w", err)
	}
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		tenantID = "openframe-tenant"
	}

	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	saas, ok := deployment["saas"].(map[string]interface{})
	if !ok {
		saas = make(map[string]interface{})
		deployment["saas"] = saas
	}

	ingress, ok := saas["ingress"].(map[string]interface{})
	if !ok {
		ingress = make(map[string]interface{})
		saas["ingress"] = ingress
	}

	// Configure GCP ingress
	ingress["gcp"] = map[string]interface{}{
		"enabled":  true,
		"tenantID": tenantID,
	}

	// Disable localhost and ngrok
	ingress["localhost"] = map[string]interface{}{
		"enabled": false,
	}
	if ngrokSection, ok := ingress["ngrok"].(map[string]interface{}); ok {
		ngrokSection["enabled"] = false
	}

	pterm.Success.Printf("✓ Configured GCP ingress with domain prefix: %s\n", tenantID)

	return nil
}
