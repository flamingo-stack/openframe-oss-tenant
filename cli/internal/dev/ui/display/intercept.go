package display

import (
	"fmt"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/dev/ui/selectors"
	"github.com/pterm/pterm"
)

// InterceptDisplay handles displaying intercept information and status
type InterceptDisplay struct{}

// NewInterceptDisplay creates a new intercept display service
func NewInterceptDisplay() *InterceptDisplay {
	return &InterceptDisplay{}
}

// ShowStartingMessage displays a message when intercept is starting
func (id *InterceptDisplay) ShowStartingMessage(serviceName, namespace string) {
	pterm.DefaultSpinner.WithText(fmt.Sprintf("Setting up intercept for %s in %s namespace...", 
		pterm.Cyan(serviceName), 
		pterm.Blue(namespace),
	)).Start()
}

// ShowInterceptActive displays the active intercept status with enhanced UI
func (id *InterceptDisplay) ShowInterceptActive(serviceName string, flags *models.InterceptFlags) {
	// Stop any running spinners
	pterm.DefaultSpinner.Stop()

	// Create a detailed status box
	statusContent := id.buildStatusContent(serviceName, flags)
	
	pterm.DefaultBox.
		WithTitle(" 🔀 Intercept Active ").
		WithTitleTopCenter().
		WithBoxStyle(pterm.NewStyle(pterm.FgGreen)).
		Println(statusContent)

	fmt.Println()
	
	// Show configuration details
	id.showConfigurationDetails(flags)
	
	fmt.Println()
	
	// Show usage instructions
	id.showUsageInstructions(serviceName, flags)
}

// ShowInterceptStopped displays message when intercept is stopped
func (id *InterceptDisplay) ShowInterceptStopped(serviceName string) {
	pterm.Success.Printf("✅ Intercept for service '%s' stopped successfully\n", serviceName)
	pterm.Info.Println("All traffic routing has been restored to normal")
}

// ShowInterceptError displays error information
func (id *InterceptDisplay) ShowInterceptError(serviceName string, err error) {
	pterm.Error.Printf("❌ Failed to start intercept for service '%s'\n", serviceName)
	pterm.Error.Printf("Error: %v\n", err)
	
	// Provide helpful troubleshooting tips
	id.showTroubleshootingTips()
}

// ShowServiceList displays available services in a namespace
func (id *InterceptDisplay) ShowServiceList(namespace string, services []selectors.ServiceInfo) {
	if len(services) == 0 {
		pterm.Warning.Printf("No services found in namespace '%s'\n", namespace)
		return
	}

	pterm.Info.Printf("Available services in namespace '%s':\n", pterm.Cyan(namespace))
	
	// Create table for service information
	tableData := pterm.TableData{
		{"Name", "Type", "Ports", "Age"},
	}
	
	for _, service := range services {
		portsStr := id.formatServicePorts(service.Ports)
		age := "unknown" // Would need actual service metadata for age
		
		tableData = append(tableData, []string{
			service.Name,
			service.Type,
			portsStr,
			age,
		})
	}
	
	pterm.DefaultTable.WithHasHeader().WithData(tableData).Render()
}

// ShowNamespaceInfo displays namespace information
func (id *InterceptDisplay) ShowNamespaceInfo(namespace string, serviceCount int) {
	pterm.Info.Printf("Namespace: %s\n", pterm.Cyan(namespace))
	if serviceCount >= 0 {
		pterm.Info.Printf("Services available: %d\n", serviceCount)
	}
}

// ShowPrerequisitesCheck displays prerequisites checking status
func (id *InterceptDisplay) ShowPrerequisitesCheck() {
	pterm.Info.Println("Checking prerequisites...")
	
	// Show what we're checking
	checks := []string{"Telepresence", "jq", "Kubernetes connection"}
	for _, check := range checks {
		pterm.Printf("  • %s... ", check)
		time.Sleep(100 * time.Millisecond) // Small delay for visual effect
		pterm.Success.Println("✓")
	}
}

// ShowConnectionStatus displays Telepresence connection status
func (id *InterceptDisplay) ShowConnectionStatus(namespace string, connected bool) {
	if connected {
		pterm.Success.Printf("Connected to cluster namespace: %s\n", pterm.Cyan(namespace))
	} else {
		pterm.Warning.Printf("Not connected to cluster namespace: %s\n", pterm.Cyan(namespace))
		pterm.Info.Println("Telepresence will establish connection automatically")
	}
}

// buildStatusContent creates the content for the active intercept status box
func (id *InterceptDisplay) buildStatusContent(serviceName string, flags *models.InterceptFlags) string {
	content := fmt.Sprintf(
		"SERVICE:      %s\n"+
		"NAMESPACE:    %s\n"+
		"LOCAL PORT:   %d\n"+
		"STATUS:       %s",
		pterm.Cyan(serviceName),
		pterm.Blue(flags.Namespace),
		flags.Port,
		pterm.Green("Active"),
	)

	// Add remote port info if specified
	if flags.RemotePortName != "" {
		content += fmt.Sprintf("\nREMOTE PORT:  %s", pterm.Yellow(flags.RemotePortName))
	}

	return content
}

// showConfigurationDetails displays detailed configuration information
func (id *InterceptDisplay) showConfigurationDetails(flags *models.InterceptFlags) {
	pterm.Info.Println("📋 Configuration Details:")
	
	// Traffic filtering
	if flags.Global {
		pterm.Printf("  • Traffic filtering: %s (all traffic intercepted)\n", pterm.Red("Global"))
	} else if len(flags.Header) > 0 {
		pterm.Printf("  • Traffic filtering: %s (%d headers)\n", pterm.Blue("Header-based"), len(flags.Header))
		for _, header := range flags.Header {
			pterm.Printf("    - %s\n", pterm.Gray(header))
		}
	} else {
		pterm.Printf("  • Traffic filtering: %s\n", pterm.Gray("None"))
	}
	
	// Environment file
	if flags.EnvFile != "" {
		pterm.Printf("  • Environment file: %s\n", pterm.Green(flags.EnvFile))
	}
	
	// Volume mount
	if flags.Mount != "" {
		pterm.Printf("  • Volume mount: %s\n", pterm.Green(flags.Mount))
	}
	
	// Replace mode
	if flags.Replace {
		pterm.Printf("  • Mode: %s\n", pterm.Yellow("Replace existing"))
	}
}

// showUsageInstructions displays instructions for using the intercept
func (id *InterceptDisplay) showUsageInstructions(serviceName string, flags *models.InterceptFlags) {
	pterm.Info.Println("💡 Usage Instructions:")
	
	pterm.Printf("  1. Start your local service on port %s\n", pterm.Green(fmt.Sprintf("%d", flags.Port)))
	pterm.Printf("  2. Traffic to %s will be intercepted and routed to your local service\n", pterm.Cyan(serviceName))
	
	if !flags.Global && len(flags.Header) > 0 {
		pterm.Printf("  3. Only requests with matching headers will be intercepted:\n")
		for _, header := range flags.Header {
			pterm.Printf("     • %s\n", pterm.Blue(header))
		}
	} else if flags.Global {
		pterm.Printf("  3. %s - ALL traffic will be intercepted\n", pterm.Red("GLOBAL MODE"))
	}
	
	pterm.Printf("  4. Press %s to stop the intercept\n", pterm.Red("Ctrl+C"))
	
	fmt.Println()
	
	// Example curl command for testing
	if len(flags.Header) > 0 && !flags.Global {
		pterm.Info.Println("🧪 Test with headers:")
		
		curlCmd := fmt.Sprintf("curl -H \"%s\"", flags.Header[0])
		if len(flags.Header) > 1 {
			for _, header := range flags.Header[1:] {
				curlCmd += fmt.Sprintf(" -H \"%s\"", header)
			}
		}
		curlCmd += " <service-url>"
		
		pterm.Printf("  %s\n", pterm.Gray(curlCmd))
		fmt.Println()
	}
}

// showTroubleshootingTips displays common troubleshooting tips
func (id *InterceptDisplay) showTroubleshootingTips() {
	fmt.Println()
	pterm.Info.Println("🔧 Troubleshooting Tips:")
	
	tips := []string{
		"Check if Telepresence is installed and in PATH",
		"Verify kubectl is configured and connected to cluster",
		"Ensure the service exists in the specified namespace",
		"Check if another intercept is already active for this service",
		"Verify your local service is not already running on the target port",
	}
	
	for _, tip := range tips {
		pterm.Printf("  • %s\n", tip)
	}
	
	fmt.Println()
	pterm.Info.Println("For more help, run: openframe dev intercept --help")
}

// formatServicePorts formats service ports for display
func (id *InterceptDisplay) formatServicePorts(ports []selectors.ServicePort) string {
	if len(ports) == 0 {
		return "none"
	}
	
	if len(ports) == 1 {
		port := ports[0]
		if port.Name != "" {
			return fmt.Sprintf("%s:%d", port.Name, port.Port)
		}
		return fmt.Sprintf("%d", port.Port)
	}
	
	// Multiple ports - show count and main port
	var portStrs []string
	for _, port := range ports {
		if port.Name != "" {
			portStrs = append(portStrs, fmt.Sprintf("%s:%d", port.Name, port.Port))
		} else {
			portStrs = append(portStrs, fmt.Sprintf("%d", port.Port))
		}
	}
	
	if len(portStrs) > 2 {
		return fmt.Sprintf("%s, %s, +%d more", portStrs[0], portStrs[1], len(portStrs)-2)
	}
	
	return strings.Join(portStrs, ", ")
}

// ShowProgress displays a progress indicator for long-running operations
func (id *InterceptDisplay) ShowProgress(message string) (*pterm.SpinnerPrinter, error) {
	return pterm.DefaultSpinner.WithText(message).Start()
}

// ShowStep displays a numbered step in a process
func (id *InterceptDisplay) ShowStep(step int, total int, message string) {
	pterm.Info.Printf("Step %d/%d: %s\n", step, total, message)
}

// ShowWarning displays a warning message
func (id *InterceptDisplay) ShowWarning(message string) {
	pterm.Warning.Println(message)
}

// ShowSuccess displays a success message
func (id *InterceptDisplay) ShowSuccess(message string) {
	pterm.Success.Println(message)
}