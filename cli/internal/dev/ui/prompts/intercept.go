package prompts

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/flamingo/openframe/internal/dev/models"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// InterceptPrompter handles all user prompts for intercept configuration
type InterceptPrompter struct{}

// NewInterceptPrompter creates a new intercept prompter
func NewInterceptPrompter() *InterceptPrompter {
	return &InterceptPrompter{}
}

// PromptForPort asks user to configure the local port for intercept
func (ip *InterceptPrompter) PromptForPort(defaultPort int, servicePort int32) (int, error) {
	defaultPortStr := strconv.Itoa(defaultPort)
	if servicePort > 0 {
		defaultPortStr = strconv.Itoa(int(servicePort))
		pterm.Info.Printf("Service runs on port %d\n", servicePort)
	}

	portStr, err := sharedUI.GetInput(
		"Local port to forward traffic to",
		defaultPortStr,
		sharedUI.ValidateIntRange(1, 65535, "port"),
	)
	if err != nil {
		return 0, fmt.Errorf("port input failed: %w", err)
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return 0, fmt.Errorf("invalid port number: %w", err)
	}

	return port, nil
}

// PromptForRemotePortName asks user to specify remote port name (optional)
func (ip *InterceptPrompter) PromptForRemotePortName(availablePorts []string) (string, error) {
	if len(availablePorts) == 0 {
		return "", nil
	}

	if len(availablePorts) == 1 {
		use, err := sharedUI.ConfirmAction(fmt.Sprintf("Use port name '%s'?", availablePorts[0]))
		if err != nil {
			return "", err
		}
		if use {
			return availablePorts[0], nil
		}
		return "", nil
	}

	// Multiple port names available
	options := append([]string{"Use port number (default)"}, availablePorts...)
	
	selectedIndex, _, err := sharedUI.SelectFromList(
		"Select remote port",
		options,
	)
	if err != nil {
		return "", fmt.Errorf("port name selection failed: %w", err)
	}

	if selectedIndex == 0 {
		return "", nil // Use port number
	}

	return availablePorts[selectedIndex-1], nil
}

// PromptForEnvFile asks user to configure environment file (optional)
func (ip *InterceptPrompter) PromptForEnvFile() (string, error) {
	useEnvFile, err := sharedUI.ConfirmAction("Load environment variables from file?")
	if err != nil {
		return "", err
	}

	if !useEnvFile {
		return "", nil
	}

	// Suggest common env file locations
	commonFiles := []string{".env", ".env.local", ".env.development"}
	var existingFiles []string
	
	for _, file := range commonFiles {
		if _, err := os.Stat(file); err == nil {
			existingFiles = append(existingFiles, file)
		}
	}

	if len(existingFiles) > 0 {
		// Add option to browse for file
		options := append(existingFiles, "Browse for file...")
		
		selectedIndex, selected, err := sharedUI.SelectFromList(
			"Select environment file",
			options,
		)
		if err != nil {
			return "", fmt.Errorf("env file selection failed: %w", err)
		}

		if selectedIndex == len(options)-1 {
			// Browse for file
			return ip.promptForEnvFilePath()
		}

		return selected, nil
	}

	// No existing files found, ask for path
	return ip.promptForEnvFilePath()
}

// promptForEnvFilePath asks user to enter env file path
func (ip *InterceptPrompter) promptForEnvFilePath() (string, error) {
	envFile, err := sharedUI.GetInput(
		"Environment file path",
		".env",
		ip.validateEnvFile,
	)
	if err != nil {
		return "", fmt.Errorf("env file path input failed: %w", err)
	}

	return envFile, nil
}

// validateEnvFile validates that the env file exists and is readable
func (ip *InterceptPrompter) validateEnvFile(path string) error {
	if strings.TrimSpace(path) == "" {
		return fmt.Errorf("env file path cannot be empty")
	}

	// Expand home directory
	if strings.HasPrefix(path, "~") {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("cannot expand home directory: %w", err)
		}
		path = filepath.Join(home, path[1:])
	}

	// Check if file exists
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("env file not found: %w", err)
	}

	// Check if it's a regular file
	if !info.Mode().IsRegular() {
		return fmt.Errorf("env file must be a regular file")
	}

	// Check if it's readable
	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("env file is not readable: %w", err)
	}
	file.Close()

	return nil
}

// PromptForHeaders asks user to configure intercept headers (optional)
func (ip *InterceptPrompter) PromptForHeaders() ([]string, error) {
	useHeaders, err := sharedUI.ConfirmAction("Configure traffic filtering headers?")
	if err != nil {
		return nil, err
	}

	if !useHeaders {
		return nil, nil
	}

	var headers []string

	pterm.Info.Println("Add headers to filter intercepted traffic (format: key=value)")
	pterm.Info.Println("Common examples: user-id=123, version=dev, environment=test")

	for {
		header, err := sharedUI.GetInput(
			"Header (or press Enter to finish)",
			"",
			ip.validateHeader,
		)
		if err != nil {
			return nil, fmt.Errorf("header input failed: %w", err)
		}

		// Empty input means done
		if strings.TrimSpace(header) == "" {
			break
		}

		headers = append(headers, header)

		if len(headers) >= 10 {
			pterm.Warning.Println("Maximum 10 headers allowed")
			break
		}

		addMore, err := sharedUI.ConfirmAction("Add another header?")
		if err != nil {
			return nil, err
		}

		if !addMore {
			break
		}
	}

	return headers, nil
}

// validateHeader validates header format (key=value)
func (ip *InterceptPrompter) validateHeader(header string) error {
	header = strings.TrimSpace(header)
	
	// Empty is allowed (means done)
	if header == "" {
		return nil
	}

	if !strings.Contains(header, "=") {
		return fmt.Errorf("header must be in format 'key=value'")
	}

	parts := strings.SplitN(header, "=", 2)
	if len(parts) != 2 {
		return fmt.Errorf("header must be in format 'key=value'")
	}

	key := strings.TrimSpace(parts[0])
	value := strings.TrimSpace(parts[1])

	if key == "" {
		return fmt.Errorf("header key cannot be empty")
	}

	if value == "" {
		return fmt.Errorf("header value cannot be empty")
	}

	// Basic header key validation
	if strings.ContainsAny(key, " \t\n\r") {
		return fmt.Errorf("header key cannot contain whitespace")
	}

	return nil
}

// PromptForGlobalIntercept asks if user wants global traffic intercept
func (ip *InterceptPrompter) PromptForGlobalIntercept() (bool, error) {
	pterm.Info.Println("Global intercept captures ALL traffic to the service")
	pterm.Info.Println("Header-based intercept only captures traffic with matching headers")
	
	return sharedUI.ConfirmAction("Use global intercept (capture all traffic)?")
}

// PromptForReplaceExisting asks if user wants to replace existing intercept
func (ip *InterceptPrompter) PromptForReplaceExisting(serviceName string) (bool, error) {
	message := fmt.Sprintf("Replace existing intercept for service '%s'?", serviceName)
	return sharedUI.ConfirmAction(message)
}

// PromptForMount asks user to configure volume mounts (optional)
func (ip *InterceptPrompter) PromptForMount() (string, error) {
	useMount, err := sharedUI.ConfirmAction("Mount remote volumes to local path?")
	if err != nil {
		return "", err
	}

	if !useMount {
		return "", nil
	}

	// Suggest common mount paths
	home, _ := os.UserHomeDir()
	defaultMount := filepath.Join(home, "intercept-volumes")

	mount, err := sharedUI.GetInput(
		"Local mount path",
		defaultMount,
		ip.validateMountPath,
	)
	if err != nil {
		return "", fmt.Errorf("mount path input failed: %w", err)
	}

	return mount, nil
}

// validateMountPath validates the mount path
func (ip *InterceptPrompter) validateMountPath(path string) error {
	path = strings.TrimSpace(path)
	if path == "" {
		return fmt.Errorf("mount path cannot be empty")
	}

	// Expand home directory
	if strings.HasPrefix(path, "~") {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("cannot expand home directory: %w", err)
		}
		path = filepath.Join(home, path[1:])
	}

	// Check if parent directory exists
	parent := filepath.Dir(path)
	if _, err := os.Stat(parent); os.IsNotExist(err) {
		return fmt.Errorf("parent directory does not exist: %s", parent)
	}

	return nil
}

// ShowInterceptConfiguration displays the final configuration before starting
func (ip *InterceptPrompter) ShowInterceptConfiguration(serviceName string, flags *models.InterceptFlags) {
	pterm.DefaultBox.WithTitle("Intercept Configuration").WithTitleTopCenter().Println(
		fmt.Sprintf(
			"Service:     %s\n"+
				"Namespace:   %s\n"+
				"Local Port:  %d\n"+
				"Global:      %v\n"+
				"Headers:     %d configured\n"+
				"Env File:    %s\n"+
				"Mount:       %s",
			pterm.Cyan(serviceName),
			pterm.Blue(flags.Namespace),
			flags.Port,
			flags.Global,
			len(flags.Header),
			ip.formatOptional(flags.EnvFile),
			ip.formatOptional(flags.Mount),
		),
	)
}

// formatOptional formats optional fields for display
func (ip *InterceptPrompter) formatOptional(value string) string {
	if value == "" {
		return pterm.Gray("(none)")
	}
	return pterm.Green(value)
}

// ConfirmInterceptStart asks user to confirm starting the intercept
func (ip *InterceptPrompter) ConfirmInterceptStart() (bool, error) {
	return sharedUI.ConfirmAction("Start intercept with this configuration?")
}