package config

import (
	"fmt"
	"strings"

	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// CredentialsPrompter handles prompting for credentials across different contexts
type CredentialsPrompter struct{}

// NewCredentialsPrompter creates a new credentials prompter
func NewCredentialsPrompter() *CredentialsPrompter {
	return &CredentialsPrompter{}
}

// GitHubCredentials represents GitHub authentication credentials
type GitHubCredentials struct {
	Username string
	Token    string
}

// PromptForGitHubCredentials prompts for GitHub username and token
func (cp *CredentialsPrompter) PromptForGitHubCredentials(repoURL string) (*GitHubCredentials, error) {
	pterm.Info.Printf("🔐 Private repository access required for: %s\n", repoURL)

	// Prompt for username
	username, err := sharedUI.GetInput("GitHub Username", "read-contents-pat", cp.validateNonEmpty("Username"))
	if err != nil {
		return nil, fmt.Errorf("failed to get username: %w", err)
	}

	// Prompt for token (masked input)
	token, err := sharedUI.GetInput("GitHub Personal Access Token", "", cp.validateNonEmpty("Token"))
	if err != nil {
		return nil, fmt.Errorf("failed to get token: %w", err)
	}

	credentials := &GitHubCredentials{
		Username: strings.TrimSpace(username),
		Token:    strings.TrimSpace(token),
	}

	if credentials.Username == "" || credentials.Token == "" {
		return nil, fmt.Errorf("username and token are required")
	}

	pterm.Success.Println("✅ Credentials provided")
	return credentials, nil
}

// DockerCredentials represents Docker registry credentials
type DockerCredentials struct {
	Registry string
	Username string
	Password string
}

// PromptForDockerCredentials prompts for Docker registry credentials
func (cp *CredentialsPrompter) PromptForDockerCredentials(registry string) (*DockerCredentials, error) {
	pterm.Info.Printf("🔐 Docker registry access required for: %s\n", registry)
	pterm.Info.Println("Please provide your Docker credentials:")

	// Prompt for username
	username, err := sharedUI.GetInput("Username", "", cp.validateNonEmpty("Username"))
	if err != nil {
		return nil, fmt.Errorf("failed to get username: %w", err)
	}

	// Prompt for password
	password, err := sharedUI.GetInput("Password", "", cp.validateNonEmpty("Password"))
	if err != nil {
		return nil, fmt.Errorf("failed to get password: %w", err)
	}

	credentials := &DockerCredentials{
		Registry: registry,
		Username: strings.TrimSpace(username),
		Password: strings.TrimSpace(password),
	}

	if credentials.Username == "" || credentials.Password == "" {
		return nil, fmt.Errorf("username and password are required")
	}

	pterm.Success.Println("✅ Credentials provided")
	return credentials, nil
}

// GenericCredentials represents generic username/password credentials
type GenericCredentials struct {
	Username string
	Password string
}

// PromptForGenericCredentials prompts for generic username/password credentials
func (cp *CredentialsPrompter) PromptForGenericCredentials(service string) (*GenericCredentials, error) {
	pterm.Info.Printf("🔐 Authentication required for: %s\n", service)
	pterm.Info.Println("Please provide your credentials:")

	// Prompt for username
	username, err := sharedUI.GetInput("Username", "", cp.validateNonEmpty("Username"))
	if err != nil {
		return nil, fmt.Errorf("failed to get username: %w", err)
	}

	// Prompt for password
	password, err := sharedUI.GetInput("Password", "", cp.validateNonEmpty("Password"))
	if err != nil {
		return nil, fmt.Errorf("failed to get password: %w", err)
	}

	credentials := &GenericCredentials{
		Username: strings.TrimSpace(username),
		Password: strings.TrimSpace(password),
	}

	if credentials.Username == "" || credentials.Password == "" {
		return nil, fmt.Errorf("username and password are required")
	}

	pterm.Success.Println("✅ Credentials provided")
	return credentials, nil
}

// APIKeyCredentials represents API key based credentials
type APIKeyCredentials struct {
	APIKey    string
	APISecret string
}

// PromptForAPIKeyCredentials prompts for API key and secret
func (cp *CredentialsPrompter) PromptForAPIKeyCredentials(service string) (*APIKeyCredentials, error) {
	pterm.Info.Printf("🔐 API credentials required for: %s\n", service)
	pterm.Info.Println("Please provide your API credentials:")

	// Prompt for API key
	apiKey, err := sharedUI.GetInput("API Key", "", cp.validateNonEmpty("API Key"))
	if err != nil {
		return nil, fmt.Errorf("failed to get API key: %w", err)
	}

	// Prompt for API secret
	apiSecret, err := sharedUI.GetInput("API Secret", "", cp.validateNonEmpty("API Secret"))
	if err != nil {
		return nil, fmt.Errorf("failed to get API secret: %w", err)
	}

	credentials := &APIKeyCredentials{
		APIKey:    strings.TrimSpace(apiKey),
		APISecret: strings.TrimSpace(apiSecret),
	}

	if credentials.APIKey == "" || credentials.APISecret == "" {
		return nil, fmt.Errorf("API key and secret are required")
	}

	pterm.Success.Println("✅ API credentials provided")
	return credentials, nil
}

// CredentialsOptions allows customization of credential prompting
type CredentialsOptions struct {
	AllowEmpty      bool
	HideInput       bool
	DefaultUsername string
	CustomMessage   string
}

// PromptWithOptions prompts for credentials with custom options
func (cp *CredentialsPrompter) PromptWithOptions(service string, opts CredentialsOptions) (*GenericCredentials, error) {
	message := opts.CustomMessage
	if message == "" {
		message = fmt.Sprintf("🔐 Authentication required for: %s", service)
	}
	pterm.Info.Println(message)

	validator := cp.validateNonEmpty("Username")
	if opts.AllowEmpty {
		validator = nil
	}

	// Prompt for username
	username, err := sharedUI.GetInput("Username", opts.DefaultUsername, validator)
	if err != nil {
		return nil, fmt.Errorf("failed to get username: %w", err)
	}

	// Prompt for password
	passwordValidator := cp.validateNonEmpty("Password")
	if opts.AllowEmpty {
		passwordValidator = nil
	}

	password, err := sharedUI.GetInput("Password", "", passwordValidator)
	if err != nil {
		return nil, fmt.Errorf("failed to get password: %w", err)
	}

	credentials := &GenericCredentials{
		Username: strings.TrimSpace(username),
		Password: strings.TrimSpace(password),
	}

	if !opts.AllowEmpty && (credentials.Username == "" || credentials.Password == "") {
		return nil, fmt.Errorf("username and password are required")
	}

	pterm.Success.Println("✅ Credentials provided")
	return credentials, nil
}

// validateNonEmpty returns a validator function for non-empty fields
func (cp *CredentialsPrompter) validateNonEmpty(fieldName string) func(string) error {
	return func(input string) error {
		if strings.TrimSpace(input) == "" {
			return fmt.Errorf("%s cannot be empty", fieldName)
		}
		return nil
	}
}

// IsCredentialsRequired determines if credentials are needed based on the configuration
func (cp *CredentialsPrompter) IsCredentialsRequired(username, password string) bool {
	return strings.TrimSpace(username) == "" || strings.TrimSpace(password) == ""
}

// ValidateCredentials validates that credentials meet minimum requirements
func (cp *CredentialsPrompter) ValidateCredentials(username, password string) error {
	username = strings.TrimSpace(username)
	password = strings.TrimSpace(password)

	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}

	if password == "" {
		return fmt.Errorf("password cannot be empty")
	}

	// Additional validation can be added here
	if len(username) < 2 {
		return fmt.Errorf("username must be at least 2 characters long")
	}

	if len(password) < 4 {
		return fmt.Errorf("password must be at least 4 characters long")
	}

	return nil
}
