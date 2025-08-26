package intercept

import (
	"context"
	"fmt"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/dev/ui/prompts"
	"github.com/flamingo/openframe/internal/dev/ui/selectors"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// InterceptWizard provides a guided UI workflow for setting up Telepresence intercepts
type InterceptWizard struct {
	namespaceSelector *selectors.NamespaceSelector
	serviceSelector   *selectors.ServiceSelector
	interceptPrompter *prompts.InterceptPrompter
}

// InterceptConfig holds the complete intercept configuration
type InterceptConfig struct {
	ServiceName string
	ServiceInfo *selectors.ServiceInfo
	Flags       *models.InterceptFlags
}

// NewInterceptWizard creates a new intercept configuration wizard
func NewInterceptWizard(
	namespaceSelector *selectors.NamespaceSelector,
	serviceSelector *selectors.ServiceSelector,
) *InterceptWizard {
	return &InterceptWizard{
		namespaceSelector: namespaceSelector,
		serviceSelector:   serviceSelector,
		interceptPrompter: prompts.NewInterceptPrompter(),
	}
}

// RunInteractiveSetup provides a complete guided setup for intercept configuration
func (iw *InterceptWizard) RunInteractiveSetup(ctx context.Context) (*InterceptConfig, error) {
	pterm.DefaultHeader.WithFullWidth().
		WithBackgroundStyle(pterm.NewStyle(pterm.BgBlue)).
		WithTextStyle(pterm.NewStyle(pterm.FgWhite)).
		Println("Telepresence Intercept Setup")

	config := &InterceptConfig{
		Flags: &models.InterceptFlags{},
	}

	// Step 1: Select namespace
	pterm.DefaultSection.Println("Step 1: Select Namespace")
	namespace, err := iw.namespaceSelector.SelectNamespaceWithDefault(ctx, "default")
	if err != nil {
		return nil, fmt.Errorf("namespace selection failed: %w", err)
	}
	config.Flags.Namespace = namespace
	iw.namespaceSelector.ShowNamespaceInfo(namespace)
	fmt.Println()

	// Step 2: Select service
	pterm.DefaultSection.Println("Step 2: Select Service")
	serviceName, serviceInfo, err := iw.serviceSelector.SelectService(ctx, namespace, nil)
	if err != nil {
		return nil, fmt.Errorf("service selection failed: %w", err)
	}
	config.ServiceName = serviceName
	config.ServiceInfo = serviceInfo
	iw.serviceSelector.ShowServiceInfo(serviceInfo)
	fmt.Println()

	// Step 3: Configure local port
	pterm.DefaultSection.Println("Step 3: Configure Local Port")
	servicePort := int32(0)
	if len(serviceInfo.Ports) > 0 {
		servicePort = serviceInfo.Ports[0].Port
	}
	
	port, err := iw.interceptPrompter.PromptForPort(8080, servicePort)
	if err != nil {
		return nil, fmt.Errorf("port configuration failed: %w", err)
	}
	config.Flags.Port = port
	pterm.Success.Printf("Local port set to: %d\n", port)
	fmt.Println()

	// Step 4: Configure remote port name (if service has named ports)
	if len(serviceInfo.Ports) > 1 {
		pterm.DefaultSection.Println("Step 4: Configure Remote Port")
		var portNames []string
		for _, p := range serviceInfo.Ports {
			if p.Name != "" {
				portNames = append(portNames, p.Name)
			}
		}
		
		remotePortName, err := iw.interceptPrompter.PromptForRemotePortName(portNames)
		if err != nil {
			return nil, fmt.Errorf("remote port configuration failed: %w", err)
		}
		config.Flags.RemotePortName = remotePortName
		
		if remotePortName != "" {
			pterm.Success.Printf("Remote port name set to: %s\n", remotePortName)
		}
		fmt.Println()
	}

	// Step 5: Configure traffic filtering
	pterm.DefaultSection.Println("Step 5: Configure Traffic Filtering")
	global, err := iw.interceptPrompter.PromptForGlobalIntercept()
	if err != nil {
		return nil, fmt.Errorf("global intercept configuration failed: %w", err)
	}
	config.Flags.Global = global

	if !global {
		headers, err := iw.interceptPrompter.PromptForHeaders()
		if err != nil {
			return nil, fmt.Errorf("headers configuration failed: %w", err)
		}
		config.Flags.Header = headers
	}

	if global {
		pterm.Success.Println("Global intercept enabled - all traffic will be intercepted")
	} else if len(config.Flags.Header) > 0 {
		pterm.Success.Printf("Header-based intercept enabled with %d headers\n", len(config.Flags.Header))
	} else {
		pterm.Info.Println("No traffic filtering configured")
	}
	fmt.Println()

	// Step 6: Optional configuration
	pterm.DefaultSection.Println("Step 6: Optional Configuration")
	
	// Environment file
	envFile, err := iw.interceptPrompter.PromptForEnvFile()
	if err != nil {
		return nil, fmt.Errorf("env file configuration failed: %w", err)
	}
	config.Flags.EnvFile = envFile

	// Volume mount
	mount, err := iw.interceptPrompter.PromptForMount()
	if err != nil {
		return nil, fmt.Errorf("mount configuration failed: %w", err)
	}
	config.Flags.Mount = mount

	fmt.Println()

	// Step 7: Review and confirm
	pterm.DefaultSection.Println("Step 7: Review Configuration")
	iw.interceptPrompter.ShowInterceptConfiguration(serviceName, config.Flags)
	fmt.Println()

	confirmed, err := iw.interceptPrompter.ConfirmInterceptStart()
	if err != nil {
		return nil, fmt.Errorf("confirmation failed: %w", err)
	}

	if !confirmed {
		pterm.Info.Println("Intercept setup cancelled")
		return nil, nil
	}

	return config, nil
}

// RunPartialSetup provides a partial setup for cases where some configuration is already available
func (iw *InterceptWizard) RunPartialSetup(
	ctx context.Context, 
	serviceName string, 
	namespace string,
	existingFlags *models.InterceptFlags,
) (*InterceptConfig, error) {
	config := &InterceptConfig{
		ServiceName: serviceName,
		Flags:       existingFlags,
	}

	// If namespace not provided, select it
	if namespace == "" {
		selectedNamespace, err := iw.namespaceSelector.SelectNamespaceWithDefault(ctx, "default")
		if err != nil {
			return nil, fmt.Errorf("namespace selection failed: %w", err)
		}
		namespace = selectedNamespace
		config.Flags.Namespace = namespace
	}

	// Get service information
	serviceInfo, err := iw.serviceSelector.GetServiceInfo(ctx, namespace, serviceName)
	if err != nil {
		return nil, fmt.Errorf("failed to get service info: %w", err)
	}
	config.ServiceInfo = serviceInfo

	// Fill in any missing configuration interactively
	if config.Flags.Port == 0 {
		servicePort := int32(0)
		if len(serviceInfo.Ports) > 0 {
			servicePort = serviceInfo.Ports[0].Port
		}
		
		port, err := iw.interceptPrompter.PromptForPort(8080, servicePort)
		if err != nil {
			return nil, fmt.Errorf("port configuration failed: %w", err)
		}
		config.Flags.Port = port
	}

	return config, nil
}

// ValidateConfiguration validates an intercept configuration
func (iw *InterceptWizard) ValidateConfiguration(ctx context.Context, config *InterceptConfig) error {
	// Validate namespace
	if err := iw.namespaceSelector.ValidateNamespace(ctx, config.Flags.Namespace); err != nil {
		return fmt.Errorf("invalid namespace: %w", err)
	}

	// Validate service
	if err := iw.serviceSelector.ValidateService(ctx, config.Flags.Namespace, config.ServiceName); err != nil {
		return fmt.Errorf("invalid service: %w", err)
	}

	// Validate port
	if config.Flags.Port <= 0 || config.Flags.Port > 65535 {
		return fmt.Errorf("invalid port: %d (must be 1-65535)", config.Flags.Port)
	}

	// Validate headers format
	for _, header := range config.Flags.Header {
		if !isValidHeaderFormat(header) {
			return fmt.Errorf("invalid header format: %s (expected key=value)", header)
		}
	}

	return nil
}

// ShowInterceptStatus displays the current intercept status
func (iw *InterceptWizard) ShowInterceptStatus(serviceName string, namespace string, port int) {
	pterm.DefaultBox.
		WithTitle(" 🔀 Intercept Active ").
		WithTitleTopCenter().
		Println(fmt.Sprintf(
			"SERVICE:     %s\n"+
				"NAMESPACE:   %s\n"+
				"LOCAL PORT:  %d\n"+
				"STATUS:      Active",
			serviceName,
			namespace,
			port,
		))
}

// ShowInterceptHelp displays help information for intercept usage
func (iw *InterceptWizard) ShowInterceptHelp(serviceName string, namespace string, port int) {
	fmt.Println()
	pterm.Info.Printf("💡 Intercept Instructions:\n")
	pterm.Printf("  • Your local service should be running on port %d\n", port)
	pterm.Printf("  • Traffic to %s in namespace %s will be intercepted\n", serviceName, namespace)
	pterm.Printf("  • Press Ctrl+C to stop the intercept and cleanup\n")
	fmt.Println()
	pterm.Success.Println("Intercept running. Press Ctrl+C to stop...")
}

// ConfirmInterceptStop asks user to confirm stopping an intercept
func (iw *InterceptWizard) ConfirmInterceptStop(serviceName string) (bool, error) {
	return sharedUI.ConfirmAction(fmt.Sprintf("Stop intercept for service '%s'?", serviceName))
}

// isValidHeaderFormat validates header format (key=value)
func isValidHeaderFormat(header string) bool {
	return len(header) > 0 && 
		   len(header) < 1000 && 
		   containsEquals(header) && 
		   !hasEmptyKeyOrValue(header)
}

// containsEquals checks if string contains exactly one equals sign
func containsEquals(s string) bool {
	count := 0
	for _, c := range s {
		if c == '=' {
			count++
		}
	}
	return count == 1
}

// hasEmptyKeyOrValue checks if header has empty key or value
func hasEmptyKeyOrValue(header string) bool {
	parts := splitOnEquals(header)
	if len(parts) != 2 {
		return true
	}
	
	return len(parts[0]) == 0 || len(parts[1]) == 0
}

// splitOnEquals splits string on first equals sign
func splitOnEquals(s string) []string {
	for i, c := range s {
		if c == '=' {
			return []string{s[:i], s[i+1:]}
		}
	}
	return []string{s}
}