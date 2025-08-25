package configuration

import (
	"fmt"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/chart/utils/types"
	"github.com/flamingo/openframe/internal/chart/ui/templates"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/manifoldco/promptui"
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
	
	options := []string{
		"Use localhost for Local only visibility",
		"Use ngrok for External visibility",
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
	} else {
		ingressConfig.Type = types.IngressTypeNgrok
		
		// Configure Ngrok settings
		ngrokConfig, err := i.configureNgrok()
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
func (i *IngressConfigurator) configureNgrok() (*types.NgrokConfig, error) {
	pterm.Info.Println("Ngrok Configuration Setup")
	fmt.Println()
	
	// Step 1: Registration flow with 5-minute timeout
	if err := i.handleNgrokRegistration(); err != nil {
		return nil, err
	}
	
	// Step 2: Collect Ngrok credentials
	ngrokConfig, err := i.collectNgrokCredentials()
	if err != nil {
		return nil, err
	}
	
	// Step 3: Configure IP allowlist
	if err := i.configureNgrokIPAllowlist(ngrokConfig); err != nil {
		return nil, err
	}
	
	return ngrokConfig, nil
}

// handleNgrokRegistration manages the 5-minute registration timeout flow
func (i *IngressConfigurator) handleNgrokRegistration() error {
	pterm.Info.Println("First, you need to register for an Ngrok account.")
	fmt.Println()
	
	// Display registration URL
	pterm.Info.Printf("Please visit: %s\n", types.NgrokRegistrationURLs.SignUp)
	fmt.Println()
	pterm.Warning.Println("IMPORTANT: You have 5 minutes to complete registration.")
	pterm.Warning.Println("After registration, you'll need to:")
	fmt.Println("  1. Create a domain")
	fmt.Println("  2. Create an API key") 
	fmt.Println("  3. Get your auth token")
	fmt.Println()
	
	// Start 5-minute timer
	startTime := time.Now()
	timeout := 5 * time.Minute
	
	// Ask user to continue when ready
	prompt := promptui.Select{
		Label: "Have you completed Ngrok registration?",
		Items: []string{
			"Yes, I'm ready to continue",
			"Cancel setup",
		},
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
			Selected: "{{ . | green }}",
		},
	}
	
	// Check for timeout
	if time.Since(startTime) > timeout {
		pterm.Error.Println("⏰ Time is up! Registration timeout exceeded (5 minutes).")
		pterm.Error.Println("Operation cancelled. Please try again.")
		return fmt.Errorf("registration timeout exceeded")
	}
	
	idx, _, err := prompt.Run()
	if err != nil {
		return fmt.Errorf("registration prompt failed: %w", err)
	}
	
	if idx == 1 { // Cancel
		return fmt.Errorf("ngrok setup cancelled by user")
	}
	
	// Check timeout again after user response
	if time.Since(startTime) > timeout {
		pterm.Error.Println("⏰ Time is up! Registration timeout exceeded (5 minutes).")
		pterm.Error.Println("Operation cancelled. Please try again.")
		return fmt.Errorf("registration timeout exceeded")
	}
	
	pterm.Success.Println("✓ Registration completed within time limit")
	return nil
}

// collectNgrokCredentials collects all required Ngrok credentials
func (i *IngressConfigurator) collectNgrokCredentials() (*types.NgrokConfig, error) {
	pterm.Info.Println("Now let's collect your Ngrok credentials.")
	fmt.Println()
	
	config := &types.NgrokConfig{}
	
	// Collect domain
	pterm.Info.Printf("Create a domain at: %s\n", types.NgrokRegistrationURLs.DomainDocs)
	domain, err := pterm.DefaultInteractiveTextInput.
		WithMultiLine(false).
		Show("Enter your Ngrok domain:")
	if err != nil {
		return nil, fmt.Errorf("domain input failed: %w", err)
	}
	config.Domain = strings.TrimSpace(domain)
	
	// Collect API key
	fmt.Println()
	pterm.Info.Printf("Create an API key at: %s\n", types.NgrokRegistrationURLs.APIKeyDocs)
	apiKey, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("Enter your Ngrok API key:")
	if err != nil {
		return nil, fmt.Errorf("API key input failed: %w", err)
	}
	config.APIKey = strings.TrimSpace(apiKey)
	
	// Collect auth token
	fmt.Println()
	pterm.Info.Printf("Get your auth token at: %s\n", types.NgrokRegistrationURLs.AuthTokenDocs)
	authToken, err := pterm.DefaultInteractiveTextInput.
		WithMask("*").
		WithMultiLine(false).
		Show("Enter your Ngrok auth token:")
	if err != nil {
		return nil, fmt.Errorf("auth token input failed: %w", err)
	}
	config.AuthToken = strings.TrimSpace(authToken)
	
	return config, nil
}

// configureNgrokIPAllowlist configures IP allowlist settings
func (i *IngressConfigurator) configureNgrokIPAllowlist(config *types.NgrokConfig) error {
	fmt.Println()
	pterm.Info.Println("IP Allowlist Configuration")
	
	options := []string{
		"Allow all IPs (no restrictions)",
		"Set up allowed IPs list",
	}
	
	_, choice, err := sharedUI.SelectFromList("IP allowlist configuration", options)
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
	
	pterm.Info.Println("Enter allowed IP addresses (one per line, empty line to finish):")
	fmt.Println()
	
	var allowedIPs []string
	for i := 1; ; i++ {
		ip, err := pterm.DefaultInteractiveTextInput.
			WithMultiLine(false).
			Show(fmt.Sprintf("IP #%d (or press Enter to finish):", i))
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
	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	selfHosted, ok := deployment["selfHosted"].(map[string]interface{})
	if !ok {
		selfHosted = make(map[string]interface{})
		deployment["selfHosted"] = selfHosted
	}

	ingress, ok := selfHosted["ingress"].(map[string]interface{})
	if !ok {
		ingress = make(map[string]interface{})
		selfHosted["ingress"] = ingress
	}

	// Configure localhost ingress
	ingress["localhost"] = map[string]interface{}{
		"enabled": true,
	}

	// Disable ngrok if it exists
	if ngrokSection, ok := ingress["ngrok"].(map[string]interface{}); ok {
		ngrokSection["enabled"] = false
	}

	return nil
}

// applyNgrokConfig applies ngrok ingress configuration to helm values
func (i *IngressConfigurator) applyNgrokConfig(values map[string]interface{}, ngrokConfig *types.NgrokConfig) error {
	deployment, ok := values["deployment"].(map[string]interface{})
	if !ok {
		deployment = make(map[string]interface{})
		values["deployment"] = deployment
	}

	selfHosted, ok := deployment["selfHosted"].(map[string]interface{})
	if !ok {
		selfHosted = make(map[string]interface{})
		deployment["selfHosted"] = selfHosted
	}

	ingress, ok := selfHosted["ingress"].(map[string]interface{})
	if !ok {
		ingress = make(map[string]interface{})
		selfHosted["ingress"] = ingress
	}

	// Configure ngrok ingress
	ngrokSection := map[string]interface{}{
		"enabled":   true,
		"authToken": ngrokConfig.AuthToken,
		"apiKey":    ngrokConfig.APIKey,
		"url":       "https://" + ngrokConfig.Domain,
	}

	// Add IP allowlist configuration if specified
	if ngrokConfig.UseAllowedIPs && len(ngrokConfig.AllowedIPs) > 0 {
		ngrokSection["allowedIPs"] = ngrokConfig.AllowedIPs
	}

	ingress["ngrok"] = ngrokSection

	// Disable localhost if it exists
	if localhostSection, ok := ingress["localhost"].(map[string]interface{}); ok {
		localhostSection["enabled"] = false
	}

	return nil
}