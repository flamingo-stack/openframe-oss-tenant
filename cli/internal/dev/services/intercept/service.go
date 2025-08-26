package intercept

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/flamingo/openframe/internal/dev/models"
	"github.com/flamingo/openframe/internal/dev/prerequisites"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Service provides Telepresence intercept functionality
// Implements the bash functions from develop.sh with enhanced Go capabilities
type Service struct {
	executor          executor.CommandExecutor
	verbose           bool
	currentService    string
	currentNamespace  string
	originalNamespace string
	signalChannel     chan os.Signal
	isIntercepting    bool
}

// TelepresenceStatus represents the JSON output from telepresence status
type TelepresenceStatus struct {
	UserDaemon struct {
		Namespace string `json:"namespace"`
	} `json:"user_daemon"`
}

// NewService creates a new intercept service
func NewService(exec executor.CommandExecutor, verbose bool) *Service {
	return &Service{
		executor:      exec,
		verbose:       verbose,
		signalChannel: make(chan os.Signal, 1),
		isIntercepting: false,
	}
}

// StartIntercept starts a Telepresence intercept based on develop.sh intercept_app function
func (s *Service) StartIntercept(serviceName string, flags *models.InterceptFlags) error {
	// Input validation
	if err := s.validateInputs(serviceName, flags); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	ctx := context.Background()

	// Check prerequisites using centralized system
	if err := prerequisites.CheckTelepresenceAndJq(); err != nil {
		return fmt.Errorf("prerequisites check failed: %w", err)
	}

	// Set up cleanup handler
	s.setupCleanupHandler(serviceName)

	// Get current namespace from telepresence
	currentNamespace, err := s.getCurrentNamespace(ctx)
	if err != nil {
		return fmt.Errorf("failed to get current namespace: %w", err)
	}

	s.originalNamespace = currentNamespace
	s.currentService = serviceName
	s.currentNamespace = flags.Namespace

	if s.verbose {
		pterm.Info.Printf("Current namespace: %s\n", currentNamespace)
	}

	// Switch namespace if needed
	if currentNamespace != flags.Namespace {
		if err := s.switchNamespace(ctx, currentNamespace, flags.Namespace); err != nil {
			return err
		}
	} else {
		pterm.Success.Printf("Telepresence already connected to %s\n", flags.Namespace)
	}

	// Wait a moment for connection to stabilize
	time.Sleep(1 * time.Second)

	// Start the intercept
	if err := s.createIntercept(ctx, serviceName, flags); err != nil {
		return err
	}

	// Show success message and instructions
	s.showInterceptInstructions(serviceName, flags)

	// Mark as intercepting
	s.isIntercepting = true

	// Keep the intercept running until interrupted
	return s.waitForInterrupt()
}

// validateInputs validates the service name and flags
func (s *Service) validateInputs(serviceName string, flags *models.InterceptFlags) error {
	if strings.TrimSpace(serviceName) == "" {
		return errors.New("service name cannot be empty")
	}

	if flags == nil {
		return errors.New("flags cannot be nil")
	}

	if flags.Port <= 0 || flags.Port > 65535 {
		return fmt.Errorf("invalid port: %d (must be between 1-65535)", flags.Port)
	}

	if flags.Namespace == "" {
		flags.Namespace = "default"
	}

	// Validate env file exists if specified
	if flags.EnvFile != "" {
		if _, err := os.Stat(flags.EnvFile); os.IsNotExist(err) {
			return fmt.Errorf("environment file not found: %s", flags.EnvFile)
		}
	}

	// Validate header format
	for _, header := range flags.Header {
		if !strings.Contains(header, "=") {
			return fmt.Errorf("invalid header format: %s (expected key=value)", header)
		}
	}

	return nil
}

// showInterceptInstructions displays helpful information about the active intercept
func (s *Service) showInterceptInstructions(serviceName string, flags *models.InterceptFlags) {
	fmt.Println()
	
	boxContent := fmt.Sprintf(
		"SERVICE:     %s\n"+
		"NAMESPACE:   %s\n"+
		"LOCAL PORT:  %d\n"+
		"STATUS:      Active",
		serviceName,
		flags.Namespace,
		flags.Port,
	)

	pterm.DefaultBox.
		WithTitle(" 🔀 Intercept Active ").
		WithTitleTopCenter().
		Println(boxContent)

	fmt.Println()
	pterm.Info.Printf("💡 Intercept Instructions:\n")
	pterm.Printf("  • Your local service should be running on port %d\n", flags.Port)
	pterm.Printf("  • Traffic to %s in namespace %s will be intercepted\n", serviceName, flags.Namespace)
	pterm.Printf("  • Press Ctrl+C to stop the intercept and cleanup\n")
	fmt.Println()

	pterm.Success.Println("Intercept running. Press Ctrl+C to stop...")
}

// waitForInterrupt keeps the process alive until interrupted
func (s *Service) waitForInterrupt() error {
	// Sleep loop to keep script alive until Ctrl+C (like original)
	for {
		time.Sleep(1 * time.Second)
	}
}

// StopIntercept manually stops an intercept (alternative to Ctrl+C)
func (s *Service) StopIntercept(serviceName string) error {
	if !s.isIntercepting {
		return fmt.Errorf("no active intercept for service: %s", serviceName)
	}

	if s.currentService != serviceName {
		return fmt.Errorf("active intercept is for service %s, not %s", s.currentService, serviceName)
	}

	s.cleanup()
	return nil
}

// IsIntercepting returns whether an intercept is currently active
func (s *Service) IsIntercepting() bool {
	return s.isIntercepting
}

// GetCurrentService returns the name of the currently intercepted service
func (s *Service) GetCurrentService() string {
	return s.currentService
}

// GetCurrentNamespace returns the current namespace
func (s *Service) GetCurrentNamespace() string {
	return s.currentNamespace
}

// GetOriginalNamespace returns the original namespace before intercept
func (s *Service) GetOriginalNamespace() string {
	return s.originalNamespace
}